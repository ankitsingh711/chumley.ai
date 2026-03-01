import { UserRole, RequestStatus, User, NotificationType } from '@prisma/client';
import Logger from '../utils/logger';
import emailService from './email.service';
import prisma from '../config/db';
import notificationService from './notification.service';
import { sendNotification } from '../utils/websocket';
import { getFrontendUrl } from '../config/runtime';

const APPROVED_SUPPLIER_STATUSES = new Set(['STANDARD', 'PREFERRED', 'ACTIVE']);

const isSupplierApprovedForRequest = (supplierStatus?: string | null): boolean => {
    if (!supplierStatus) return false;
    return APPROVED_SUPPLIER_STATUSES.has(supplierStatus.trim().toUpperCase());
};

export class ApprovalService {
    /**
     * Get the next approver based on requester's role and department hierarchy
     */
    async getNextApprover(requesterId: string, departmentId: string): Promise<User | null> {
        const requester = await prisma.user.findUnique({
            where: { id: requesterId },
            include: {
                manager: true,
                department: true
            }
        });

        if (!requester) {
            throw new Error('Requester not found');
        }

        // If requester is a MEMBER, route to their direct manager
        if (requester.role === UserRole.MEMBER && requester.managerId) {
            return requester.manager;
        }

        // If requester is a MANAGER, route to Senior Manager or System Admin
        if (requester.role === UserRole.MANAGER) {
            // Find Senior Manager in the same department
            const seniorManager = await prisma.user.findFirst({
                where: {
                    departmentId: departmentId,
                    role: UserRole.SENIOR_MANAGER
                }
            });

            if (seniorManager) {
                return seniorManager;
            }

            // If no Senior Manager, find System Admin
            const systemAdmin = await prisma.user.findFirst({
                where: { role: UserRole.SYSTEM_ADMIN }
            });

            return systemAdmin;
        }

        // If requester is Senior Manager, they can approve their own requests
        // or route to System Admin for very high-value items (future enhancement)
        if (requester.role === UserRole.SENIOR_MANAGER) {
            return null; // Auto-approve or needs System Admin review
        }

        return null;
    }

    /**
     * Check if a user can approve a specific request
     */
    async canApprove(userId: string, requestId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { additionalRoles: true }
        });

        const request = await prisma.purchaseRequest.findUnique({
            where: { id: requestId },
            include: {
                requester: {
                    include: { department: true }
                }
            }
        });

        if (!user || !request) {
            return false;
        }

        // System Admin can approve anything
        if (user.role === UserRole.SYSTEM_ADMIN) {
            return true;
        }

        // Senior Manager can approve requests in their department
        if (user.role === UserRole.SENIOR_MANAGER) {
            // Check primary department
            if (user.departmentId === request.requester.departmentId) {
                return true;
            }

            // Check additional department roles
            const hasRoleInDept = user.additionalRoles.some(
                role => role.departmentId === request.requester.departmentId &&
                    (role.role === UserRole.SENIOR_MANAGER || role.role === UserRole.MANAGER)
            );

            if (hasRoleInDept) {
                return true;
            }
        }

        // Manager can approve if they are the requester's direct manager
        if (user.role === UserRole.MANAGER) {
            const requester = await prisma.user.findUnique({
                where: { id: request.requesterId }
            });

            if (requester && requester.managerId === userId) {
                return true;
            }
        }

        return false;
    }

    /**
     * Process approval or rejection of a request
     */
    async processApproval(
        requestId: string,
        approverId: string,
        action: 'APPROVE' | 'REJECT',
        comments?: string
    ): Promise<void> {
        const canApprove = await this.canApprove(approverId, requestId);

        if (!canApprove) {
            throw new Error('User does not have permission to approve this request');
        }

        const request = await prisma.purchaseRequest.findUnique({
            where: { id: requestId },
            include: {
                requester: true,
                supplier: {
                    select: {
                        id: true,
                        status: true,
                    }
                }
            }
        });

        if (!request) {
            throw new Error('Request not found');
        }

        if (request.status !== RequestStatus.PENDING) {
            throw new Error('Request is not in pending status');
        }

        // Create approval history record
        await prisma.approvalHistory.create({
            data: {
                requestId,
                approverId,
                action,
                comments
            }
        });

        // Update request status
        if (action === 'APPROVE') {
            if (request.supplierId && !isSupplierApprovedForRequest(request.supplier?.status)) {
                throw new Error(`Cannot approve request until supplier is approved. Current supplier status: ${request.supplier?.status || 'Unknown'}`);
            }

            await prisma.purchaseRequest.update({
                where: { id: requestId },
                data: {
                    status: RequestStatus.APPROVED,
                    approverId,
                    updatedAt: new Date()
                }
            });

            Logger.info(`Request ${requestId} approved by ${approverId}`);
        } else {
            await prisma.purchaseRequest.update({
                where: { id: requestId },
                data: {
                    status: RequestStatus.REJECTED,
                    approverId,
                    updatedAt: new Date()
                }
            });

            Logger.info(`Request ${requestId} rejected by ${approverId}`);
        }
    }

    /**
     * Auto-route request to appropriate approver when submitted
     */
    async routeRequest(requestId: string): Promise<void> {
        const request = await prisma.purchaseRequest.findUnique({
            where: { id: requestId },
            include: {
                requester: {
                    include: { department: true }
                },
                supplier: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        contactEmail: true,
                    }
                },
                items: {
                    select: {
                        description: true,
                        quantity: true,
                        unitPrice: true,
                    }
                },
            }
        });

        if (!request) {
            throw new Error('Request not found');
        }

        const nextApprover = await this.getNextApprover(
            request.requesterId,
            request.requester.departmentId || ''
        );

        if (nextApprover) {
            await prisma.purchaseRequest.update({
                where: { id: requestId },
                data: {
                    currentApproverId: nextApprover.id,
                    status: RequestStatus.PENDING
                }
            });

            Logger.info(`Request ${requestId} routed to ${nextApprover.name} (${nextApprover.email})`);

            // Send email to approver (non-blocking, fire-and-forget)
            emailService.sendApprovalRequestEmail({
                approverEmail: nextApprover.email,
                approverName: nextApprover.name,
                requesterName: request.requester.name,
                requestId: request.id,
                totalAmount: Number(request.totalAmount),
                manageUrl: `${getFrontendUrl()}/requests/${request.id}`
            }).catch((err) => {
                Logger.error(`Failed to send approval email for request ${requestId}:`, err);
            });

            // Send in-app notifications to relevant users
            await this.notifyRelevantUsers(request, request.requester, {
                skipEmailUserIds: [nextApprover.id]
            });

        } else {
            if (request.supplierId && !isSupplierApprovedForRequest(request.supplier?.status)) {
                // Keep request pending until supplier reaches an approved status.
                await prisma.purchaseRequest.update({
                    where: { id: requestId },
                    data: {
                        status: RequestStatus.PENDING,
                        updatedAt: new Date()
                    }
                });

                Logger.info(
                    `Request ${requestId} not auto-approved because supplier status is ${request.supplier?.status || 'Unknown'}`
                );

                await this.notifyRelevantUsers(request, request.requester);
                return;
            }

            // Auto-approve if no approver needed (e.g., Senior Manager's own request)
            await prisma.purchaseRequest.update({
                where: { id: requestId },
                data: {
                    status: RequestStatus.APPROVED,
                    updatedAt: new Date()
                }
            });

            Logger.info(`Request ${requestId} auto-approved (no approver needed)`);

            if (request.supplier && request.supplier.contactEmail) {
                emailService.sendPurchaseRequestNotification({
                    supplierEmail: request.supplier.contactEmail,
                    supplierName: request.supplier.name,
                    requesterName: request.requester.name || 'Unknown',
                    requesterEmail: request.requester.email || '',
                    requestId: request.id,
                    items: request.items.map((item) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: Number(item.unitPrice),
                    })),
                    totalAmount: Number(request.totalAmount),
                    createdAt: request.createdAt,
                    reason: request.reason || undefined,
                }).catch((err) => {
                    Logger.error(`Failed to send approval email to supplier for auto-approved request ${requestId}:`, err);
                });
            } else if (request.supplierId) {
                Logger.warn(`Auto-approved request ${requestId} has no supplier email. SupplierId: ${request.supplierId}`);
            }

            await this.notifyRelevantUsers(request, request.requester);
        }
    }

    /**
     * Notify managers, senior managers, and admins about a new purchase request
     */
    private async notifyRelevantUsers(
        request: any,
        requester: any,
        options?: {
            skipEmailUserIds?: string[];
        }
    ): Promise<void> {
        try {
            const requesterDeptId = requester.departmentId;
            const requestShortId = request.id.slice(0, 8);
            const totalFormatted = `£${Number(request.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
            const title = 'New Purchase Request';
            const message = `${requester.name} submitted a purchase request #${requestShortId} for ${totalFormatted}`;
            const manageUrl = `${getFrontendUrl()}/requests/${request.id}`;
            const skipEmailUserIds = new Set(options?.skipEmailUserIds || []);

            // Find all users who should be notified:
            // 1. Managers and Senior Managers in the requester's department
            // 2. All System Admins
            const usersToNotify = await prisma.user.findMany({
                where: {
                    id: { not: requester.id }, // Don't notify the requester themselves
                    OR: [
                        // Managers / Senior Managers in same department
                        {
                            departmentId: requesterDeptId,
                            role: { in: [UserRole.MANAGER, UserRole.SENIOR_MANAGER] }
                        },
                        // All System Admins
                        {
                            role: UserRole.SYSTEM_ADMIN
                        }
                    ]
                },
                select: { id: true, name: true, email: true }
            });

            // Also check users with additional roles in this department
            const additionalRoleUsers = await prisma.userDepartmentRole.findMany({
                where: {
                    departmentId: requesterDeptId,
                    role: { in: [UserRole.MANAGER, UserRole.SENIOR_MANAGER] },
                    userId: { not: requester.id }
                },
                select: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });

            // Combine and deduplicate recipients
            const recipients = new Map<string, { id: string; name: string; email: string }>();
            usersToNotify.forEach((user) => {
                recipients.set(user.id, user);
            });
            additionalRoleUsers.forEach((additionalRoleUser) => {
                recipients.set(additionalRoleUser.user.id, additionalRoleUser.user);
            });

            // Send notifications to each user
            for (const recipient of recipients.values()) {
                // Persist notification in DB
                try {
                    await notificationService.createNotification({
                        userId: recipient.id,
                        type: NotificationType.SYSTEM_ALERT,
                        title,
                        message,
                        metadata: { requestId: request.id, requesterId: requester.id, totalAmount: Number(request.totalAmount) }
                    });
                } catch (dbErr) {
                    Logger.error(`Failed to create DB notification for user ${recipient.id}:`, dbErr);
                }

                // Send real-time websocket notification
                sendNotification(recipient.id, {
                    id: `notif-${Date.now()}-${Math.random()}`,
                    type: 'request_created',
                    title,
                    message,
                    userId: recipient.id,
                    createdAt: new Date(),
                    read: false,
                    metadata: { requestId: request.id, requesterId: requester.id }
                });

                if (!skipEmailUserIds.has(recipient.id)) {
                    emailService.sendNewRequestRaisedEmail({
                        recipientEmail: recipient.email,
                        recipientName: recipient.name,
                        requesterName: requester.name,
                        requestId: request.id,
                        totalAmount: Number(request.totalAmount),
                        manageUrl,
                    }).catch((err) => {
                        Logger.error(`Failed to send new request email to ${recipient.email} for request ${request.id}:`, err);
                    });
                }
            }

            Logger.info(`Sent new request notifications to ${recipients.size} users for request ${request.id}`);
        } catch (error) {
            Logger.error(`Failed to send request creation notifications:`, error);
            // Non-blocking: don't throw, just log
        }
    }
}

export default new ApprovalService();

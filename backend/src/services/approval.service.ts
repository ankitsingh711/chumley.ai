import { PrismaClient, UserRole, RequestStatus, User } from '@prisma/client';
import Logger from '../utils/logger';

const prisma = new PrismaClient();

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
            include: { requester: true }
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
                }
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
        } else {
            // Auto-approve if no approver needed (e.g., Senior Manager's own request)
            await prisma.purchaseRequest.update({
                where: { id: requestId },
                data: {
                    status: RequestStatus.APPROVED
                }
            });

            Logger.info(`Request ${requestId} auto-approved (no approver needed)`);
        }
    }
}

export default new ApprovalService();

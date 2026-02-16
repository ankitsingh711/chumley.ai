import { NotificationType, UserRole } from '@prisma/client';
import notificationService from './notification.service';
import Logger from '../utils/logger';
import prisma from '../config/db';


const THRESHOLDS = {
    WARNING: 0.8,   // 80%
    CRITICAL: 0.9,  // 90%
    EXCEEDED: 1.0   // 100%
};

class BudgetMonitorService {
    /**
     * Check if a department has crossed any budget thresholds
     */
    async checkDepartmentThreshold(departmentId: string, departmentName: string) {
        try {
            // Get department budget
            const department = await prisma.department.findUnique({
                where: { id: departmentId },
            });

            if (!department || Number(department.budget) === 0) {
                return; // No budget set, skip monitoring
            }

            const budget = Number(department.budget);

            // Calculate department spending
            const spending = await this.getDepartmentSpending(departmentId, departmentName);

            const percentage = spending / budget;

            // Determine threshold crossed
            const thresholdType = this.getThresholdType(percentage);

            if (thresholdType) {
                // Check if we've already sent this threshold notification
                const existingNotification = await this.getExistingThresholdNotification(
                    departmentId,
                    thresholdType
                );

                if (!existingNotification) {
                    await this.generateBudgetNotifications(
                        department,
                        spending,
                        budget,
                        percentage,
                        thresholdType
                    );
                }
            }
        } catch (error) {
            Logger.error(`Failed to check budget threshold for department ${departmentId}:`, error);
        }
    }

    /**
     * Get department spending from purchase orders
     */
    private async getDepartmentSpending(departmentId: string, departmentName: string): Promise<number> {
        // Get all orders where the requester's department matches
        const orders = await prisma.purchaseOrder.findMany({
            where: {
                status: { not: 'CANCELLED' },
                request: {
                    requester: {
                        departmentId: departmentId,
                    },
                },
            },
            select: {
                totalAmount: true,
            },
        });

        // Also check orders by department name in budgetCategory
        const ordersByCategory = await prisma.purchaseOrder.findMany({
            where: {
                status: { not: 'CANCELLED' },
                request: {
                    budgetCategory: departmentName,
                },
            },
            select: {
                totalAmount: true,
            },
        });

        const totalFromDept = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
        const totalFromCategory = ordersByCategory.reduce((sum, order) => sum + Number(order.totalAmount), 0);

        // Use the maximum to avoid double-counting
        return Math.max(totalFromDept, totalFromCategory);
    }

    /**
     * Determine which threshold type applies
     */
    private getThresholdType(percentage: number): NotificationType | null {
        if (percentage >= THRESHOLDS.EXCEEDED) return NotificationType.BUDGET_EXCEEDED;
        if (percentage >= THRESHOLDS.CRITICAL) return NotificationType.BUDGET_CRITICAL;
        if (percentage >= THRESHOLDS.WARNING) return NotificationType.BUDGET_WARNING;
        return null;
    }

    /**
     * Check if notification for this threshold already exists
     */
    private async getExistingThresholdNotification(
        departmentId: string,
        thresholdType: NotificationType
    ): Promise<boolean> {
        // Check if any notification of this type was sent in the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Get all recent notifications of this type
        const existing = await prisma.notification.findMany({
            where: {
                type: thresholdType,
                createdAt: { gte: oneDayAgo },
            },
        });

        // Filter by department ID in metadata
        const matchingNotifications = existing.filter((notif) => {
            const metadata = notif.metadata as any;
            return metadata?.departmentId === departmentId;
        });

        return matchingNotifications.length > 0;
    }

    /**
     * Generate budget notifications for appropriate users
     */
    private async generateBudgetNotifications(
        department: any,
        spending: number,
        budget: number,
        percentage: number,
        thresholdType: NotificationType
    ) {
        const percentageFormatted = Math.round(percentage * 100);
        const spendingFormatted = spending.toLocaleString();
        const budgetFormatted = budget.toLocaleString();

        // Create notification message based on threshold
        let title: string;
        let message: string;

        switch (thresholdType) {
            case NotificationType.BUDGET_WARNING:
                title = 'Budget Warning';
                message = `${department.name} department has spent £${spendingFormatted} of £${budgetFormatted} (${percentageFormatted}%) annual budget.`;
                break;
            case NotificationType.BUDGET_CRITICAL:
                title = 'Budget Critical';
                message = `${department.name} department has spent £${spendingFormatted} of £${budgetFormatted} (${percentageFormatted}%) annual budget. Approaching limit!`;
                break;
            case NotificationType.BUDGET_EXCEEDED:
                title = 'Budget Exceeded';
                message = `${department.name} department has spent £${spendingFormatted}, exceeding the £${budgetFormatted} annual budget.`;
                break;
            default:
                return;
        }

        const metadata = {
            departmentId: department.id,
            departmentName: department.name,
            currentSpend: spending,
            budgetLimit: budget,
            percentage: percentageFormatted,
        };

        // Get users to notify
        const usersToNotify = await this.getUsersToNotify(department.id);

        // Create notifications for each user
        for (const userId of usersToNotify) {
            await notificationService.createNotification({
                userId,
                type: thresholdType,
                title,
                message,
                metadata,
            });
        }

        Logger.info(`Created ${thresholdType} notifications for department ${department.name}`);
    }

    /**
     * Get list of user IDs who should receive budget notifications
     */
    private async getUsersToNotify(departmentId: string): Promise<string[]> {
        const userIds: string[] = [];

        // 1. Get all System Admins (they see all budget notifications)
        const systemAdmins = await prisma.user.findMany({
            where: { role: UserRole.SYSTEM_ADMIN },
            select: { id: true },
        });
        userIds.push(...systemAdmins.map(u => u.id));

        // 2. Get Senior Managers of this department
        const seniorManagers = await prisma.user.findMany({
            where: {
                role: UserRole.SENIOR_MANAGER,
                departmentId: departmentId,
            },
            select: { id: true },
        });
        userIds.push(...seniorManagers.map(u => u.id));

        // Remove duplicates
        return [...new Set(userIds)];
    }
}

export default new BudgetMonitorService();

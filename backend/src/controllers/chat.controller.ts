import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const handleChat = async (req: AuthRequest, res: Response) => {
    try {
        const { message } = req.body;
        const userId = req.user?.id;

        if (!message || !userId) {
            return res.status(400).json({ error: 'Message and authentication required' });
        }

        const lowerMsg = message.toLowerCase();
        let responseText = "I'm not sure how to help with that. Try asking about your budget, request status, or contracts.";

        // 1. Budget Query
        if (lowerMsg.includes('budget') || lowerMsg.includes('spending') || lowerMsg.includes('spent')) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { department: true }
            });

            if (user?.department) {
                // Determine budget (mock logic if not in DB, but let's try to use real fields if available)
                // Assuming department has budget fields, otherwise we'll simulate based on recent requests
                // For this MVP, we'll calculate total approved requests for the department

                const requests = await prisma.purchaseRequest.findMany({
                    where: {
                        requester: {
                            departmentId: user.departmentId!
                        },
                        status: 'APPROVED'
                    }
                });

                const totalSpent = requests.reduce((sum, req) => sum + Number(req.totalAmount), 0);
                const departmentName = user.department.name;

                // Mock budget limit for demo purposes (since we don't have a Budget model yet)
                const budgetLimit = 50000;
                const remaining = budgetLimit - totalSpent;
                const percentage = Math.round((totalSpent / budgetLimit) * 100);

                responseText = `For the **${departmentName}** department:\n\n` +
                    `• **Total Spent**: $${totalSpent.toLocaleString()}\n` +
                    `• **Budget Limit**: $${budgetLimit.toLocaleString()}\n` +
                    `• **Remaining**: $${remaining.toLocaleString()}\n` +
                    `• **Utilization**: ${percentage}%`;
            } else {
                responseText = "I couldn't find your department information to check the budget.";
            }
        }

        // 2. Request Status Query (e.g., "status of REQ-123")
        else if (lowerMsg.includes('status') || (lowerMsg.includes('request') && lowerMsg.match(/\d+/))) {
            // Extract ID or Search recent
            const idMatch = message.match(/REQ-([a-fA-F0-9-]+)/) || message.match(/([a-fA-F0-9-]{8,})/);

            if (idMatch) {
                const reqId = idMatch[0];
                const specificRequest = await prisma.purchaseRequest.findUnique({
                    where: { id: reqId, requesterId: userId }
                });

                if (specificRequest) {
                    responseText = `**Request Status for ${specificRequest.reason || 'Request'}**:\n\n` +
                        `• **Status**: ${specificRequest.status}\n` +
                        `• **Amount**: $${Number(specificRequest.totalAmount).toLocaleString()}\n` +
                        `• **Created**: ${specificRequest.createdAt.toLocaleDateString()}`;
                } else {
                    responseText = `I couldn't find a request with ID "${reqId}" associated with your account.`;
                }
            } else {
                // Show recent requests
                const recent = await prisma.purchaseRequest.findMany({
                    where: { requesterId: userId },
                    orderBy: { createdAt: 'desc' },
                    take: 5
                });

                if (recent.length > 0) {
                    responseText = "**Your Recent Requests:**\n\n" + recent.map(r =>
                        `• **${r.reason || 'Request'}** - ${r.status} ($${Number(r.totalAmount).toLocaleString()})`
                    ).join('\n');
                } else {
                    responseText = "You don't have any active requests.";
                }
            }
        }

        // 3. Pending Approvals
        else if (lowerMsg.includes('approval') || lowerMsg.includes('pending')) {
            // Find requests where user is the manager or related to approval flow
            // For MVP, show all PENDING requests for the user's department if they are a manager
            const user = await prisma.user.findUnique({ where: { id: userId } });

            if (user?.role === 'MANAGER' || user?.role === 'SENIOR_MANAGER') {
                const pending = await prisma.purchaseRequest.findMany({
                    where: {
                        requester: {
                            departmentId: user.departmentId!
                        },
                        status: 'PENDING'
                    },
                    include: { requester: true }
                });

                if (pending.length > 0) {
                    responseText = `You have **${pending.length} pending approvals**:\n\n` + pending.map(r =>
                        `• **${r.reason || 'Request'}** from ${r.requester.name} - $${Number(r.totalAmount).toLocaleString()}`
                    ).join('\n');
                } else {
                    responseText = "You're all caught up! No pending approvals.";
                }
            } else {
                responseText = "You don't have any pending approvals assigned to you.";
            }
        }

        // 4. Contracts
        else if (lowerMsg.includes('contract') || lowerMsg.includes('agreement')) {
            // Search for contracts
            const contracts = await prisma.contract.findMany({
                where: { status: 'ACTIVE' },
                take: 5,
                include: { supplier: true }
            });

            if (contracts.length > 0) {
                responseText = "**Active Contracts:**\n\n" + contracts.map(c =>
                    `• **${c.title}** (${c.supplier.name}) - Expires ${c.endDate.toISOString().split('T')[0]}`
                ).join('\n');
            } else {
                responseText = "No active contracts found.";
            }
        }

        // 5. Help / Greeting
        else if (lowerMsg.includes('hi') || lowerMsg.includes('hello') || lowerMsg.includes('help')) {
            responseText = "Hello! I'm your procurement assistant. I can help you with:\n\n" +
                "• Checking your **budget status**\n" +
                "• Finding **recent requests**\n" +
                "• Viewing **pending approvals**\n" +
                "• Listing **active contracts**\n\n" +
                "Just ask me nicely!";
        }

        res.json({ text: responseText });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

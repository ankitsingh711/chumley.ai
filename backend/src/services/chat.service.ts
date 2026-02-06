import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ChatResponse {
    text: string;
    data?: any;
    type?: 'text' | 'requests_list' | 'contracts_list' | 'spend_summary';
}

export class ChatService {
    async processMessage(userId: string, text: string): Promise<ChatResponse> {
        const lowerText = text.toLowerCase();

        // Intent: GREETING
        if (lowerText.match(/^(hi|hello|hey|greetings)/)) {
            return {
                text: "Hello! I'm ChumleyBot. I can help you check request status, view contracts, or analyze spend. What do you need?",
                type: 'text'
            };
        }

        // Intent: CHECK_STATUS
        if (lowerText.includes('status') || lowerText.includes('request') || lowerText.includes('order')) {
            const recentRequests = await prisma.purchaseRequest.findMany({
                where: { requesterId: userId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { requester: true }
            });

            if (recentRequests.length === 0) {
                return {
                    text: "You don't have any active purchase requests at the moment.",
                    type: 'text'
                };
            }

            return {
                text: `Here are your ${recentRequests.length} most recent requests:`,
                type: 'requests_list',
                data: recentRequests
            };
        }

        // Intent: SPEND_ANALYSIS
        if (lowerText.includes('spend') || lowerText.includes('budget') || lowerText.includes('cost')) {
            // Get user's department first
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { department: true }
            });

            if (!user?.department) {
                return { text: "I couldn't identify your department to check the budget.", type: 'text' };
            }

            // Calculate total spend for department (requests that are approved + orders)
            // For simplicity, summing up APPROVED purchase requests for this user's department
            const aggregate = await prisma.purchaseRequest.aggregate({
                where: {
                    status: 'APPROVED',
                    requester: {
                        departmentId: user.departmentId
                    }
                },
                _sum: {
                    totalAmount: true
                }
            });

            const totalSpent = Number(aggregate._sum.totalAmount || 0);
            const budget = Number(user.department.budget || 0);
            const remaining = budget - totalSpent;
            const percentUsed = budget > 0 ? ((totalSpent / budget) * 100).toFixed(1) : 0;

            return {
                text: `Your department (${user.department.name}) has spent $${totalSpent.toLocaleString()} this year (${percentUsed}% of budget). Remaining: $${remaining.toLocaleString()}.`,
                type: 'spend_summary',
                data: { totalSpent, budget, remaining, percentUsed }
            };
        }

        // Intent: CONTRACTS
        if (lowerText.includes('contract') || lowerText.includes('agreement')) {
            const contracts = await prisma.contract.findMany({
                where: { status: 'ACTIVE' },
                orderBy: { endDate: 'asc' },
                take: 3,
                include: { supplier: true }
            });

            return {
                text: "Here are some active contracts expiring soon:",
                type: 'contracts_list',
                data: contracts
            };
        }

        // Intent: HELP
        if (lowerText.includes('help') || lowerText.includes('support')) {
            return {
                text: "I can help with:\n- Checking your request status\n- Department budget & spend analysis\n- Finding active contracts\n- General FAQs",
                type: 'text'
            };
        }

        // Intent: FALLBACK
        return {
            text: "I'm not sure I understood that. Try asking about 'my requests', 'budget', or 'contracts'.",
            type: 'text'
        };
    }
}

export const chatService = new ChatService();

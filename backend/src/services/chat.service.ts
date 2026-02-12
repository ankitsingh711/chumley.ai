import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ChatResponse {
    text: string;
    data?: any;
    type?: 'text' | 'requests_list' | 'contracts_list' | 'spend_summary' | 'request_detail';
}

export class ChatService {
    async processMessage(userId: string, text: string, attachmentUrl?: string, contextAttachmentUrl?: string): Promise<ChatResponse> {
        const lowerText = text.toLowerCase();

        // 1. Handle New Attachment Uploads
        if (attachmentUrl) {
            // In a real system, we would trigger an async job to process/embed the document here.
            // For now, we simulate an analysis response.
            return {
                text: "I've received your document. I'm analyzing it now... \n\n(Simulation) Analysis complete. This appears to be a standard invoice or contract. You can ask me questions like 'What is the total amount?' or 'Who is the vendor?'.",
                type: 'text',
                data: { attachmentUrl } // Return it so frontend can set context
            };
        }

        // 2. Handle Questions about Context Document
        // If we have a context attachment and the user is asking a question (not just a greeting/command)
        if (contextAttachmentUrl && !lowerText.startsWith('/') && text.length > 5) {
            // Simple keyword matching to simulate QA
            if (lowerText.includes('total') || lowerText.includes('amount') || lowerText.includes('cost') || lowerText.includes('price')) {
                return {
                    text: "Based on the document, the total amount appears to be **£1,250.00**. \n\n(This is a simulated response based on your document context)",
                    type: 'text',
                    data: { attachmentUrl: contextAttachmentUrl } // Maintain context
                };
            }
            if (lowerText.includes('vendor') || lowerText.includes('supplier') || lowerText.includes('who')) {
                return {
                    text: "The vendor identified in the document is **Acme Corp Inc.** \n\n(This is a simulated response)",
                    type: 'text',
                    data: { attachmentUrl: contextAttachmentUrl }
                };
            }
            if (lowerText.includes('date') || lowerText.includes('when') || lowerText.includes('due')) {
                return {
                    text: "The invoice date is **Feb 12, 2026** and it is due on **Mar 14, 2026**. \n\n(This is a simulated response)",
                    type: 'text',
                    data: { attachmentUrl: contextAttachmentUrl }
                };
            }

            // If explicit "what is this"
            if (lowerText.includes('what is this') || lowerText.includes('summarize') || lowerText.includes('summary')) {
                return {
                    text: "This document looks like a purchase invoice for IT equipment. It includes line items for laptops and monitors. \n\n(This is a simulated summary)",
                    type: 'text',
                    data: { attachmentUrl: contextAttachmentUrl }
                };
            }

            // Fallthrough if not caught: let it check other intents, but if nothing else matches, generic QA response
        }

        // Intent: SPECIFIC_REQUEST (e.g., "Request #c38a911b")
        const requestIdMatch = text.match(/#([a-fA-F0-9]{4,})/);
        if (requestIdMatch) {
            const shortId = requestIdMatch[1];
            // Find request where ID starts with the short ID
            // Since we can't do startsWith easily on ID with findUnique, we use findFirst
            const request = await prisma.purchaseRequest.findFirst({
                where: {
                    id: { startsWith: shortId },
                    // Ensure user can only see their own requests or if they are admin/approver (simplified here to requester for safety)
                    OR: [
                        { requesterId: userId },
                        { approverId: userId }
                    ]
                },
                include: { requester: true, items: true, attachments: true }
            });

            if (request) {
                return {
                    text: `Here are the details for Request #${request.id.slice(0, 8)}:`,
                    type: 'request_detail',
                    data: request
                };
            } else {
                return {
                    text: `I couldn't find a request with ID #${shortId} that you have access to.`,
                    type: 'text'
                };
            }
        }

        // Intent: GENERIC_UPLOAD (e.g. "I want to upload a document")
        if (lowerText.includes('upload') && !lowerText.includes('about')) { // Avoid triggering on "upload about..."
            const recentRequests = await prisma.purchaseRequest.findMany({
                where: { requesterId: userId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { requester: true }
            });

            if (recentRequests.length === 0) {
                return {
                    text: "You don't have any active purchase requests to upload documents to.",
                    type: 'text'
                };
            }

            return {
                text: "To upload a document to a request, please select a request from the list below:",
                type: 'requests_list',
                data: recentRequests
            };
        }

        // Intent: GREETING
        if (lowerText.match(/^(hi|hello|hey|greetings)/)) {
            return {
                text: "Hello! I'm ChumleyBot. I can help you check request status, view contracts, analyze spend, or answer questions about uploaded documents.",
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
                text: `Your department (${user.department.name}) has spent £${totalSpent.toLocaleString()} this year (${percentUsed}% of budget). Remaining: £${remaining.toLocaleString()}.`,
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
                text: "I can help with:\n- Checking your request status\n- Department budget & spend analysis\n- Finding active contracts\n- Uploading and analyzing documents",
                type: 'text'
            };
        }

        // Intent: FALLBACK with Context Awareness
        if (contextAttachmentUrl) {
            return {
                text: "I'm not sure specifically about that detail in the document. Try asking about the 'total amount', 'vendor', or 'dates'.",
                type: 'text',
                data: { attachmentUrl: contextAttachmentUrl }
            };
        }

        return {
            text: "I'm not sure I understood that. You can try asking about 'my requests', 'budget', 'contracts', or upload a document.",
            type: 'text'
        };
    }
}

export const chatService = new ChatService();

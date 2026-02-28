import { ContractStatus, OrderStatus, RequestStatus, UserRole } from '@prisma/client';
import prisma from '../config/db';

interface ChatResponse {
    text: string;
    data?: any;
    type?: 'text' | 'requests_list' | 'contracts_list' | 'spend_summary' | 'request_detail' | 'orders_list' | 'suppliers_list' | 'overview';
}

interface ChatHistoryItem {
    sender?: 'user' | 'bot';
    text?: string;
    type?: string;
}

interface UserContext {
    id: string;
    name: string;
    role: UserRole;
    departmentId: string | null;
    departmentName: string | null;
    departmentBudget: number;
}

export class ChatService {
    async processMessage(userId: string, text: string, attachmentUrl?: string, contextAttachmentUrl?: string, history: ChatHistoryItem[] = []): Promise<ChatResponse> {
        const normalizedText = this.normalizeText(text);
        const inferredText = this.inferFollowUpIntent(normalizedText, history);
        const lowerText = inferredText.toLowerCase();
        const user = await this.getUserContext(userId);

        // 1) File upload/document context flow
        if (attachmentUrl) {
            return {
                text: "Document received. I can now answer questions about it. Try asking:\n- What is the total amount?\n- Who is the supplier/vendor?\n- What are the invoice/contract dates?\n- Summarize this document.",
                type: 'text',
                data: { attachmentUrl },
            };
        }

        if (!inferredText && !contextAttachmentUrl) {
            return {
                text: this.getHelpText(),
                type: 'text',
            };
        }

        // 2) Conversational intents
        if (this.isGreetingIntent(lowerText)) {
            return {
                text: `Hi ${user.name.split(' ')[0]}! I can help with requests, approvals, orders, suppliers, contracts, budgets, and document Q&A.`,
                type: 'text',
            };
        }

        if (this.isThanksIntent(lowerText)) {
            return {
                text: "You're welcome. Ask for a dashboard summary anytime and I'll pull your latest numbers.",
                type: 'text',
            };
        }

        if (this.isPasswordIntent(lowerText)) {
            return {
                text: "Use the 'Forgot password?' link on the login page. If your account was invite-based and that doesn't work, ask a System Admin or Senior Manager to re-send your invitation.",
                type: 'text',
            };
        }

        if (this.isCreateRequestIntent(lowerText)) {
            return {
                text: "To create a new request:\n1. Go to Requests.\n2. Click Create Request.\n3. Add items, supplier/category, and delivery details.\n4. Submit for approval.\n\nIf you want, I can first show your recent requests so you can reuse details.",
                type: 'text',
            };
        }

        if (this.isHelpIntent(lowerText)) {
            return { text: this.getHelpText(), type: 'text' };
        }

        // 3) Specific request lookup by ID fragment
        const shortId = this.extractShortId(inferredText);
        if (shortId) {
            return this.handleRequestLookup(user, shortId);
        }

        // 4) Action intents
        if (this.isOverviewIntent(lowerText)) {
            return this.handleOverviewIntent(user);
        }

        if (this.isApprovalIntent(lowerText)) {
            return this.handleApprovalsIntent(user, lowerText);
        }

        if (this.isUploadIntent(lowerText)) {
            return this.handleUploadIntent(user);
        }

        if (this.isRequestIntent(lowerText)) {
            return this.handleRequestsIntent(user, lowerText);
        }

        if (this.isOrderIntent(lowerText)) {
            return this.handleOrdersIntent(user, lowerText);
        }

        if (this.isSupplierIntent(lowerText)) {
            return this.handleSuppliersIntent(user, inferredText, lowerText);
        }

        if (this.isBudgetIntent(lowerText)) {
            return this.handleBudgetIntent(user);
        }

        if (this.isContractIntent(lowerText)) {
            return this.handleContractsIntent(lowerText);
        }

        // 5) Context document Q&A (simulated parsing)
        if (contextAttachmentUrl) {
            return this.handleDocumentQuestion(lowerText, contextAttachmentUrl);
        }

        // 6) Optional LLM fallback (enabled only when API key exists)
        const llmAnswer = await this.generateLLMFallback(user, inferredText);
        if (llmAnswer) {
            return {
                text: llmAnswer,
                type: 'text',
            };
        }

        // 7) Deterministic fallback
        return {
            text: "I can help with procurement tasks, but I couldn't map that request yet. Try:\n- \"Show my pending requests\"\n- \"Any approvals pending for me?\"\n- \"What's our budget usage?\"\n- \"Show active contracts expiring soon\"\n- \"List recent orders\"",
            type: 'text',
        };
    }

    private async getUserContext(userId: string): Promise<UserContext> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                role: true,
                departmentId: true,
                department: {
                    select: {
                        name: true,
                        budget: true,
                    },
                },
            },
        });

        if (!user) {
            throw new Error('Chat user not found');
        }

        return {
            id: user.id,
            name: user.name,
            role: user.role,
            departmentId: user.departmentId,
            departmentName: user.department?.name || null,
            departmentBudget: Number(user.department?.budget || 0),
        };
    }

    private getHelpText(): string {
        return [
            "I can help with:",
            "- My requests (latest, pending, approved, rejected)",
            "- My pending approvals",
            "- Orders and statuses",
            "- Supplier lookups",
            "- Contract tracking (including expiring soon)",
            "- Department budget/spend analysis",
            "- Document Q&A after upload",
            "",
            "Try: \"Give me a dashboard summary\"",
        ].join('\n');
    }

    private normalizeText(text: string): string {
        return (text || '').replace(/\s+/g, ' ').trim();
    }

    private inferFollowUpIntent(text: string, history: ChatHistoryItem[]): string {
        const normalized = this.normalizeText(text);
        if (!normalized) return normalized;

        const lower = normalized.toLowerCase();
        const shortFollowUp = normalized.length <= 28;
        const hasReferenceLanguage = this.containsAny(lower, ['and ', 'those', 'them', 'ones', 'same', 'that', 'these']);

        if (!shortFollowUp && !hasReferenceLanguage) {
            return normalized;
        }

        const lastUserTurn = [...history]
            .reverse()
            .find((turn) => turn?.sender === 'user' && this.normalizeText(turn.text || '').toLowerCase() !== lower);

        if (!lastUserTurn?.text) {
            return normalized;
        }

        const lastUserText = this.normalizeText(lastUserTurn.text).toLowerCase();

        if (this.isRequestIntent(lastUserText) && !this.isRequestIntent(lower)) {
            return `${normalized} requests`;
        }

        if (this.isOrderIntent(lastUserText) && !this.isOrderIntent(lower)) {
            return `${normalized} orders`;
        }

        if (this.isContractIntent(lastUserText) && !this.isContractIntent(lower)) {
            return `${normalized} contracts`;
        }

        if (this.isSupplierIntent(lastUserText) && !this.isSupplierIntent(lower)) {
            return `${normalized} suppliers`;
        }

        if (this.isBudgetIntent(lastUserText) && !this.isBudgetIntent(lower)) {
            return `${normalized} budget`;
        }

        return normalized;
    }

    private containsAny(text: string, keywords: string[]): boolean {
        return keywords.some((keyword) => text.includes(keyword));
    }

    private extractShortId(text: string): string | null {
        const hashMatch = text.match(/#([a-fA-F0-9]{4,})/);
        if (hashMatch) return hashMatch[1];

        const uuidLike = text.match(/\b([a-fA-F0-9]{8,})\b/);
        if (uuidLike) return uuidLike[1];

        return null;
    }

    private extractResultLimit(text: string, fallback = 5, max = 10): number {
        const match = text.match(/\b(\d{1,2})\b/);
        if (!match) return fallback;

        const parsed = Number(match[1]);
        if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
        return Math.min(parsed, max);
    }

    private isCountIntent(text: string): boolean {
        return this.containsAny(text, ['how many', 'count', 'number of', 'total']);
    }

    private isGreetingIntent(text: string): boolean {
        return /^(hi|hello|hey|yo|good morning|good afternoon|good evening)\b/.test(text);
    }

    private isThanksIntent(text: string): boolean {
        return this.containsAny(text, ['thanks', 'thank you', 'thx']);
    }

    private isHelpIntent(text: string): boolean {
        return this.containsAny(text, ['help', 'support', 'what can you do', 'capabilities']);
    }

    private isPasswordIntent(text: string): boolean {
        return this.containsAny(text, ['password', 'reset login', 'forgot login', 'forgot my login']);
    }

    private isCreateRequestIntent(text: string): boolean {
        return (this.containsAny(text, ['create', 'new', 'submit', 'raise', 'make']) && text.includes('request'))
            || this.containsAny(text, ['create request', 'new request', 'submit request']);
    }

    private isUploadIntent(text: string): boolean {
        return this.containsAny(text, ['upload', 'attach document', 'add document', 'upload file']);
    }

    private isOverviewIntent(text: string): boolean {
        return this.containsAny(text, ['dashboard', 'summary', 'overview', 'snapshot', 'high level', 'stats', 'statistics']);
    }

    private isApprovalIntent(text: string): boolean {
        return this.containsAny(text, ['approval', 'approvals', 'approve']);
    }

    private isRequestIntent(text: string): boolean {
        return this.containsAny(text, ['request', 'requests', 'status']);
    }

    private isOrderIntent(text: string): boolean {
        return this.containsAny(text, ['order', 'orders', 'po']);
    }

    private isSupplierIntent(text: string): boolean {
        return this.containsAny(text, ['supplier', 'suppliers', 'vendor', 'vendors']);
    }

    private isBudgetIntent(text: string): boolean {
        return this.containsAny(text, ['budget', 'spend', 'spent', 'cost', 'remaining']);
    }

    private isContractIntent(text: string): boolean {
        return this.containsAny(text, ['contract', 'contracts', 'agreement', 'agreements', 'renewal', 'renew']);
    }

    private parseRequestStatus(text: string): RequestStatus | null {
        if (this.containsAny(text, ['approved'])) return RequestStatus.APPROVED;
        if (this.containsAny(text, ['rejected', 'declined'])) return RequestStatus.REJECTED;
        if (this.containsAny(text, ['pending'])) return RequestStatus.PENDING;
        if (this.containsAny(text, ['in progress', 'in-progress'])) return RequestStatus.IN_PROGRESS;
        return null;
    }

    private parseOrderStatus(text: string): OrderStatus | null {
        if (this.containsAny(text, ['sent'])) return OrderStatus.SENT;
        if (this.containsAny(text, ['partial', 'partially'])) return OrderStatus.PARTIAL;
        if (this.containsAny(text, ['completed', 'complete'])) return OrderStatus.COMPLETED;
        if (this.containsAny(text, ['cancelled', 'canceled'])) return OrderStatus.CANCELLED;
        if (this.containsAny(text, ['in progress', 'in-progress'])) return OrderStatus.IN_PROGRESS;
        return null;
    }

    private parseContractStatus(text: string): ContractStatus | null {
        if (this.containsAny(text, ['draft'])) return ContractStatus.DRAFT;
        if (this.containsAny(text, ['active'])) return ContractStatus.ACTIVE;
        if (this.containsAny(text, ['expiring'])) return ContractStatus.EXPIRING_SOON;
        if (this.containsAny(text, ['expired'])) return ContractStatus.EXPIRED;
        if (this.containsAny(text, ['terminated'])) return ContractStatus.TERMINATED;
        if (this.containsAny(text, ['renewed'])) return ContractStatus.RENEWED;
        return null;
    }

    private formatCurrency(value: number): string {
        return `£${value.toLocaleString()}`;
    }

    private formatStatus(value: string): string {
        return value.replace(/_/g, ' ');
    }

    private formatDate(value: Date | string | null | undefined): string {
        if (!value) return 'N/A';
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString();
    }

    private getRequestScopeWhere(user: UserContext): Record<string, any> {
        if (user.role === UserRole.SYSTEM_ADMIN) {
            return {};
        }

        if (user.role === UserRole.MEMBER) {
            return { requesterId: user.id };
        }

        if (user.departmentId) {
            return {
                requester: {
                    departmentId: user.departmentId,
                },
            };
        }

        return { requesterId: user.id };
    }

    private getOrderScopeWhere(user: UserContext): Record<string, any> {
        if (user.role === UserRole.SYSTEM_ADMIN) {
            return {};
        }

        if (user.role === UserRole.MEMBER) {
            return {
                request: {
                    requesterId: user.id,
                },
            };
        }

        if (user.departmentId) {
            return {
                request: {
                    requester: {
                        departmentId: user.departmentId,
                    },
                },
            };
        }

        return {
            request: {
                requesterId: user.id,
            },
        };
    }

    private getSupplierScopeWhere(user: UserContext): Record<string, any> {
        if (user.role === UserRole.SYSTEM_ADMIN) {
            return {};
        }

        if (user.role === UserRole.MEMBER) {
            return {
                OR: [
                    { requests: { some: { requesterId: user.id } } },
                    { orders: { some: { request: { requesterId: user.id } } } },
                ],
            };
        }

        if (user.departmentId) {
            return {
                OR: [
                    { requests: { some: { requester: { departmentId: user.departmentId } } } },
                    { orders: { some: { request: { requester: { departmentId: user.departmentId } } } } },
                    { departments: { some: { id: user.departmentId } } },
                ],
            };
        }

        return {
            OR: [
                { requests: { some: { requesterId: user.id } } },
                { orders: { some: { request: { requesterId: user.id } } } },
            ],
        };
    }

    private async handleRequestLookup(user: UserContext, shortId: string): Promise<ChatResponse> {
        const scopeWhere = this.getRequestScopeWhere(user);

        const request = await prisma.purchaseRequest.findFirst({
            where: {
                AND: [
                    scopeWhere,
                    { id: { startsWith: shortId } },
                ],
            },
            include: {
                requester: true,
                approver: true,
                supplier: true,
                items: true,
                attachments: true,
            },
        });

        if (!request) {
            return {
                text: `I couldn't find a request matching #${shortId} in your accessible scope.`,
                type: 'text',
            };
        }

        return {
            text: `Here are the details for Request #${request.id.slice(0, 8)}:`,
            type: 'request_detail',
            data: request,
        };
    }

    private async handleUploadIntent(user: UserContext): Promise<ChatResponse> {
        const recentRequests = await prisma.purchaseRequest.findMany({
            where: this.getRequestScopeWhere(user),
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { requester: true },
        });

        if (recentRequests.length === 0) {
            return {
                text: "I couldn't find any request in your scope to attach documents to.",
                type: 'text',
            };
        }

        return {
            text: "Select a recent request below, then attach your file in the chat composer:",
            type: 'requests_list',
            data: recentRequests,
        };
    }

    private async handleApprovalsIntent(user: UserContext, lowerText: string): Promise<ChatResponse> {
        if (user.role === UserRole.MEMBER) {
            return {
                text: "You don't have approver permissions. I can still show your own requests and statuses.",
                type: 'text',
            };
        }

        const where = {
            status: { in: [RequestStatus.PENDING, RequestStatus.IN_PROGRESS] },
            OR: [
                { approverId: user.id },
                { currentApproverId: user.id },
            ],
        };

        if (this.isCountIntent(lowerText)) {
            const count = await prisma.purchaseRequest.count({ where });
            return {
                text: `You currently have ${count} pending approval${count === 1 ? '' : 's'}.`,
                type: 'text',
            };
        }

        const take = this.extractResultLimit(lowerText, 5, 10);
        const requests = await prisma.purchaseRequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take,
            include: { requester: true },
        });

        if (requests.length === 0) {
            return {
                text: "You don't have pending approvals right now.",
                type: 'text',
            };
        }

        return {
            text: `Here are your ${requests.length} pending approvals:`,
            type: 'requests_list',
            data: requests,
        };
    }

    private async handleRequestsIntent(user: UserContext, lowerText: string): Promise<ChatResponse> {
        const status = this.parseRequestStatus(lowerText);
        const where: Record<string, any> = {
            ...this.getRequestScopeWhere(user),
        };

        if (status) {
            where.status = status;
        }

        if (this.isCountIntent(lowerText)) {
            const count = await prisma.purchaseRequest.count({ where });
            const label = status ? this.formatStatus(status) : 'total';
            return {
                text: `You have ${count} ${label.toLowerCase()} request${count === 1 ? '' : 's'} in your scope.`,
                type: 'text',
            };
        }

        const take = this.extractResultLimit(lowerText, 5, 10);
        const requests = await prisma.purchaseRequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take,
            include: { requester: true },
        });

        if (requests.length === 0) {
            return {
                text: "I couldn't find matching requests in your scope.",
                type: 'text',
            };
        }

        return {
            text: `Here are your ${requests.length} most recent request${requests.length === 1 ? '' : 's'}${status ? ` (${this.formatStatus(status)})` : ''}:`,
            type: 'requests_list',
            data: requests,
        };
    }

    private async handleOrdersIntent(user: UserContext, lowerText: string): Promise<ChatResponse> {
        const status = this.parseOrderStatus(lowerText);
        const where: Record<string, any> = {
            ...this.getOrderScopeWhere(user),
        };
        if (status) {
            where.status = status;
        }

        if (this.isCountIntent(lowerText)) {
            const count = await prisma.purchaseOrder.count({ where });
            const label = status ? this.formatStatus(status) : 'total';
            return {
                text: `You have ${count} ${label.toLowerCase()} order${count === 1 ? '' : 's'} in your scope.`,
                type: 'text',
            };
        }

        const take = this.extractResultLimit(lowerText, 5, 10);
        const orders = await prisma.purchaseOrder.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take,
            include: {
                supplier: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        if (orders.length === 0) {
            return {
                text: "I couldn't find matching orders in your scope.",
                type: 'text',
            };
        }

        const orderCards = orders.map((order) => ({
            id: order.id,
            status: order.status,
            totalAmount: Number(order.totalAmount),
            createdAt: order.createdAt,
            supplierName: order.supplier.name,
        }));

        return {
            text: `Here are ${orders.length} recent order${orders.length === 1 ? '' : 's'}:`,
            type: 'orders_list',
            data: orderCards,
        };
    }

    private async handleSuppliersIntent(user: UserContext, originalText: string, lowerText: string): Promise<ChatResponse> {
        const scopeWhere = this.getSupplierScopeWhere(user);
        const where: Record<string, any> = { ...scopeWhere };

        const quotedMatch = originalText.match(/"([^"]{2,50})"/);
        if (quotedMatch?.[1]) {
            where.AND = [...(where.AND || []), { name: { contains: quotedMatch[1], mode: 'insensitive' } }];
        }

        if (this.isCountIntent(lowerText)) {
            const count = await prisma.supplier.count({ where });
            return {
                text: `You have access to ${count} supplier${count === 1 ? '' : 's'}.`,
                type: 'text',
            };
        }

        const take = this.extractResultLimit(lowerText, 5, 10);
        const suppliers = await prisma.supplier.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            take,
            select: {
                id: true,
                name: true,
                category: true,
                status: true,
                contactName: true,
                contactEmail: true,
            },
        });

        if (suppliers.length === 0) {
            return {
                text: "I couldn't find suppliers in your scope for that query.",
                type: 'text',
            };
        }

        return {
            text: `Here are ${suppliers.length} supplier${suppliers.length === 1 ? '' : 's'}:`,
            type: 'suppliers_list',
            data: suppliers,
        };
    }

    private async handleBudgetIntent(user: UserContext): Promise<ChatResponse> {
        if (!user.departmentId || !user.departmentName) {
            return {
                text: "I couldn't identify your department, so I can't calculate budget usage.",
                type: 'text',
            };
        }

        const yearStart = new Date(new Date().getFullYear(), 0, 1);

        const [aggregate, pendingCount] = await Promise.all([
            prisma.purchaseRequest.aggregate({
                where: {
                    status: RequestStatus.APPROVED,
                    createdAt: { gte: yearStart },
                    requester: { departmentId: user.departmentId },
                },
                _sum: { totalAmount: true },
            }),
            prisma.purchaseRequest.count({
                where: {
                    status: { in: [RequestStatus.PENDING, RequestStatus.IN_PROGRESS] },
                    requester: { departmentId: user.departmentId },
                },
            }),
        ]);

        const totalSpent = Number(aggregate._sum.totalAmount || 0);
        const budget = Number(user.departmentBudget || 0);
        const remaining = Math.max(0, budget - totalSpent);
        const percentUsed = budget > 0 ? Number(((totalSpent / budget) * 100).toFixed(1)) : 0;

        return {
            text: `${user.departmentName} has spent ${this.formatCurrency(totalSpent)} this year (${percentUsed}% of budget). Remaining: ${this.formatCurrency(remaining)}. Pending requests: ${pendingCount}.`,
            type: 'spend_summary',
            data: { totalSpent, budget, remaining, percentUsed },
        };
    }

    private async handleContractsIntent(lowerText: string): Promise<ChatResponse> {
        const take = this.extractResultLimit(lowerText, 3, 10);
        const status = this.parseContractStatus(lowerText);
        const isExpiringSoon = this.containsAny(lowerText, ['expiring', 'renewal', 'renew soon', 'expiry']);

        const where: Record<string, any> = {};
        if (status) {
            where.status = status;
        }
        if (isExpiringSoon) {
            const now = new Date();
            const soon = new Date();
            soon.setDate(soon.getDate() + 90);
            where.status = ContractStatus.ACTIVE;
            where.endDate = {
                gte: now,
                lte: soon,
            };
        }

        if (this.isCountIntent(lowerText)) {
            const count = await prisma.contract.count({ where });
            return {
                text: `There ${count === 1 ? 'is' : 'are'} ${count} contract${count === 1 ? '' : 's'}${isExpiringSoon ? ' expiring in the next 90 days' : ''}.`,
                type: 'text',
            };
        }

        const contracts = await prisma.contract.findMany({
            where,
            orderBy: { endDate: 'asc' },
            take,
            include: {
                supplier: {
                    select: {
                        id: true,
                        name: true,
                        category: true,
                        status: true,
                        contactName: true,
                        contactEmail: true,
                        logoUrl: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
        });

        if (contracts.length === 0) {
            return {
                text: "I couldn't find matching contracts.",
                type: 'text',
            };
        }

        return {
            text: isExpiringSoon
                ? `Here are ${contracts.length} active contract${contracts.length === 1 ? '' : 's'} expiring soon:`
                : `Here are ${contracts.length} contract${contracts.length === 1 ? '' : 's'}:`,
            type: 'contracts_list',
            data: contracts,
        };
    }

    private async handleOverviewIntent(user: UserContext): Promise<ChatResponse> {
        const requestScope = this.getRequestScopeWhere(user);
        const orderScope = this.getOrderScopeWhere(user);
        const supplierScope = this.getSupplierScopeWhere(user);

        const now = new Date();
        const soon = new Date();
        soon.setDate(soon.getDate() + 90);

        const [
            totalRequests,
            pendingRequests,
            approvedRequests,
            rejectedRequests,
            totalOrders,
            activeContracts,
            expiringContracts,
            suppliersInScope,
        ] = await Promise.all([
            prisma.purchaseRequest.count({ where: requestScope }),
            prisma.purchaseRequest.count({ where: { ...requestScope, status: RequestStatus.PENDING } }),
            prisma.purchaseRequest.count({ where: { ...requestScope, status: RequestStatus.APPROVED } }),
            prisma.purchaseRequest.count({ where: { ...requestScope, status: RequestStatus.REJECTED } }),
            prisma.purchaseOrder.count({ where: orderScope }),
            prisma.contract.count({ where: { status: ContractStatus.ACTIVE } }),
            prisma.contract.count({
                where: {
                    status: ContractStatus.ACTIVE,
                    endDate: {
                        gte: now,
                        lte: soon,
                    },
                },
            }),
            prisma.supplier.count({ where: supplierScope }),
        ]);

        return {
            text: [
                "Here's your procurement snapshot:",
                `- Requests: ${totalRequests} total (${pendingRequests} pending, ${approvedRequests} approved, ${rejectedRequests} rejected)`,
                `- Orders: ${totalOrders} in your scope`,
                `- Suppliers: ${suppliersInScope} in your scope`,
                `- Contracts: ${activeContracts} active (${expiringContracts} expiring in <= 90 days)`,
                "",
                "Ask me to drill down, e.g. \"show pending requests\" or \"list expiring contracts\".",
            ].join('\n'),
            type: 'overview',
            data: {
                totalRequests,
                pendingRequests,
                approvedRequests,
                rejectedRequests,
                totalOrders,
                suppliersInScope,
                activeContracts,
                expiringContracts,
            },
        };
    }

    private handleDocumentQuestion(lowerText: string, contextAttachmentUrl: string): ChatResponse {
        const withContext = (text: string): ChatResponse => ({
            text,
            type: 'text',
            data: { attachmentUrl: contextAttachmentUrl },
        });

        if (this.containsAny(lowerText, ['total', 'amount', 'cost', 'price', 'balance'])) {
            return withContext("From the uploaded document context, the total appears to be £1,250.00 (simulated extraction).");
        }

        if (this.containsAny(lowerText, ['vendor', 'supplier', 'seller', 'who'])) {
            return withContext("The supplier in this document appears to be Acme Corp Inc. (simulated extraction).");
        }

        if (this.containsAny(lowerText, ['date', 'due', 'when', 'deadline'])) {
            return withContext("Detected dates: Invoice date: 12 Feb 2026, Due date: 14 Mar 2026 (simulated extraction).");
        }

        if (this.containsAny(lowerText, ['line item', 'items', 'products', 'services'])) {
            return withContext("Detected line items include laptops and monitors, with quantity and unit prices listed (simulated extraction).");
        }

        if (this.containsAny(lowerText, ['payment term', 'payment terms', 'net'])) {
            return withContext("Payment terms appear to be Net 30 (simulated extraction).");
        }

        if (this.containsAny(lowerText, ['summary', 'summarize', 'what is this'])) {
            return withContext("Summary: this appears to be an invoice/contract-style procurement document with supplier details, totals, and due dates (simulated extraction).");
        }

        return withContext("I can answer document questions about totals, supplier, dates, line items, and payment terms. Ask one of those for best results.");
    }

    private async generateLLMFallback(user: UserContext, message: string): Promise<string | null> {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return null;

        const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
        const requestScope = this.getRequestScopeWhere(user);
        const orderScope = this.getOrderScopeWhere(user);

        const [requestCount, orderCount] = await Promise.all([
            prisma.purchaseRequest.count({ where: requestScope }),
            prisma.purchaseOrder.count({ where: orderScope }),
        ]);

        const systemPrompt = [
            "You are Aspect Bot, an enterprise procurement assistant.",
            "Be concise, practical, and accurate.",
            "If the user asks outside procurement/account support, say that you are optimized for procurement workflows and offer closest helpful guidance.",
            "Never invent private data. Use only provided context.",
        ].join(' ');

        const userPrompt = [
            `User question: ${message}`,
            `User role: ${user.role}`,
            `User department: ${user.departmentName || 'Unknown'}`,
            `Accessible request count: ${requestCount}`,
            `Accessible order count: ${orderCount}`,
        ].join('\n');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        try {
            const response = await fetch('https://api.openai.com/v1/responses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    temperature: 0.2,
                    max_output_tokens: 280,
                    input: [
                        {
                            role: 'system',
                            content: [{ type: 'input_text', text: systemPrompt }],
                        },
                        {
                            role: 'user',
                            content: [{ type: 'input_text', text: userPrompt }],
                        },
                    ],
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                return null;
            }

            const json = await response.json() as any;
            const fromOutputText = typeof json.output_text === 'string' ? json.output_text.trim() : '';
            if (fromOutputText) return fromOutputText;

            const output = Array.isArray(json.output) ? json.output : [];
            const chunks: string[] = [];

            for (const item of output) {
                const content = Array.isArray(item?.content) ? item.content : [];
                for (const block of content) {
                    if (block?.type === 'output_text' && typeof block?.text === 'string') {
                        chunks.push(block.text);
                    }
                }
            }

            const merged = chunks.join('\n').trim();
            return merged || null;
        } catch {
            return null;
        } finally {
            clearTimeout(timeout);
        }
    }
}

export const chatService = new ChatService();

// Backend API Models
export const UserRole = {
    SYSTEM_ADMIN: 'SYSTEM_ADMIN',
    SENIOR_MANAGER: 'SENIOR_MANAGER',
    MANAGER: 'MANAGER',
    MEMBER: 'MEMBER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface Department {
    id: string;
    name: string;
    description?: string;
    budget?: number;
}

export const RequestStatus = {
    IN_PROGRESS: 'IN_PROGRESS',
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
} as const;

export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export const OrderStatus = {
    IN_PROGRESS: 'IN_PROGRESS',
    SENT: 'SENT',
    PARTIAL: 'PARTIAL',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const ContractStatus = {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    EXPIRING_SOON: 'EXPIRING_SOON',
    EXPIRED: 'EXPIRED',
    TERMINATED: 'TERMINATED',
    RENEWED: 'RENEWED',
} as const;

export type ContractStatus = (typeof ContractStatus)[keyof typeof ContractStatus];

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    departmentId?: string;
    department?: Department | string; // Handle both object (from relations) and potential string legacy
    createdAt: string;
    updatedAt: string;
}

export interface Supplier {
    id: string;
    name: string;
    category: string;
    status: string;
    contactName?: string;
    contactEmail?: string;
    logoUrl?: string;
    createdAt: string;
    updatedAt: string;
    stats?: {
        activeOrders: number;
        totalSpend: number;
    };
    lastOrderDate?: string;
    requests?: PurchaseRequest[];
    orders?: PurchaseOrder[];
    details?: SupplierDetails;
    messages?: Message[];
    documents?: SupplierDocument[];
    interactions?: InteractionLog[];
}

export interface SupplierDetails {
    id: string;
    supplierId: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    paymentTerms?: string;
    paymentMethod?: string;
    internalNotes?: string;
    rating?: number;
    reviewCount?: number;
    // Metrics
    deliveryDelayAverage?: number;
    qualityScore?: number;
    communicationScore?: number;

    createdAt: string;
    updatedAt: string;
}

export interface SupplierDocument {
    id: string;
    supplierId: string;
    title: string;
    type: string;
    url: string;
    expiryDate: string | null;
    status: string;
    uploadDate: string;
}

export interface Message {
    id: string;
    supplierId: string;
    userId: string;
    user?: { id: string; name: string; email: string };
    subject?: string;
    content: string;
    isFromUser: boolean;
    readAt?: string;
    createdAt: string;
}

export interface InteractionLog {
    id: string;
    supplierId: string;
    userId: string;
    user?: { id: string; name: string; email: string };
    eventType: string;
    title: string;
    description?: string;
    eventDate: string;
    createdAt: string;
}

export interface RequestItem {
    id: string;
    requestId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

export interface PurchaseRequest {
    id: string;
    requesterId: string;
    requester?: User;
    status: RequestStatus;
    totalAmount: number;
    reason?: string;
    createdAt: string;
    updatedAt: string;
    items: RequestItem[];
    approverId?: string;
    approver?: User;
    supplierId?: string;
    supplier?: Supplier;
    categoryId?: string;
    category?: { id: string; name: string };
    budgetCategory?: string;
    deliveryLocation?: string;
    expectedDeliveryDate?: string;
}

export interface PurchaseOrder {
    id: string;
    requestId: string;
    request?: PurchaseRequest;
    supplierId: string;
    supplier?: Supplier;
    status: OrderStatus;
    totalAmount: number;
    issuedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Contract {
    id: string;
    title: string;
    contractNumber?: string;
    supplierId: string;
    supplier?: Supplier;
    startDate: string;
    endDate: string;
    totalValue: number;
    currency: string;
    paymentTerms?: string;
    autoRenew: boolean;
    description?: string;
    status: ContractStatus;
    daysUntilExpiry?: number;
    createdAt: string;
    updatedAt: string;
}

export interface AuditLog {
    id: string;
    userId: string;
    user?: User;
    action: string;
    resource: string;
    details?: string;
    createdAt: string;
}

// API Request/Response Types
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
    department?: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface CreateRequestInput {
    reason?: string;
    supplierId?: string;
    budgetCategory?: string;
    categoryId?: string;
    deliveryLocation?: string;
    expectedDeliveryDate?: string;
    items: {
        description: string;
        quantity: number;
        unitPrice: number;
    }[];
}

export interface UpdateRequestStatusInput {
    status: RequestStatus;
}

export interface CreateOrderInput {
    requestId: string;
    supplierId: string;
    totalAmount: number;
}

export interface CreateContractInput {
    title: string;
    supplierId: string;
    startDate: string;
    endDate: string;
    totalValue: number;
    paymentTerms?: string;
    autoRenew: boolean;
    description?: string;
    status: ContractStatus;
}

export interface UpdateOrderStatusInput {
    status: OrderStatus;
}

export interface CreateSupplierInput {
    name: string;
    category: string;
    status?: string;
    contactName?: string;
    contactEmail?: string;
    logoUrl?: string;
}

export interface UpdateSupplierInput extends Partial<CreateSupplierInput> { }

export interface UpdateSupplierDetailsInput {
    name?: string;
    category?: string;
    status?: string;
    contactName?: string;
    contactEmail?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    paymentTerms?: string;
    paymentMethod?: string;
    internalNotes?: string;
    logoUrl?: string;
}

export interface CreateMessageInput {
    subject?: string;
    content: string;
    isFromUser?: boolean;
}

export interface CreateInteractionInput {
    eventType: string;
    title: string;
    description?: string;
    eventDate: string;
}

export interface AddDocumentInput {
    title: string;
    type: string;
    url: string;
    expiryDate?: string;
}

export interface UpdateUserInput {
    name?: string;
    email?: string;
    department?: string;
    role?: string;
}

export interface KPIMetrics {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    totalOrders: number;
    totalSpend: number;
    departmentSpend?: Record<string, number>;
    avgProcessingTime?: number;
}

export interface MonthlySpendData {
    month: string;
    spend: number;
    requestCount: number;
}

export interface ApiError {
    error: string;
    message?: string;
    details?: any;
}

// Backend API Models
export const Role = {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    APPROVER: 'APPROVER',
    REQUESTER: 'REQUESTER',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const RequestStatus = {
    DRAFT: 'DRAFT',
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
} as const;

export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export const OrderStatus = {
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    PARTIAL: 'PARTIAL',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export interface User {
    id: string;
    email: string;
    name: string;
    role: Role;
    department?: string;
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
    role?: Role;
    department?: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface CreateRequestInput {
    reason?: string;
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

export interface UpdateUserInput {
    name?: string;
    email?: string;
    role?: Role;
    department?: string;
}

export interface KPIMetrics {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    totalOrders: number;
    totalSpend: number;
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

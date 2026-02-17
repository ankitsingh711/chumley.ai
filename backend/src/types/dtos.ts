// Supplier DTOs
export interface SupplierListDTO {
    id: string;
    name: string;
    category: string;
    status: string;
    contactEmail: string | null;
    contactName: string | null;
    logoUrl: string | null;
    createdAt: Date;
    activeOrdersCount: number;
    totalSpend: number;
    lastOrderDate: Date | null;
}

export interface SupplierDetailDTO extends SupplierListDTO {
    details?: {
        phone: string | null;
        address: string | null;
        city: string | null;
        paymentTerms: string | null;
        rating: number | null;
        reviewCount: number | null;
    };
    stats: {
        activeOrders: number;
        totalSpend: number;
    };
}

// Request DTOs
export interface RequestListDTO {
    id: string;
    requesterId: string;
    requesterName: string;
    status: string;
    totalAmount: number;
    reason: string | null;
    createdAt: Date;
    updatedAt: Date;
    itemCount: number;
    supplier: {
        id: string;
        name: string;
    } | null;
}

// Order DTOs
export interface OrderListDTO {
    id: string;
    requestId: string;
    supplierId: string;
    supplierName: string;
    requesterName: string;
    status: string;
    totalAmount: number;
    issuedAt: Date | null;
    createdAt: Date;
}

// Contract DTOs
export interface ContractListDTO {
    id: string;
    contractNumber: string;
    title: string;
    supplierId: string;
    supplierName: string;
    status: string;
    startDate: Date;
    endDate: Date;
    totalValue: number;
    currency: string;
    daysUntilExpiry: number;
}

// User DTOs
export interface UserListDTO {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    departmentId: string | null;
    departmentName: string | null;
    createdAt: Date;
}

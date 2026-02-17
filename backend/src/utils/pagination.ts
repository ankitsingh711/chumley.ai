import { Request } from 'express';

export interface PaginationParams {
    page: number;
    limit: number;
    skip: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

/**
 * Extract and validate pagination parameters from request query
 * @param req Express request object
 * @param defaultLimit Default number of items per page (default: 20)
 * @param maxLimit Maximum allowed limit (default: 100)
 */
export function getPaginationParams(
    req: Request,
    defaultLimit: number = 20,
    maxLimit: number = 100
): PaginationParams {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
        maxLimit,
        Math.max(1, parseInt(req.query.limit as string) || defaultLimit)
    );
    const skip = (page - 1) * limit;

    return { page, limit, skip };
}

/**
 * Create a paginated response object
 * @param data Array of data items
 * @param total Total count of items
 * @param page Current page number
 * @param limit Items per page
 */
export function createPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
): PaginatedResponse<T> {
    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}

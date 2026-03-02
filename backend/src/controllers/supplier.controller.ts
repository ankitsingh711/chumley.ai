import { Request, Response } from 'express';
import { Prisma, RequestStatus, UserRole, NotificationType, UserStatus } from '@prisma/client';
import { randomUUID, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import Logger from '../utils/logger';
import prisma from '../config/db';
import { getPaginationParams, createPaginatedResponse, PaginatedResponse } from '../utils/pagination';
import { CacheService } from '../utils/cache';
import emailService from '../services/email.service';


const createSupplierSchema = z.object({
    name: z.string().min(2),
    contactEmail: z.string().email(),
    contactName: z.string().min(1),
    phone: z.string().min(1),
    address: z.string().min(1),
    category: z.string().min(1),
    logoUrl: z.string().optional(),
});

const updateSupplierSchema = createSupplierSchema.partial();

const SUPPLIER_MESSAGE_MEDIA = ['PORTAL', 'EMAIL', 'SMS', 'WHATSAPP', 'PHONE', 'OTHER'] as const;
type SupplierMessageMedium = (typeof SUPPLIER_MESSAGE_MEDIA)[number];

const MESSAGE_USER_SELECT = {
    id: true,
    name: true,
    email: true,
} as const;

const FULL_MESSAGE_SELECT = {
    id: true,
    supplierId: true,
    userId: true,
    subject: true,
    content: true,
    medium: true,
    isFromUser: true,
    fromAddress: true,
    toAddress: true,
    source: true,
    channelMessageId: true,
    metadata: true,
    receivedAt: true,
    readAt: true,
    createdAt: true,
    user: {
        select: MESSAGE_USER_SELECT,
    },
} as const;

const LEGACY_MESSAGE_SELECT = {
    id: true,
    supplierId: true,
    userId: true,
    subject: true,
    content: true,
    isFromUser: true,
    readAt: true,
    createdAt: true,
    user: {
        select: MESSAGE_USER_SELECT,
    },
} as const;

let loggedMessageSchemaMismatchWarning = false;

const isMessageSchemaMismatchError = (error: unknown): boolean => {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2022: Column does not exist, P2021: Table does not exist
        if (error.code === 'P2022' || error.code === 'P2021') {
            return true;
        }
    }

    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            (message.includes('column') && message.includes('does not exist') && message.includes('medium')) ||
            (message.includes('unknown column') && message.includes('medium')) ||
            (message.includes('message.') && message.includes('does not exist'))
        );
    }

    return false;
};

const logMessageSchemaMismatchWarning = () => {
    if (loggedMessageSchemaMismatchWarning) return;
    loggedMessageSchemaMismatchWarning = true;
    Logger.warn(
        'Message table is missing new columns. Running in backward-compatible mode. Apply Prisma schema changes to enable full message channel metadata.'
    );
};

const normalizeLegacyMessage = (
    message: {
        id: string;
        supplierId: string;
        userId: string;
        subject: string | null;
        content: string;
        isFromUser: boolean;
        readAt: Date | null;
        createdAt: Date;
        user: { id: string; name: string; email: string } | null;
    },
    overrides?: {
        medium?: SupplierMessageMedium;
        fromAddress?: string | null;
        toAddress?: string | null;
        source?: string | null;
        channelMessageId?: string | null;
        metadata?: Prisma.InputJsonValue | null;
        receivedAt?: Date | null;
    }
) => ({
    ...message,
    medium: overrides?.medium || (message.isFromUser ? 'EMAIL' : 'PORTAL'),
    fromAddress: overrides?.fromAddress || null,
    toAddress: overrides?.toAddress || null,
    source: overrides?.source || null,
    channelMessageId: overrides?.channelMessageId || null,
    metadata: overrides?.metadata || null,
    receivedAt: overrides?.receivedAt || null,
});

type InboundReplyRoutingConfig = {
    mode: 'domain' | 'mailbox';
    domain: string;
    mailboxLocalPart?: string;
    prefix: string;
};

const getInboundReplyRoutingConfig = (): InboundReplyRoutingConfig | null => {
    const rawTarget = process.env.SUPPLIER_INBOUND_REPLY_DOMAIN?.trim().toLowerCase();
    if (!rawTarget) return null;

    const prefix = (process.env.SUPPLIER_INBOUND_REPLY_PREFIX || 'supplier-reply').trim().toLowerCase();
    if (!prefix) return null;

    // Supports either:
    // 1) Domain mode: "aspect.co.uk"
    // 2) Mailbox mode: "ankit.singh@aspect.co.uk"
    if (rawTarget.includes('@')) {
        const [mailboxLocalPart, domain] = rawTarget.split('@');
        if (!mailboxLocalPart || !domain) return null;
        return { mode: 'mailbox', mailboxLocalPart, domain, prefix };
    }

    return { mode: 'domain', domain: rawTarget, prefix };
};

const getSupplierReplyAddress = (supplierId: string, userId: string, fallbackReplyTo: string) => {
    const routingConfig = getInboundReplyRoutingConfig();
    if (!routingConfig) {
        return fallbackReplyTo;
    }

    if (routingConfig.mode === 'mailbox' && routingConfig.mailboxLocalPart) {
        return `${routingConfig.mailboxLocalPart}+${routingConfig.prefix}+${supplierId}+${userId}@${routingConfig.domain}`;
    }

    return `${routingConfig.prefix}+${supplierId}+${userId}@${routingConfig.domain}`;
};

const extractEmailAddress = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match ? match[0].toLowerCase() : null;
};

const parseReplyRoutingAddress = (rawRecipient: string | null | undefined) => {
    const routingConfig = getInboundReplyRoutingConfig();
    if (!rawRecipient || !routingConfig) return null;

    const candidates = rawRecipient.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
    for (const candidate of candidates) {
        const email = candidate.toLowerCase();
        const [localPart, emailDomain] = email.split('@');
        if (!localPart || !emailDomain) continue;
        if (emailDomain !== routingConfig.domain) continue;

        const parts = localPart.split('+');
        // Domain mode: supplier-reply+supplierId+userId@domain
        if (parts.length >= 3 && parts[0] === routingConfig.prefix) {
            const supplierId = parts[1];
            const userId = parts[2];
            if (supplierId && userId) {
                return {
                    supplierId,
                    userId,
                    toAddress: email,
                };
            }
        }

        // Mailbox mode: local+supplier-reply+supplierId+userId@domain
        if (
            routingConfig.mode === 'mailbox' &&
            routingConfig.mailboxLocalPart &&
            parts.length >= 4 &&
            parts[0] === routingConfig.mailboxLocalPart &&
            parts[1] === routingConfig.prefix
        ) {
            const supplierId = parts[2];
            const userId = parts[3];
            if (supplierId && userId) {
                return {
                    supplierId,
                    userId,
                    toAddress: email,
                };
            }
        }
    }

    return null;
};

const getWebhookSecretFromRequest = (req: Request) => {
    const headerSecret = req.headers['x-webhook-secret'];
    if (typeof headerSecret === 'string') return headerSecret;

    const querySecret = req.query.secret;
    if (typeof querySecret === 'string') return querySecret;

    return null;
};

const isValidWebhookSecret = (providedSecret: string, configuredSecret: string): boolean => {
    const provided = Buffer.from(providedSecret);
    const configured = Buffer.from(configuredSecret);

    if (provided.length !== configured.length) {
        return false;
    }

    return timingSafeEqual(provided, configured);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const parseJsonRecord = (value: string): Record<string, unknown> | null => {
    const trimmed = value.trim();
    if (!(trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        return null;
    }

    try {
        const parsed = JSON.parse(trimmed);
        return isRecord(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

type SupplierAccessUser = {
    id: string;
    role: UserRole | string;
    departmentId?: string | null;
};

const isSupplierManagerRole = (role: UserRole | string): boolean =>
    role === UserRole.SYSTEM_ADMIN ||
    role === UserRole.SENIOR_MANAGER ||
    role === UserRole.MANAGER;

const getSupplierReadWhere = (supplierId: string, user: SupplierAccessUser): Prisma.SupplierWhereInput => {
    if (user.role === UserRole.SYSTEM_ADMIN) {
        return { id: supplierId };
    }

    const accessScopes: Prisma.SupplierWhereInput[] = [{ requesterId: user.id }];
    if (user.departmentId) {
        accessScopes.push({
            departments: {
                some: {
                    id: user.departmentId,
                },
            },
        });
    }

    return {
        id: supplierId,
        OR: accessScopes,
    };
};

const getSupplierManageWhere = (supplierId: string, user: SupplierAccessUser): Prisma.SupplierWhereInput | null => {
    if (user.role === UserRole.SYSTEM_ADMIN) {
        return { id: supplierId };
    }

    if (!isSupplierManagerRole(user.role) || !user.departmentId) {
        return null;
    }

    return {
        id: supplierId,
        departments: {
            some: {
                id: user.departmentId,
            },
        },
    };
};

const extractFirstString = (value: unknown, depth = 0): string | undefined => {
    if (depth > 5 || value === null || typeof value === 'undefined') {
        return undefined;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed : undefined;
    }

    if (Array.isArray(value)) {
        for (const entry of value) {
            const extracted = extractFirstString(entry, depth + 1);
            if (extracted) return extracted;
        }
        return undefined;
    }

    if (isRecord(value)) {
        const preferredKeys = [
            'email',
            'Email',
            'address',
            'Address',
            'value',
            'Value',
            'raw',
            'Raw',
            'text',
            'Text',
            'content',
            'Content',
            'name',
            'Name',
            'full',
            'Full',
        ];

        for (const key of preferredKeys) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                const extracted = extractFirstString(value[key], depth + 1);
                if (extracted) return extracted;
            }
        }

        for (const entry of Object.values(value)) {
            const extracted = extractFirstString(entry, depth + 1);
            if (extracted) return extracted;
        }
    }

    return undefined;
};

const pickString = (payload: Record<string, unknown>, keys: string[]): string | undefined => {
    const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
    const queue: unknown[] = [payload];
    const visited = new Set<unknown>();

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current || typeof current !== 'object') {
            continue;
        }

        if (visited.has(current)) {
            continue;
        }
        visited.add(current);

        if (Array.isArray(current)) {
            for (const entry of current) {
                if (typeof entry === 'string') {
                    const parsed = parseJsonRecord(entry);
                    if (parsed) {
                        queue.push(parsed);
                    }
                } else if (typeof entry === 'object' && entry !== null) {
                    queue.push(entry);
                }
            }
            continue;
        }

        for (const [key, rawValue] of Object.entries(current as Record<string, unknown>)) {
            if (normalizedKeys.has(key.toLowerCase())) {
                const extracted = extractFirstString(rawValue);
                if (extracted) {
                    return extracted;
                }
            }

            if (typeof rawValue === 'string') {
                const parsed = parseJsonRecord(rawValue);
                if (parsed) {
                    queue.push(parsed);
                }
            } else if (typeof rawValue === 'object' && rawValue !== null) {
                queue.push(rawValue);
            }
        }
    }

    return undefined;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractHeaderValue = (headersRaw: string | undefined, headerNames: string[]): string | undefined => {
    if (!headersRaw) return undefined;

    const unfoldedHeaders = headersRaw.replace(/\r?\n[ \t]+/g, ' ');
    for (const headerName of headerNames) {
        const regex = new RegExp(`^${escapeRegex(headerName)}:\\s*(.+)$`, 'im');
        const match = unfoldedHeaders.match(regex);
        if (match?.[1]?.trim()) {
            return match[1].trim();
        }
    }

    return undefined;
};

const normalizeInboundEmailPayload = (payload: Record<string, unknown>) => {
    const fromRaw = pickString(payload, [
        'from',
        'sender',
        'From',
        'from_email',
        'fromEmail',
        'return-path',
    ]);
    const toRaw = pickString(payload, [
        'to',
        'recipient',
        'To',
        'envelope_to',
        'original-recipient',
        'Delivered-To',
        'delivered-to',
        'x-original-to',
        'mail_to',
    ]);
    const subject = pickString(payload, ['subject', 'Subject']) || undefined;
    const textContent = pickString(payload, [
        'text',
        'body-plain',
        'stripped-text',
        'TextBody',
        'content',
        'textbody',
        'body_text',
    ]);
    const htmlContent = pickString(payload, ['html', 'body-html', 'HtmlBody', 'body_html']);
    const source = pickString(payload, ['source', 'provider', 'event', 'eventType']) || 'EMAIL_WEBHOOK';
    const channelMessageId =
        pickString(payload, ['messageId', 'message-id', 'Message-Id', 'MessageID', 'message_id']) || undefined;
    const headersRaw = pickString(payload, ['headers', 'Headers', 'message-headers', 'MessageHeaders']);

    const headerFrom = extractHeaderValue(headersRaw, ['From']);
    const headerTo = extractHeaderValue(headersRaw, ['To', 'Delivered-To', 'X-Original-To', 'Original-Recipient']);
    const headerSubject = extractHeaderValue(headersRaw, ['Subject']);
    const headerMessageId = extractHeaderValue(headersRaw, ['Message-Id']);

    const resolvedFromRaw = fromRaw || headerFrom;
    const resolvedToRaw = toRaw || headerTo;
    const resolvedSubject = subject || headerSubject || undefined;
    const resolvedChannelMessageId = channelMessageId || headerMessageId || undefined;

    return {
        fromAddress: extractEmailAddress(resolvedFromRaw) || resolvedFromRaw || undefined,
        toAddress: resolvedToRaw,
        subject: resolvedSubject,
        content: textContent || htmlContent || '',
        source,
        channelMessageId: resolvedChannelMessageId,
        rawPayload: payload,
    };
};

const createLegacyMessageUsingRaw = async (
    input: {
        supplierId: string;
        userId: string;
        subject?: string | null;
        content: string;
        isFromUser: boolean;
        createdAt?: Date;
    },
    user: { id: string; name: string; email: string } | null
) => {
    const id = randomUUID();
    const createdAt = input.createdAt || new Date();

    await prisma.$executeRawUnsafe(
        'INSERT INTO `Message` (`id`,`supplierId`,`userId`,`subject`,`content`,`isFromUser`,`createdAt`) VALUES (?,?,?,?,?,?,?)',
        id,
        input.supplierId,
        input.userId,
        input.subject || null,
        input.content,
        input.isFromUser ? 1 : 0,
        createdAt
    );

    return {
        id,
        supplierId: input.supplierId,
        userId: input.userId,
        subject: input.subject || null,
        content: input.content,
        isFromUser: input.isFromUser,
        readAt: null,
        createdAt,
        user,
    };
};

const createInboundMessageWithFallback = async (
    input: {
        supplierId: string;
        userId: string;
        subject?: string;
        content: string;
        medium: SupplierMessageMedium;
        fromAddress?: string | null;
        toAddress?: string | null;
        source?: string | null;
        channelMessageId?: string | null;
        metadata?: Prisma.InputJsonValue;
        receivedAt: Date;
    },
    actorUser: { id: string; name: string; email: string }
) => {
    try {
        return await prisma.message.create({
            data: {
                supplierId: input.supplierId,
                userId: input.userId,
                subject: input.subject,
                content: input.content,
                isFromUser: false,
                medium: input.medium,
                fromAddress: input.fromAddress || null,
                toAddress: input.toAddress || null,
                source: input.source || null,
                channelMessageId: input.channelMessageId || null,
                metadata: input.metadata,
                receivedAt: input.receivedAt,
            },
            select: FULL_MESSAGE_SELECT,
        });
    } catch (error) {
        if (!isMessageSchemaMismatchError(error)) {
            throw error;
        }

        logMessageSchemaMismatchWarning();
        const legacyMessage = await createLegacyMessageUsingRaw(
            {
                supplierId: input.supplierId,
                userId: input.userId,
                subject: input.subject,
                content: input.content,
                isFromUser: false,
                createdAt: input.receivedAt,
            },
            actorUser
        );

        return normalizeLegacyMessage(legacyMessage, {
            medium: input.medium,
            fromAddress: input.fromAddress || null,
            toAddress: input.toAddress || null,
            source: input.source || null,
            channelMessageId: input.channelMessageId || null,
            metadata: input.metadata || null,
            receivedAt: input.receivedAt,
        });
    }
};

export const getSuppliers = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        const { page, limit, skip } = getPaginationParams(req);

        // Build cache key based on user and pagination
        const cacheKey = `suppliers:list:${user?.id}:page${page}:limit${limit}`;

        // Try cache first
        const cached = await CacheService.get<PaginatedResponse<any>>(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        let whereClause: any = {
            status: { not: 'Rejected' }
        };

        if (user && user.role !== UserRole.SYSTEM_ADMIN) {
            Logger.info(`getSuppliers: Filtering for user ${user.id} (${user.role})`);
            const fullUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { departmentId: true }
            });

            Logger.info(`getSuppliers: Found departmentId: ${fullUser?.departmentId}`);

            if (fullUser?.departmentId) {
                whereClause = {
                    ...whereClause,
                    departments: {
                        some: {
                            id: fullUser.departmentId
                        }
                    }
                };
            } else {
                if (user.role !== UserRole.SYSTEM_ADMIN) {
                    // Force empty if no dept & not admin
                    whereClause = {
                        ...whereClause,
                        departments: {
                            some: {
                                id: "non-existent-id"
                            }
                        }
                    };
                }
            }
            Logger.info(`getSuppliers: Applied whereClause: ${JSON.stringify(whereClause)}`);
        } else {
            Logger.info(`getSuppliers: No filtering (System Admin or no user)`);
        }

        // Get total count and paginated data in parallel
        const [suppliers, total] = await Promise.all([
            prisma.supplier.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    category: true,
                    status: true,
                    contactEmail: true,
                    contactName: true,
                    logoUrl: true,
                    createdAt: true,
                    // Use aggregations for counts/sums
                    _count: {
                        select: { orders: true }
                    },
                    orders: {
                        where: { status: { notIn: ['CANCELLED', 'COMPLETED'] } },
                        select: { id: true }
                    },
                    departments: { select: { id: true, name: true } }
                }
            }),
            prisma.supplier.count({ where: whereClause })
        ]);

        // Get stats in batch using aggregation
        const supplierIds = suppliers.map(s => s.id);
        const orderStats = await prisma.purchaseOrder.groupBy({
            by: ['supplierId'],
            where: {
                supplierId: { in: supplierIds },
                status: { not: 'CANCELLED' }
            },
            _sum: { totalAmount: true },
            _max: { createdAt: true }
        });

        // Create stats map for O(1) lookup
        const statsMap = new Map(
            orderStats.map(stat => [
                stat.supplierId,
                {
                    totalSpend: Number(stat._sum.totalAmount || 0),
                    lastOrderDate: stat._max.createdAt
                }
            ])
        );

        // Transform to lean DTO
        const suppliersDTO = suppliers.map(supplier => {
            const stats = statsMap.get(supplier.id) || { totalSpend: 0, lastOrderDate: null };

            return {
                id: supplier.id,
                name: supplier.name,
                category: supplier.category,
                status: supplier.status,
                contactEmail: supplier.contactEmail,
                contactName: supplier.contactName,
                logoUrl: supplier.logoUrl,
                createdAt: supplier.createdAt,
                activeOrdersCount: supplier.orders.length,
                totalSpend: stats.totalSpend,
                lastOrderDate: stats.lastOrderDate,
            };
        });

        const response = createPaginatedResponse(suppliersDTO, total, page, limit);

        // Cache for 10 minutes
        await CacheService.set(cacheKey, response, 600);

        res.json(response);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getSupplierById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const user = req.user!;
        const supplier = await prisma.supplier.findFirst({
            where: getSupplierReadWhere(id, user),
            include: {
                orders: true,
                requests: {
                    where: { status: { not: RequestStatus.IN_PROGRESS } },
                    orderBy: { createdAt: 'desc' },
                    take: 20
                }
            },
        });

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        // Calculate detailed stats on the fly
        const s = supplier as any;
        const activeOrders = s.orders ? s.orders.filter((o: any) =>
            o.status !== 'CANCELLED' && o.status !== 'COMPLETED'
        ).length : 0;

        const totalSpend = supplier.orders.reduce((acc, curr) => {
            return curr.status !== 'CANCELLED' ? acc + Number(curr.totalAmount) : acc;
        }, 0);

        res.json({
            ...supplier,
            stats: {
                activeOrders,
                totalSpend,
            }
        });
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const createSupplier = async (req: Request, res: Response) => {
    try {
        const validatedData = createSupplierSchema.parse(req.body);
        const user = req.user!;

        // Members can only submit supplier requests.
        // Managers, Senior Managers, and System Admin can add suppliers directly.
        const isMemberRequest = user.role === UserRole.MEMBER;
        const status = isMemberRequest ? 'Review Pending' : 'Active';

        // Fetch full user to get department
        const fullUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { departmentId: true, role: true, name: true }
        });

        const { phone, address, ...supplierData } = validatedData;

        const supplier = await prisma.supplier.create({
            data: {
                ...supplierData,
                status,
                requesterId: isMemberRequest ? user.id : undefined,
                departments: fullUser?.departmentId ? {
                    connect: { id: fullUser.departmentId }
                } : undefined,
                details: {
                    create: {
                        phone,
                        address
                    }
                }
            },
        });

        // For member requests, notify approvers (manager/senior manager/system admin).
        if (isMemberRequest) {
            // Find all active admins and relevant approvers for the requester's department.
            // This includes:
            // 1) Primary role as MANAGER/SENIOR_MANAGER in the same department
            // 2) Additional department roles as MANAGER/SENIOR_MANAGER
            // 3) All SYSTEM_ADMIN users
            Logger.info(`createSupplier: Fetching recipients. User Dept: ${fullUser?.departmentId}`);

            const recipientQuery: Prisma.UserFindManyArgs = {
                where: {
                    id: { not: user.id },
                    status: UserStatus.ACTIVE,
                    OR: [
                        { role: UserRole.SYSTEM_ADMIN },
                        ...(fullUser?.departmentId
                            ? [
                                {
                                    role: { in: [UserRole.SENIOR_MANAGER, UserRole.MANAGER] },
                                    departmentId: fullUser.departmentId,
                                },
                                {
                                    additionalRoles: {
                                        some: {
                                            departmentId: fullUser.departmentId,
                                            role: { in: [UserRole.SENIOR_MANAGER, UserRole.MANAGER] },
                                        },
                                    },
                                },
                            ]
                            : []),
                    ],
                },
                select: { id: true, email: true, role: true },
            };

            Logger.info(`createSupplier: Recipient query: ${JSON.stringify(recipientQuery)}`);

            const recipients = await prisma.user.findMany(recipientQuery);

            Logger.info(`createSupplier: Found ${recipients.length} recipients: ${recipients.map(r => `${r.email} (${r.role})`).join(', ')}`);

            // Create notifications for recipients
            if (recipients.length > 0) {
                await prisma.notification.createMany({
                    data: recipients.map(recipient => ({
                        userId: recipient.id,
                        type: NotificationType.SUPPLIER_REQUEST,
                        title: 'New Supplier Request',
                        message: `${user.name} has requested to add a new supplier: ${supplier.name}`,
                        metadata: { supplierId: supplier.id, requesterId: user.id },
                    })),
                });
            }
        }

        // Invalidate cache
        await CacheService.invalidateSupplierCache();

        Logger.info(`Supplier created: ${supplier.name} with status ${status}`);
        res.status(201).json(supplier);
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const approveSupplier = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const user = req.user!;

        if (
            user.role !== UserRole.SYSTEM_ADMIN &&
            user.role !== UserRole.SENIOR_MANAGER &&
            user.role !== UserRole.MANAGER
        ) {
            return res.status(403).json({ error: 'Insufficient permissions to approve suppliers' });
        }

        let supplierScope: { id: string; name: string; requesterId: string | null } | null = null;

        if (user.role === UserRole.SYSTEM_ADMIN) {
            supplierScope = await prisma.supplier.findUnique({
                where: { id },
                select: { id: true, name: true, requesterId: true },
            });
            if (!supplierScope) {
                return res.status(404).json({ error: 'Supplier not found' });
            }
        } else {
            const fullUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { departmentId: true },
            });

            if (!fullUser?.departmentId) {
                return res.status(403).json({ error: 'User does not belong to a department' });
            }

            supplierScope = await prisma.supplier.findFirst({
                where: {
                    id,
                    departments: {
                        some: {
                            id: fullUser.departmentId,
                        },
                    },
                },
                select: { id: true, name: true, requesterId: true },
            });

            if (!supplierScope) {
                return res.status(403).json({ error: 'Insufficient permissions to approve suppliers outside your department' });
            }
        }

        const supplier = await prisma.supplier.update({
            where: { id: supplierScope.id },
            data: { status: 'Standard' }, // Default to Standard upon approval
        });

        // Notify requester if exists
        if (supplier.requesterId) {
            await prisma.notification.create({
                data: {
                    userId: supplier.requesterId,
                    type: NotificationType.REQUEST_APPROVED,
                    title: 'Supplier Request Approved',
                    message: `Your request to add supplier ${supplier.name} has been approved.`,
                    metadata: { supplierId: supplier.id },
                },
            });
        }

        // Invalidate cache
        await CacheService.invalidateSupplierCache(id);
        await CacheService.invalidateRequestCache();

        Logger.info(`Supplier approved: ${id} by ${user.id}`);
        res.json(supplier);
    } catch (error: any) {
        Logger.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const rejectSupplier = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const user = req.user!;

        if (
            user.role !== UserRole.SYSTEM_ADMIN &&
            user.role !== UserRole.SENIOR_MANAGER &&
            user.role !== UserRole.MANAGER
        ) {
            return res.status(403).json({ error: 'Insufficient permissions to reject suppliers' });
        }

        let supplierScope: { id: string; name: string; requesterId: string | null } | null = null;

        if (user.role === UserRole.SYSTEM_ADMIN) {
            supplierScope = await prisma.supplier.findUnique({
                where: { id },
                select: { id: true, name: true, requesterId: true },
            });
            if (!supplierScope) {
                return res.status(404).json({ error: 'Supplier not found' });
            }
        } else {
            const fullUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { departmentId: true },
            });

            if (!fullUser?.departmentId) {
                return res.status(403).json({ error: 'User does not belong to a department' });
            }

            supplierScope = await prisma.supplier.findFirst({
                where: {
                    id,
                    departments: {
                        some: {
                            id: fullUser.departmentId,
                        },
                    },
                },
                select: { id: true, name: true, requesterId: true },
            });

            if (!supplierScope) {
                return res.status(403).json({ error: 'Insufficient permissions to reject suppliers outside your department' });
            }
        }

        // We can either delete it or mark as rejected. Let's mark as rejected for record.
        const supplier = await prisma.supplier.update({
            where: { id: supplierScope.id },
            data: { status: 'Rejected' },
        });

        // Notify requester if exists
        if (supplier.requesterId) {
            await prisma.notification.create({
                data: {
                    userId: supplier.requesterId,
                    type: NotificationType.REQUEST_REJECTED,
                    title: 'Supplier Request Rejected',
                    message: `Your request to add supplier ${supplier.name} has been rejected.`,
                    metadata: { supplierId: supplier.id },
                },
            });
        }

        // Invalidate cache
        await CacheService.invalidateSupplierCache(id);
        await CacheService.invalidateRequestCache();

        Logger.info(`Supplier rejected: ${id} by ${user.id}`);
        res.json(supplier);
    } catch (error: any) {
        Logger.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateSupplier = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const validatedData = updateSupplierSchema.parse(req.body);
        const user = req.user!;
        const manageWhere = getSupplierManageWhere(id, user);

        if (!manageWhere) {
            return res.status(403).json({ error: 'Insufficient permissions to update suppliers' });
        }

        const supplierScope = await prisma.supplier.findFirst({
            where: manageWhere,
            select: { id: true },
        });

        if (!supplierScope) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        const supplier = await prisma.supplier.update({
            where: { id: supplierScope.id },
            data: validatedData,
        });

        // Invalidate cache
        await CacheService.invalidateSupplierCache(id);

        Logger.info(`Supplier updated: ${id}`);
        res.json(supplier);
    } catch (error: any) {
        Logger.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteSupplier = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const user = req.user!;
        const manageWhere = getSupplierManageWhere(id, user);

        if (!manageWhere) {
            return res.status(403).json({ error: 'Insufficient permissions to delete suppliers' });
        }

        const supplierScope = await prisma.supplier.findFirst({
            where: manageWhere,
            select: { id: true },
        });

        if (!supplierScope) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        await prisma.supplier.delete({
            where: { id: supplierScope.id },
        });

        // Invalidate cache
        await CacheService.invalidateSupplierCache(id);

        Logger.info(`Supplier deleted: ${id}`);
        res.status(204).send();
    } catch (error: any) {
        Logger.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Get supplier with full details
export const getSupplierDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const user = req.user!;
        const supplier = await prisma.supplier.findFirst({
            where: getSupplierReadWhere(id, user),
            include: {
                details: true,
                documents: true,
                orders: true,
                requests: {
                    where: { status: { not: RequestStatus.IN_PROGRESS } },
                    orderBy: { createdAt: 'desc' },
                    take: 20
                }
            },
        });

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        const s = supplier as any;
        const activeOrders = s.orders ? s.orders.filter((o: any) =>
            o.status !== 'CANCELLED' && o.status !== 'COMPLETED'
        ).length : 0;

        const totalSpend = s.orders ? s.orders.reduce((acc: number, curr: any) => {
            return curr.status !== 'CANCELLED' ? acc + Number(curr.totalAmount) : acc;
        }, 0) : 0;

        res.json({
            ...supplier,
            stats: {
                activeOrders,
                totalSpend,
            }
        });
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Update supplier details
const updateSupplierDetailsSchema = z.object({
    name: z.string().min(2).optional(),
    category: z.string().optional(),
    status: z.string().optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional(),
    logoUrl: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
    paymentTerms: z.string().optional(),
    paymentMethod: z.string().optional(),
    internalNotes: z.string().optional(),
    deliveryDelayAverage: z.number().optional(),
    qualityScore: z.number().optional(),
    communicationScore: z.number().optional(),
});

export const updateSupplierDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const validatedData = updateSupplierDetailsSchema.parse(req.body);
        const user = req.user!;
        const manageWhere = getSupplierManageWhere(id, user);

        if (!manageWhere) {
            return res.status(403).json({ error: 'Insufficient permissions to update supplier details' });
        }

        const supplierScope = await prisma.supplier.findFirst({
            where: manageWhere,
            select: { id: true },
        });

        if (!supplierScope) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        // Extract base supplier fields
        const { name, category, status, contactName, contactEmail, logoUrl, ...detailsFields } = validatedData;

        // Update supplier base fields
        const supplierUpdateData: any = {};
        if (name !== undefined) supplierUpdateData.name = name;
        if (category !== undefined) supplierUpdateData.category = category;
        if (status !== undefined) supplierUpdateData.status = status;
        if (contactName !== undefined) supplierUpdateData.contactName = contactName;
        if (contactEmail !== undefined) supplierUpdateData.contactEmail = contactEmail;
        if (logoUrl !== undefined) supplierUpdateData.logoUrl = logoUrl;

        const supplier = await prisma.supplier.update({
            where: { id: supplierScope.id },
            data: supplierUpdateData,
            include: { details: true }
        });

        // Update or create supplier details
        if (Object.keys(detailsFields).length > 0) {
            await prisma.supplierDetails.upsert({
                where: { supplierId: supplierScope.id },
                create: {
                    supplierId: supplierScope.id,
                    ...detailsFields,
                },
                update: detailsFields,
            });
        }

        // Fetch updated data
        const updatedSupplier = await prisma.supplier.findUnique({
            where: { id: supplierScope.id },
            include: { details: true }
        });

        Logger.info(`Supplier details updated: ${id}`);
        res.json(updatedSupplier);
    } catch (error: any) {
        Logger.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Get supplier messages
export const getSupplierMessages = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const user = req.user!;

        const supplierScope = await prisma.supplier.findFirst({
            where: getSupplierReadWhere(id, user),
            select: { id: true },
        });

        if (!supplierScope) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        try {
            const messages = await prisma.message.findMany({
                where: { supplierId: supplierScope.id },
                select: FULL_MESSAGE_SELECT,
                orderBy: { createdAt: 'asc' },
            });
            return res.json(messages);
        } catch (error) {
            if (!isMessageSchemaMismatchError(error)) {
                throw error;
            }

            logMessageSchemaMismatchWarning();

            const messages = await prisma.message.findMany({
                where: { supplierId: supplierScope.id },
                select: LEGACY_MESSAGE_SELECT,
                orderBy: { createdAt: 'asc' },
            });

            return res.json(messages.map((message) => normalizeLegacyMessage(message)));
        }
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Send supplier message
const sendMessageSchema = z.object({
    subject: z.string().trim().max(255).optional(),
    content: z.string().trim().min(1).max(10000),
    isFromUser: z.boolean().default(true), // kept for backward compatibility with existing clients
    medium: z.enum(SUPPLIER_MESSAGE_MEDIA).optional(),
});

const receiveMessageSchema = z.object({
    subject: z.string().trim().max(255).optional(),
    content: z.string().trim().min(1).max(10000),
    medium: z.enum(SUPPLIER_MESSAGE_MEDIA).default('EMAIL'),
    fromAddress: z.string().trim().max(320).optional(),
    toAddress: z.string().trim().max(320).optional(),
    source: z.string().trim().max(64).optional(),
    channelMessageId: z.string().trim().max(255).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    receivedAt: z.string().datetime().optional(),
});

export const sendSupplierMessage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const validatedData = sendMessageSchema.parse(req.body);
        const userId = req.user!.id;
        const senderEmail = req.user?.email || '';

        const [supplier, sender] = await Promise.all([
            prisma.supplier.findFirst({
                where: getSupplierReadWhere(id, req.user!),
                select: { id: true, name: true, contactEmail: true },
            }),
            prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true, email: true },
            }),
        ]);

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        if (!sender) {
            return res.status(404).json({ error: 'Sender not found' });
        }

        const medium: SupplierMessageMedium = validatedData.medium || (supplier.contactEmail ? 'EMAIL' : 'PORTAL');

        if (medium === 'EMAIL' && !supplier.contactEmail) {
            return res.status(400).json({ error: 'Supplier does not have a contact email. Choose another medium.' });
        }

        let deliveryStatus: 'SENT' | 'FAILED' | 'SKIPPED' = 'SKIPPED';
        let deliveryError: string | undefined;
        let providerMessageId: string | undefined;

        if (medium === 'EMAIL' && supplier.contactEmail) {
            const replyToAddress = getSupplierReplyAddress(supplier.id, sender.id, sender.email);
            const result = await emailService.sendSupplierConversationEmail({
                supplierEmail: supplier.contactEmail,
                supplierName: supplier.name,
                senderName: sender.name,
                senderEmail: sender.email,
                replyToAddress,
                subject: validatedData.subject,
                content: validatedData.content,
                medium,
            });

            deliveryStatus = result.sent ? 'SENT' : 'FAILED';
            deliveryError = result.error;
            providerMessageId = result.providerMessageId;
        }

        const messageMetadata = {
            deliveryStatus,
            ...(deliveryError ? { deliveryError } : {}),
        } as Prisma.InputJsonValue;

        let message: any;
        try {
            message = await prisma.message.create({
                data: {
                    supplierId: id,
                    userId,
                    subject: validatedData.subject,
                    content: validatedData.content,
                    isFromUser: true,
                    medium,
                    fromAddress: senderEmail || sender.email,
                    toAddress: medium === 'EMAIL' ? supplier.contactEmail : null,
                    source: medium === 'EMAIL' ? 'SMTP' : 'PORTAL',
                    channelMessageId: providerMessageId,
                    metadata: messageMetadata,
                },
                select: FULL_MESSAGE_SELECT,
            });
        } catch (error) {
            if (!isMessageSchemaMismatchError(error)) {
                throw error;
            }

            logMessageSchemaMismatchWarning();

            const legacyMessage = await createLegacyMessageUsingRaw(
                {
                    supplierId: id,
                    userId,
                    subject: validatedData.subject,
                    content: validatedData.content,
                    isFromUser: true,
                },
                sender
            );

            message = normalizeLegacyMessage(legacyMessage, {
                medium,
                fromAddress: senderEmail || sender.email,
                toAddress: medium === 'EMAIL' ? supplier.contactEmail : null,
                source: medium === 'EMAIL' ? 'SMTP' : 'PORTAL',
                channelMessageId: providerMessageId || null,
                metadata: messageMetadata,
            });
        }

        // Log interaction for timeline
        await prisma.interactionLog.create({
            data: {
                supplierId: id,
                userId,
                eventType: medium === 'EMAIL' ? 'email_sent' : 'message_sent',
                title: medium === 'EMAIL' ? 'Email Sent to Supplier' : 'Message Sent',
                description: `Subject: ${validatedData.subject || 'No Subject'} • Medium: ${medium} • Delivery: ${deliveryStatus}`,
                eventDate: new Date(),
            },
        });

        Logger.info(`Message sent to supplier ${id} by user ${userId}`);
        res.status(201).json(message);
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Receive supplier message from email or any external medium
export const receiveSupplierMessage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const validatedData = receiveMessageSchema.parse(req.body);
        const userId = req.user!.id;

        const [supplier, actorUser] = await Promise.all([
            prisma.supplier.findFirst({
                where: getSupplierReadWhere(id, req.user!),
                select: {
                    id: true,
                    name: true,
                    contactEmail: true,
                },
            }),
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            }),
        ]);

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        if (!actorUser) {
            return res.status(404).json({ error: 'Sender not found' });
        }

        const receivedAt = validatedData.receivedAt ? new Date(validatedData.receivedAt) : new Date();
        const fromAddress = validatedData.fromAddress || supplier.contactEmail || null;
        const toAddress = validatedData.toAddress || actorUser.email || null;
        const source = validatedData.source || validatedData.medium;
        const inboundMetadata = {
            ...(validatedData.metadata || {}),
            ingestedByUserId: userId,
        } as Prisma.InputJsonValue;

        const message = await createInboundMessageWithFallback(
            {
                supplierId: id,
                userId,
                subject: validatedData.subject,
                content: validatedData.content,
                medium: validatedData.medium,
                fromAddress,
                toAddress,
                source,
                channelMessageId: validatedData.channelMessageId || null,
                metadata: inboundMetadata,
                receivedAt,
            },
            actorUser
        );

        await prisma.interactionLog.create({
            data: {
                supplierId: id,
                userId,
                eventType: 'message_received',
                title: `${validatedData.medium} Message Received`,
                description: `From: ${message.fromAddress || 'Unknown'}${message.subject ? ` • Subject: ${message.subject}` : ''}`,
                eventDate: message.receivedAt || new Date(),
            },
        });

        Logger.info(`Inbound message recorded for supplier ${id} by user ${userId}`);
        res.status(201).json(message);
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Public webhook endpoint for inbound supplier email replies
export const receiveSupplierEmailReplyWebhook = async (req: Request, res: Response) => {
    try {
        const configuredSecret = process.env.SUPPLIER_INBOUND_WEBHOOK_SECRET;
        if (configuredSecret) {
            const providedSecret = getWebhookSecretFromRequest(req);
            if (!providedSecret || !isValidWebhookSecret(providedSecret, configuredSecret)) {
                return res.status(401).json({ error: 'Invalid webhook secret' });
            }
        } else if (process.env.NODE_ENV === 'production') {
            Logger.error('SUPPLIER_INBOUND_WEBHOOK_SECRET is missing in production');
            return res.status(503).json({ error: 'Webhook endpoint is not configured' });
        }

        const payload = (typeof req.body === 'object' && req.body ? req.body : {}) as Record<string, unknown>;
        const normalized = normalizeInboundEmailPayload(payload);
        const normalizedSubject = normalized.subject?.trim().slice(0, 255);
        const normalizedContent = normalized.content.trim().slice(0, 10000);

        if (!normalizedContent) {
            return res.status(400).json({ error: 'Inbound email payload is missing content' });
        }

        const routing = parseReplyRoutingAddress(normalized.toAddress);
        if (!routing) {
            return res.status(400).json({
                error: 'Unable to map recipient to supplier conversation',
                hint: 'Ensure SUPPLIER_INBOUND_REPLY_DOMAIN is configured and Reply-To uses either supplier-reply+supplierId+userId@domain or mailbox+supplier-reply+supplierId+userId@domain',
            });
        }

        const [supplier, routedUser] = await Promise.all([
            prisma.supplier.findUnique({
                where: { id: routing.supplierId },
                select: { id: true, name: true, contactEmail: true },
            }),
            prisma.user.findUnique({
                where: { id: routing.userId },
                select: { id: true, name: true, email: true },
            }),
        ]);

        if (!supplier || !routedUser) {
            return res.status(404).json({ error: 'Supplier or routed user not found for inbound reply' });
        }

        const receivedAt = new Date();
        const message = await createInboundMessageWithFallback(
            {
                supplierId: supplier.id,
                userId: routedUser.id,
                subject: normalizedSubject,
                content: normalizedContent,
                medium: 'EMAIL',
                fromAddress: normalized.fromAddress || supplier.contactEmail || null,
                toAddress: routing.toAddress,
                source: normalized.source || 'EMAIL_WEBHOOK',
                channelMessageId: normalized.channelMessageId || null,
                metadata: {
                    providerPayload: payload,
                    ingestedBy: 'supplier_email_webhook',
                } as Prisma.InputJsonValue,
                receivedAt,
            },
            routedUser
        );

        await prisma.interactionLog.create({
            data: {
                supplierId: supplier.id,
                userId: routedUser.id,
                eventType: 'email_reply_received',
                title: 'Supplier Email Reply Received',
                description: `From: ${normalized.fromAddress || 'Unknown'}${normalizedSubject ? ` • Subject: ${normalizedSubject}` : ''}`,
                eventDate: receivedAt,
            },
        });

        await prisma.notification.create({
            data: {
                userId: routedUser.id,
                type: NotificationType.SYSTEM_ALERT,
                title: 'Supplier Reply Received',
                message: normalized.subject
                    ? `${supplier.name} replied: ${normalized.subject}`
                    : `${supplier.name} replied to your email conversation.`,
                metadata: {
                    supplierId: supplier.id,
                    messageId: message.id,
                    medium: 'EMAIL',
                    fromAddress: normalized.fromAddress || supplier.contactEmail || null,
                } as Prisma.InputJsonValue,
            },
        });

        Logger.info(`Inbound supplier email processed for supplier ${supplier.id}, user ${routedUser.id}`);
        return res.status(201).json({ success: true, messageId: message.id });
    } catch (error) {
        Logger.error(error);
        return res.status(500).json({ error: 'Failed to process inbound supplier email webhook' });
    }
};

// Get supplier interactions
export const getSupplierInteractions = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const user = req.user!;

        const supplierScope = await prisma.supplier.findFirst({
            where: getSupplierReadWhere(id, user),
            select: { id: true },
        });

        if (!supplierScope) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        const interactions = await prisma.interactionLog.findMany({
            where: { supplierId: supplierScope.id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            },
            orderBy: { eventDate: 'desc' }
        });

        res.json(interactions);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Create supplier interaction
const createInteractionSchema = z.object({
    eventType: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    eventDate: z.string().datetime(),
});

export const createSupplierInteraction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const validatedData = createInteractionSchema.parse(req.body);
        const userId = req.user!.id;
        const supplierScope = await prisma.supplier.findFirst({
            where: getSupplierReadWhere(id, req.user!),
            select: { id: true },
        });

        if (!supplierScope) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        const interaction = await prisma.interactionLog.create({
            data: {
                supplierId: supplierScope.id,
                userId,
                eventType: validatedData.eventType,
                title: validatedData.title,
                description: validatedData.description,
                eventDate: new Date(validatedData.eventDate),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            }
        });

        Logger.info(`Interaction logged for supplier ${id} by user ${userId}`);
        res.status(201).json(interaction);
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
// Add Document
const addDocumentSchema = z.object({
    title: z.string().min(1),
    type: z.string().min(1),
    url: z.string().url(),
    expiryDate: z.string().optional(), // ISO string
});

export const addSupplierDocument = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const validatedData = addDocumentSchema.parse(req.body);
        const user = req.user!;
        const manageWhere = getSupplierManageWhere(id, user);

        if (!manageWhere) {
            return res.status(403).json({ error: 'Insufficient permissions to add supplier documents' });
        }

        const supplierScope = await prisma.supplier.findFirst({
            where: manageWhere,
            select: { id: true },
        });

        if (!supplierScope) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        // Determine status
        let status = 'Valid';
        if (validatedData.expiryDate) {
            const expiry = new Date(validatedData.expiryDate);
            const now = new Date();
            const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (daysUntilExpiry < 0) status = 'Expired';
            else if (daysUntilExpiry < 30) status = 'Expiring Soon';
        }

        const document = await prisma.supplierDocument.create({
            data: {
                supplierId: supplierScope.id,
                title: validatedData.title,
                type: validatedData.type,
                url: validatedData.url,
                expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : null,
                status
            }
        });

        Logger.info(`Document added for supplier ${id}: ${document.title}`);
        res.status(201).json(document);
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const addReviewSchema = z.object({
    rating: z.number().min(1).max(5),
    comment: z.string().min(1),
});

export const addSupplierReview = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const validatedData = addReviewSchema.parse(req.body);
        const userId = req.user!.id;
        const supplierScope = await prisma.supplier.findFirst({
            where: getSupplierReadWhere(id, req.user!),
            select: { id: true },
        });

        if (!supplierScope) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        const review = await prisma.review.create({
            data: {
                supplierId: supplierScope.id,
                userId,
                rating: validatedData.rating,
                comment: validatedData.comment,
            },
            include: { user: { select: { id: true, name: true } } }
        });

        const aggregations = await prisma.review.aggregate({
            where: { supplierId: supplierScope.id },
            _avg: { rating: true },
            _count: { _all: true },
        });

        const newRating = aggregations._avg.rating || 0;
        const newCount = aggregations._count._all || 0;

        await prisma.supplierDetails.upsert({
            where: { supplierId: supplierScope.id },
            create: {
                supplierId: supplierScope.id,
                rating: newRating,
                reviewCount: newCount,
            },
            update: {
                rating: newRating,
                reviewCount: newCount,
            },
        });

        Logger.info(`Review added for supplier ${id} by user ${userId}`);
        res.status(201).json(review);
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getSupplierReviews = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 5;
        const skip = (page - 1) * limit;
        const supplierScope = await prisma.supplier.findFirst({
            where: getSupplierReadWhere(id, req.user!),
            select: { id: true },
        });

        if (!supplierScope) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        const [reviews, total] = await Promise.all([
            prisma.review.findMany({
                where: { supplierId: supplierScope.id },
                include: { user: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.review.count({ where: { supplierId: supplierScope.id } }),
        ]);

        res.json({
            data: reviews,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        });
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

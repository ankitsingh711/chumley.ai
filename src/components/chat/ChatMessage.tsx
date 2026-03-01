import { useState, useRef, memo } from 'react';
import { Bot, User as UserIcon, Upload, Loader2, Paperclip, Sparkles } from 'lucide-react';
import { uploadApi } from '../../services/upload.service';
import { requestsApi } from '../../services/requests.service';
import type { Attachment } from '../../types/api';
import { format } from 'date-fns';

export interface ChatMessageProps {
    message: {
        id: string;
        text: string;
        sender: 'user' | 'bot';
        timestamp: Date;
        type?: 'text' | 'requests_list' | 'contracts_list' | 'spend_summary' | 'request_detail' | 'orders_list' | 'suppliers_list' | 'overview';
        data?: unknown;
        attachment?: {
            name: string;
            url: string;
        };
    };
}

interface OverviewData {
    totalRequests?: number;
    totalOrders?: number;
    suppliersInScope?: number;
    expiringContracts?: number;
}

interface RequestListRow {
    id: string;
    status?: string;
    createdAt?: string;
}

interface ContractListRow {
    id: string;
    title: string;
    endDate?: string;
    supplier?: {
        name?: string;
    };
}

interface OrderListRow {
    id: string;
    status?: string;
    supplierName?: string;
    totalAmount?: number;
    createdAt?: string;
}

interface SupplierListRow {
    id: string;
    name: string;
    status?: string;
    category?: string;
    contactEmail?: string;
}

interface SpendSummaryData {
    totalSpent?: number;
    remaining?: number;
    percentUsed?: number;
}

interface RequestItemData {
    id: string;
    description?: string;
    totalPrice?: number;
    quantity?: number;
    unitPrice?: number;
}

interface RequestDetailData {
    id: string;
    status?: string;
    totalAmount?: number;
    createdAt?: string;
    requester?: {
        name?: string;
        email?: string;
    };
    reason?: string;
    items?: RequestItemData[];
    attachments?: Attachment[];
}

export const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
    const [requestData, setRequestData] = useState<RequestDetailData | null>(() => {
        if (message.type !== 'request_detail') return null;
        if (!message.data || typeof message.data !== 'object') return null;
        return message.data as RequestDetailData;
    });
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isBot = message.sender === 'bot';

    const getStatusClasses = (status?: string) => {
        switch (status) {
            case 'APPROVED':
                return 'bg-emerald-100 text-emerald-700';
            case 'PENDING':
                return 'bg-amber-100 text-amber-700';
            case 'IN_PROGRESS':
                return 'bg-sky-100 text-sky-700';
            case 'SENT':
                return 'bg-indigo-100 text-indigo-700';
            case 'PARTIAL':
                return 'bg-violet-100 text-violet-700';
            case 'COMPLETED':
                return 'bg-emerald-100 text-emerald-700';
            case 'ACTIVE':
                return 'bg-emerald-100 text-emerald-700';
            case 'PREFERRED':
            case 'STANDARD':
            case 'VERIFIED':
                return 'bg-emerald-100 text-emerald-700';
            case 'DRAFT':
                return 'bg-slate-100 text-slate-700';
            case 'CANCELLED':
            case 'CANCELED':
                return 'bg-rose-100 text-rose-700';
            default:
                return 'bg-rose-100 text-rose-700';
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !requestData?.id) return;

        setUploading(true);
        try {
            const url = await uploadApi.uploadFile(file);
            const attachment = await requestsApi.addAttachment(requestData.id, {
                filename: file.name,
                fileUrl: url,
                fileSize: file.size,
                mimeType: file.type
            });

            setRequestData((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    attachments: [...(prev.attachments || []), attachment]
                };
            });
        } catch (error) {
            console.error('Upload failed', error);
        } finally {
            setUploading(false);
        }
    };

    const formatDateLabel = (value?: string) => value ? new Date(value).toLocaleDateString() : 'N/A';

    const renderContent = () => {
        switch (message.type) {
            case 'overview': {
                const overview: OverviewData = message.data && typeof message.data === 'object'
                    ? message.data as OverviewData
                    : {};

                return (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                            <p className="text-slate-500">Requests</p>
                            <p className="font-semibold text-slate-900">{overview.totalRequests ?? 0}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                            <p className="text-slate-500">Orders</p>
                            <p className="font-semibold text-slate-900">{overview.totalOrders ?? 0}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                            <p className="text-slate-500">Suppliers</p>
                            <p className="font-semibold text-slate-900">{overview.suppliersInScope ?? 0}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                            <p className="text-slate-500">Expiring Contracts</p>
                            <p className="font-semibold text-slate-900">{overview.expiringContracts ?? 0}</p>
                        </div>
                    </div>
                );
            }

            case 'requests_list': {
                const requestRows: RequestListRow[] = Array.isArray(message.data) ? message.data as RequestListRow[] : [];
                return (
                    <div className="mt-3 space-y-2">
                        {requestRows.map((req) => (
                            <div key={req.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-xs transition-colors hover:bg-slate-100">
                                <div>
                                    <div className="mb-1.5 flex items-start justify-between gap-2">
                                        <p className="font-semibold text-slate-900">Request #{req.id.slice(0, 8)}</p>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusClasses(req.status)}`}>
                                            {req.status || 'Unknown'}
                                        </span>
                                    </div>
                                    <p className="text-slate-500">{formatDateLabel(req.createdAt)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            }

            case 'contracts_list': {
                const contractRows: ContractListRow[] = Array.isArray(message.data) ? message.data as ContractListRow[] : [];
                return (
                    <div className="mt-3 space-y-2">
                        {contractRows.map((contract) => (
                            <div key={contract.id} className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-xs transition-colors hover:bg-slate-100">
                                <p className="truncate font-semibold text-slate-900">{contract.title}</p>
                                <div className="mt-1 flex justify-between text-slate-500">
                                    <span>{contract.supplier?.name || 'Unknown supplier'}</span>
                                    <span>Exp: {formatDateLabel(contract.endDate)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            }

            case 'orders_list': {
                const orderRows: OrderListRow[] = Array.isArray(message.data) ? message.data as OrderListRow[] : [];
                return (
                    <div className="mt-3 space-y-2">
                        {orderRows.map((order) => (
                            <div key={order.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-xs transition-colors hover:bg-slate-100">
                                <div className="mb-1.5 flex items-start justify-between gap-2">
                                    <p className="font-semibold text-slate-900">Order #{order.id.slice(0, 8)}</p>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusClasses(order.status)}`}>
                                        {String(order.status || 'Unknown').replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-500">
                                    <span>{order.supplierName || 'Unknown supplier'}</span>
                                    <span>£{Number(order.totalAmount || 0).toLocaleString()}</span>
                                </div>
                                <p className="mt-1 text-slate-500">{formatDateLabel(order.createdAt)}</p>
                            </div>
                        ))}
                    </div>
                );
            }

            case 'suppliers_list': {
                const supplierRows: SupplierListRow[] = Array.isArray(message.data) ? message.data as SupplierListRow[] : [];
                return (
                    <div className="mt-3 space-y-2">
                        {supplierRows.map((supplier) => (
                            <div key={supplier.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-xs transition-colors hover:bg-slate-100">
                                <div className="mb-1.5 flex items-start justify-between gap-2">
                                    <p className="font-semibold text-slate-900">{supplier.name}</p>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusClasses(String(supplier.status || '').toUpperCase())}`}>
                                        {supplier.status || 'Unknown'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-500">
                                    <span>{supplier.category || 'Uncategorized'}</span>
                                    <span className="max-w-[140px] truncate">{supplier.contactEmail || 'No email'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            }

            case 'spend_summary': {
                const summary: SpendSummaryData = message.data && typeof message.data === 'object'
                    ? message.data as SpendSummaryData
                    : {};
                const totalSpent = Number(summary.totalSpent || 0);
                const remaining = Number(summary.remaining || 0);
                const percentUsed = Number(summary.percentUsed || 0);

                return (
                    <div className="mt-3 rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50/90 to-sky-50 p-3">
                        <div className="mb-2 flex items-end justify-between">
                            <span className="text-xs font-medium text-slate-600">Budget Used</span>
                            <span className="text-xs font-bold text-slate-900">{percentUsed}%</span>
                        </div>
                        <div className="mb-2 h-1.5 w-full rounded-full bg-slate-200">
                            <div
                                className={`h-1.5 rounded-full ${percentUsed > 90 ? 'bg-rose-500' : 'bg-primary-600'}`}
                                style={{ width: `${Math.min(percentUsed, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs">
                            <div>
                                <p className="text-slate-500">Spent</p>
                                <p className="font-semibold text-slate-900">£{totalSpent.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-slate-500">Remaining</p>
                                <p className="font-semibold text-emerald-600">£{remaining.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                );
            }

            case 'request_detail': {
                const request = requestData;
                if (!request) return null;

                const requestStatus = String(request.status || 'PENDING');

                return (
                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
                            <span className="text-xs font-semibold text-slate-900">Request #{request.id.slice(0, 8)}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusClasses(requestStatus)}`}>
                                {requestStatus.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <div className="p-3">
                            <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <p className="text-slate-500">Total Amount</p>
                                    <p className="font-semibold text-slate-900">£{Number(request.totalAmount || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Date</p>
                                    <p className="font-medium text-slate-900">{formatDateLabel(request.createdAt)}</p>
                                </div>
                                {request.requester && (
                                    <div className="col-span-2">
                                        <p className="text-slate-500">Requested By</p>
                                        <p className="font-medium text-slate-900">{request.requester.name} <span className="text-slate-400">({request.requester.email})</span></p>
                                    </div>
                                )}
                            </div>

                            {request.reason && (
                                <div className="mb-3 text-xs">
                                    <p className="mb-1 text-slate-500">Reason</p>
                                    <p className="rounded border border-slate-200 bg-slate-50 p-2 italic text-slate-700">{request.reason}</p>
                                </div>
                            )}

                            {request.items && request.items.length > 0 && (
                                <div className="mb-3">
                                    <p className="mb-2 text-xs font-medium text-slate-500">Items</p>
                                    <div className="space-y-2">
                                        {request.items.map((item) => (
                                            <div key={item.id} className="border-b border-slate-100 pb-2 text-xs last:border-0 last:pb-0">
                                                <div className="flex justify-between font-medium">
                                                    <span className="text-slate-900">{item.description}</span>
                                                    <span>£{Number(item.totalPrice || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="mt-0.5 flex justify-between text-slate-500">
                                                    <span>Qty: {item.quantity || 0}</span>
                                                    <span>@ £{Number(item.unitPrice || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Attachments Section */}
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-xs font-medium text-slate-500">Documents</p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="flex items-center text-[10px] font-medium text-primary-700 transition-colors hover:text-primary-800"
                                    >
                                        {uploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />}
                                        {uploading ? 'Uploading...' : 'Upload'}
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                </div>

                                {request.attachments && request.attachments.length > 0 ? (
                                    <div className="space-y-1">
                                        {request.attachments.map((att: Attachment) => (
                                            <a
                                                key={att.id}
                                                href={att.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group flex items-center rounded-lg border border-transparent bg-slate-50 p-2 transition-colors hover:border-slate-200 hover:bg-slate-100"
                                            >
                                                <Paperclip className="mr-2 h-3 w-3 text-slate-400 transition-colors group-hover:text-primary-600" />
                                                <span className="flex-1 truncate text-xs text-slate-700">{att.filename}</span>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded border border-dashed border-slate-200 bg-slate-50 py-2 text-center">
                                        <p className="text-[10px] text-slate-400">No documents attached</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            }

            default:
                return null;
        }
    };

    return (
        <div className={`flex w-full items-end gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}>
            {isBot && (
                <div className="relative flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-2xl bg-gradient-to-br from-primary-100 to-sky-100 text-primary-700 ring-1 ring-primary-200/60">
                    <Bot className="h-[18px] w-[18px]" />
                    <Sparkles className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-white p-0.5 text-primary-600 ring-1 ring-primary-200" />
                </div>
            )}

            <div className={`flex max-w-[89%] flex-col ${isBot ? 'items-start' : 'items-end'}`}>
                <div
                    className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${isBot
                        ? 'rounded-bl-md border border-slate-200 bg-white/95 text-slate-800 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.6)]'
                        : 'rounded-br-md bg-gradient-to-br from-primary-700 via-primary-600 to-indigo-600 text-white shadow-[0_16px_32px_-24px_rgba(30,64,175,0.95)]'
                        }`}
                >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    {message.attachment && (
                        <a
                            href={message.attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-2 flex items-center gap-2 rounded-lg p-2 text-xs ${isBot ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-white/20 text-white hover:bg-white/30'}`}
                        >
                            <Paperclip className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{message.attachment.name}</span>
                        </a>
                    )}
                    {isBot && renderContent()}
                </div>
                <span className="mt-1 text-[10px] text-slate-400">
                    {format(message.timestamp, 'HH:mm')}
                </span>
            </div>

            {!isBot && (
                <div className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-2xl bg-slate-200 text-slate-700 ring-1 ring-slate-300">
                    <UserIcon className="h-4 w-4" />
                </div>
            )}
        </div>
    );
});

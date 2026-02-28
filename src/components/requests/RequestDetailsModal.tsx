import { createPortal } from 'react-dom';
import {
    X,
    Check,
    ShoppingBag,
    ReceiptText,
    ExternalLink,
    Package,
    UserRound,
    CalendarDays,
    Truck,
    Info,
    Paperclip,
    CircleAlert,
    Wallet,
    ListChecks,
    Download,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { type PurchaseRequest, RequestStatus } from '../../types/api';

interface RequestDetailsModalProps {
    request: PurchaseRequest | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusUpdate?: (id: string, status: RequestStatus) => void;
    onCreateOrder?: (request: PurchaseRequest) => void;
    onDownloadPDF?: (request: PurchaseRequest) => void;
    onNavigateToSupplier?: (request: PurchaseRequest) => void;
    getSupplierBlockReason?: (request: PurchaseRequest) => string;
    isSupplierApprovalBlocked?: (request: PurchaseRequest) => boolean;
    isUpdating?: boolean;
    canApprove?: boolean;
}

const formatCurrency = (value: number) =>
    `£${Number(value || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

const formatDateTime = (value?: string) => {
    if (!value) return 'Not specified';
    return new Date(value).toLocaleString('en-GB');
};

const formatDate = (value?: string) => {
    if (!value) return 'Not specified';
    return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getStatusLabel = (status: RequestStatus) =>
    status === RequestStatus.IN_PROGRESS ? 'In Progress' : status.replace(/_/g, ' ');

const getStatusClasses = (status: RequestStatus) => {
    switch (status) {
        case RequestStatus.APPROVED:
            return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
        case RequestStatus.REJECTED:
            return 'border border-rose-200 bg-rose-50 text-rose-700';
        case RequestStatus.PENDING:
            return 'border border-amber-200 bg-amber-50 text-amber-700';
        case RequestStatus.IN_PROGRESS:
            return 'border border-sky-200 bg-sky-50 text-sky-700';
        default:
            return 'border border-gray-200 bg-gray-100 text-gray-700';
    }
};

const getDepartmentName = (department: unknown) => {
    if (!department) return 'Unassigned';
    if (typeof department === 'string') return department;
    if (typeof department === 'object' && department !== null && 'name' in department && typeof department.name === 'string') {
        return department.name;
    }
    return 'Unassigned';
};

const getInitials = (value?: string) => {
    if (!value) return '??';
    return value
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

export function RequestDetailsModal({
    request,
    isOpen,
    onClose,
    onStatusUpdate,
    onCreateOrder,
    onDownloadPDF,
    onNavigateToSupplier,
    getSupplierBlockReason,
    isSupplierApprovalBlocked,
    isUpdating = false,
    canApprove = false,
}: RequestDetailsModalProps) {
    if (!isOpen || !request) return null;

    const blockReason = getSupplierBlockReason?.(request) || '';
    const approvalBlocked = isSupplierApprovalBlocked?.(request) || false;
    const requesterName = request.requester?.name || 'Unknown';
    const supplierName = request.supplier?.name || 'Not assigned';
    const totalItems = request.items?.length || 0;
    const hasAttachments = Boolean(request.attachments && request.attachments.length > 0);

    return createPortal(
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="relative border-b border-gray-100 bg-gradient-to-r from-white via-primary-50/50 to-accent-50/40 px-5 py-4 sm:px-6">
                    <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary-200/30 blur-2xl" />
                    <div className="relative flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700">Purchase Request</p>
                            <h2 className="mt-1 text-3xl font-bold text-gray-900">#{request.id.slice(0, 8)}</h2>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusClasses(request.status)}`}>
                                    {getStatusLabel(request.status)}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
                                    <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                                    Submitted {formatDateTime(request.createdAt)}
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:bg-gray-50"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </header>

                <main className="space-y-6 overflow-y-auto p-5 sm:p-6">
                    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <article className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Amount</p>
                            <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(request.totalAmount)}</p>
                            <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
                                <Wallet className="h-3.5 w-3.5" />
                                Commercial value
                            </p>
                        </article>

                        <article className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Requested Items</p>
                            <p className="mt-2 text-2xl font-bold text-gray-900">{totalItems}</p>
                            <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
                                <ListChecks className="h-3.5 w-3.5" />
                                Distinct line items
                            </p>
                        </article>

                        <article className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Requester</p>
                            <p className="mt-2 text-lg font-semibold text-gray-900">{requesterName}</p>
                            <p className="mt-1 text-xs text-gray-500">{getDepartmentName(request.requester?.department)}</p>
                        </article>

                        <article className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Supplier</p>
                            <p className="mt-2 text-lg font-semibold text-gray-900">{supplierName}</p>
                            <p className="mt-1 text-xs text-gray-500">{request.supplier?.status || 'No supplier status'}</p>
                        </article>
                    </section>

                    <section className="grid gap-6 xl:grid-cols-3">
                        <div className="space-y-6 xl:col-span-2">
                            <section className="rounded-xl border border-gray-200 bg-white p-4">
                                <h3 className="text-base font-semibold text-gray-900">Requested Items</h3>
                                <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Description</th>
                                                <th className="px-3 py-2 text-center">Qty</th>
                                                <th className="px-3 py-2 text-right">Unit Price</th>
                                                <th className="px-3 py-2 text-right">Line Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {request.items?.map((item, index) => (
                                                <tr key={`${item.description}-${index}`}>
                                                    <td className="px-3 py-2.5 text-gray-800">{item.description}</td>
                                                    <td className="px-3 py-2.5 text-center text-gray-700">{item.quantity}</td>
                                                    <td className="px-3 py-2.5 text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
                                                    <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                                                        {formatCurrency(item.quantity * item.unitPrice)}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!request.items || request.items.length === 0) && (
                                                <tr>
                                                    <td colSpan={4} className="px-3 py-5 text-center text-sm text-gray-500">
                                                        No line items provided.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="rounded-xl border border-gray-200 bg-white p-4">
                                <h3 className="text-base font-semibold text-gray-900">Request Context</h3>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    <article className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reason</p>
                                        <p className="mt-1 text-sm text-gray-700">{request.reason || 'No reason provided'}</p>
                                    </article>
                                    <article className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Budget Category</p>
                                        <p className="mt-1 text-sm text-gray-700">{request.budgetCategory || 'Not specified'}</p>
                                    </article>
                                    <article className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Catalog Category</p>
                                        <p className="mt-1 text-sm text-gray-700">{request.category?.name || 'Not specified'}</p>
                                    </article>
                                    <article className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Branch</p>
                                        <p className="mt-1 text-sm text-gray-700">{request.branch || 'Not specified'}</p>
                                    </article>
                                </div>
                            </section>

                            <section className="rounded-xl border border-gray-200 bg-white p-4">
                                <h3 className="text-base font-semibold text-gray-900">Logistics</h3>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    <article className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery Location</p>
                                        <p className="mt-1 text-sm text-gray-700">{request.deliveryLocation || 'Not specified'}</p>
                                    </article>
                                    <article className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Expected Delivery</p>
                                        <p className="mt-1 text-sm text-gray-700">{formatDate(request.expectedDeliveryDate)}</p>
                                    </article>
                                </div>
                            </section>

                            <section className="rounded-xl border border-gray-200 bg-white p-4">
                                <h3 className="text-base font-semibold text-gray-900">Attachments</h3>
                                {hasAttachments ? (
                                    <div className="mt-3 space-y-2">
                                        {request.attachments?.map((attachment) => (
                                            <a
                                                key={attachment.id}
                                                href={attachment.fileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm transition hover:border-primary-200 hover:bg-primary-50/20"
                                            >
                                                <span className="inline-flex min-w-0 items-center gap-2">
                                                    <Paperclip className="h-4 w-4 text-gray-400" />
                                                    <span className="truncate text-gray-700">{attachment.filename}</span>
                                                </span>
                                                <ExternalLink className="h-4 w-4 text-gray-400" />
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-2 text-sm text-gray-500">No attachments uploaded.</p>
                                )}
                            </section>
                        </div>

                        <aside className="space-y-6">
                            <section className="rounded-xl border border-gray-200 bg-white p-4">
                                <h3 className="text-base font-semibold text-gray-900">Requester</h3>
                                <div className="mt-3 flex items-start gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-700 text-sm font-semibold text-white">
                                        {getInitials(request.requester?.name)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-gray-900">{request.requester?.name || 'Unknown'}</p>
                                        <p className="truncate text-sm text-gray-500">{request.requester?.email || 'No email available'}</p>
                                        <p className="mt-1 text-xs text-gray-500">Department: {getDepartmentName(request.requester?.department)}</p>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-xl border border-gray-200 bg-white p-4">
                                <h3 className="text-base font-semibold text-gray-900">Supplier</h3>
                                {request.supplier ? (
                                    <>
                                        <div className="mt-3 flex items-start gap-3">
                                            {request.supplier.logoUrl ? (
                                                <img
                                                    src={request.supplier.logoUrl}
                                                    alt={request.supplier.name}
                                                    className="h-10 w-10 rounded-full border border-gray-200 object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                                                    {getInitials(request.supplier.name)}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-gray-900">{request.supplier.name}</p>
                                                <p className="truncate text-sm text-gray-500">{request.supplier.category || 'General Supplier'}</p>
                                                <p className="mt-1 text-xs text-gray-500">Status: {request.supplier.status || 'Unknown'}</p>
                                                {request.supplier.contactEmail && (
                                                    <p className="truncate text-xs text-primary-700">{request.supplier.contactEmail}</p>
                                                )}
                                            </div>
                                        </div>

                                        {onNavigateToSupplier && request.supplierId && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onNavigateToSupplier(request)}
                                                className="mt-3 w-full"
                                            >
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                Open Supplier Profile
                                            </Button>
                                        )}
                                    </>
                                ) : (
                                    <div className="mt-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
                                        Supplier not assigned yet.
                                    </div>
                                )}
                            </section>

                            <section className="rounded-xl border border-gray-200 bg-white p-4">
                                <h3 className="text-base font-semibold text-gray-900">Workflow</h3>
                                <div className="mt-3 space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1 text-gray-500">
                                            <Info className="h-3.5 w-3.5" />
                                            Current Status
                                        </span>
                                        <span className="font-semibold text-gray-900">{getStatusLabel(request.status)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1 text-gray-500">
                                            <UserRound className="h-3.5 w-3.5" />
                                            Approver
                                        </span>
                                        <span className="font-semibold text-gray-900">{request.approver?.name || 'Not assigned'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1 text-gray-500">
                                            <Truck className="h-3.5 w-3.5" />
                                            Purchase Order
                                        </span>
                                        <span className="font-semibold text-gray-900">{request.order ? 'Created' : 'Not created'}</span>
                                    </div>
                                </div>
                            </section>
                        </aside>
                    </section>

                    {canApprove && onStatusUpdate && (request.status === RequestStatus.PENDING || request.status === RequestStatus.IN_PROGRESS) && (
                        <section className="rounded-xl border border-gray-200 bg-white p-4">
                            <h3 className="text-base font-semibold text-gray-900">Approval Decision</h3>

                            {approvalBlocked ? (
                                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                    <p className="inline-flex items-start gap-2">
                                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                                        <span>{blockReason || 'Supplier status must be approved before this request can be approved.'}</span>
                                    </p>
                                    {onNavigateToSupplier && request.supplierId && (
                                        <Button
                                            variant="outline"
                                            onClick={() => onNavigateToSupplier(request)}
                                            className="mt-3 border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                                        >
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Review Supplier
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Button
                                        onClick={() => {
                                            onStatusUpdate(request.id, RequestStatus.APPROVED);
                                            onClose();
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                        disabled={isUpdating}
                                    >
                                        <Check className="mr-2 h-4 w-4" />
                                        Approve Request
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            onStatusUpdate(request.id, RequestStatus.REJECTED);
                                            onClose();
                                        }}
                                        variant="outline"
                                        className="border-rose-300 text-rose-700 hover:bg-rose-50"
                                        disabled={isUpdating}
                                    >
                                        <X className="mr-2 h-4 w-4" />
                                        Reject Request
                                    </Button>
                                </div>
                            )}
                        </section>
                    )}
                </main>

                <footer className="sticky bottom-0 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
                    <div className="flex flex-wrap justify-end gap-2">
                        {onDownloadPDF && (
                            <Button variant="outline" onClick={() => onDownloadPDF(request)}>
                                <Download className="mr-2 h-4 w-4" />
                                Download PDF
                            </Button>
                        )}

                        {request.status === RequestStatus.APPROVED && onCreateOrder && (
                            request.order ? (
                                <Button className="bg-emerald-600 hover:bg-emerald-700" disabled>
                                    <ReceiptText className="mr-2 h-4 w-4" />
                                    Purchase Order Created
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => onCreateOrder(request)}
                                    className="bg-primary-700 hover:bg-primary-800"
                                    disabled={isUpdating}
                                >
                                    <ShoppingBag className="mr-2 h-4 w-4" />
                                    Create Purchase Order
                                </Button>
                            )
                        )}

                        <Button variant="ghost" onClick={onClose}>
                            <Package className="mr-2 h-4 w-4" />
                            Close
                        </Button>
                    </div>
                </footer>
            </div>
        </div>,
        document.body,
    );
}

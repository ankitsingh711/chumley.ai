import { createPortal } from 'react-dom';
import { X, Check, ShoppingBag, ReceiptText, FileText, ExternalLink, Package } from 'lucide-react';
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

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/55 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-primary-700">Request Detail</p>
                            <h2 className="mt-1 text-xl font-bold text-gray-900">#{request.id.slice(0, 8)}</h2>
                            <p className="mt-1 text-sm text-gray-500">Submitted {new Date(request.createdAt).toLocaleString('en-GB')}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="space-y-6 p-5 sm:p-6">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
                            <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusClasses(request.status)}`}>
                                {getStatusLabel(request.status)}
                            </span>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Amount</p>
                            <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(request.totalAmount)}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Items</p>
                            <p className="mt-2 text-2xl font-bold text-gray-900">{request.items?.length || 0}</p>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <section className="rounded-xl border border-gray-200 bg-white p-4">
                            <h3 className="text-sm font-semibold text-gray-900">Requester</h3>
                            <div className="mt-3 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-700 text-sm font-semibold text-white">
                                    {request.requester?.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{request.requester?.name || 'Unknown'}</p>
                                    <p className="text-sm text-gray-500">{request.requester?.email || 'No email available'}</p>
                                </div>
                            </div>
                            <div className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600">
                                <p><span className="font-medium text-gray-800">Department:</span> {getDepartmentName(request.requester?.department)}</p>
                            </div>
                        </section>

                        <section className="rounded-xl border border-gray-200 bg-white p-4">
                            <h3 className="text-sm font-semibold text-gray-900">Supplier</h3>
                            {request.supplier ? (
                                <>
                                    <div className="mt-3 flex items-center gap-3">
                                        {request.supplier.logoUrl ? (
                                            <img
                                                src={request.supplier.logoUrl}
                                                alt={request.supplier.name}
                                                className="h-10 w-10 rounded-full border border-gray-200 object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                                                {request.supplier.name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-gray-900">{request.supplier.name}</p>
                                            <p className="text-sm text-gray-500">{request.supplier.category || 'General Supplier'}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600">
                                        <p><span className="font-medium text-gray-800">Status:</span> {request.supplier.status || 'Unknown'}</p>
                                        {request.supplier.contactEmail && (
                                            <p><span className="font-medium text-gray-800">Contact:</span> {request.supplier.contactEmail}</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="mt-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
                                    Supplier not assigned yet.
                                </div>
                            )}
                        </section>
                    </div>

                    <section className="rounded-xl border border-gray-200 bg-white p-4">
                        <h3 className="text-sm font-semibold text-gray-900">Requested Items</h3>
                        <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Description</th>
                                        <th className="px-3 py-2 text-center">Qty</th>
                                        <th className="px-3 py-2 text-right">Unit Price</th>
                                        <th className="px-3 py-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {request.items?.map((item, index) => (
                                        <tr key={index}>
                                            <td className="px-3 py-2 text-gray-700">{item.description}</td>
                                            <td className="px-3 py-2 text-center text-gray-700">{item.quantity}</td>
                                            <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
                                            <td className="px-3 py-2 text-right font-semibold text-gray-900">
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
                        <h3 className="text-sm font-semibold text-gray-900">Logistics</h3>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery Location</p>
                                <p className="mt-1 text-sm text-gray-700">{request.deliveryLocation || 'Not specified'}</p>
                            </div>
                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Expected Delivery</p>
                                <p className="mt-1 text-sm text-gray-700">
                                    {request.expectedDeliveryDate ? new Date(request.expectedDeliveryDate).toLocaleDateString('en-GB') : 'Not specified'}
                                </p>
                            </div>
                        </div>
                    </section>

                    {canApprove && onStatusUpdate && (request.status === RequestStatus.PENDING || request.status === RequestStatus.IN_PROGRESS) && (
                        <section className="rounded-xl border border-gray-200 bg-white p-4">
                            <h3 className="text-sm font-semibold text-gray-900">Approval Decision</h3>

                            {approvalBlocked ? (
                                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                    <p>{blockReason || 'Supplier status must be approved before this request can be approved.'}</p>
                                    {onNavigateToSupplier && request.supplierId && (
                                        <Button
                                            variant="outline"
                                            onClick={() => onNavigateToSupplier(request)}
                                            className="mt-3 border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                                        >
                                            <ExternalLink className="mr-2 h-4 w-4" /> Review Supplier
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
                                        <Check className="mr-2 h-4 w-4" /> Approve Request
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
                                        <X className="mr-2 h-4 w-4" /> Reject Request
                                    </Button>
                                </div>
                            )}
                        </section>
                    )}
                </div>

                <div className="sticky bottom-0 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
                    <div className="flex flex-wrap justify-end gap-2">
                        {onDownloadPDF && (
                            <Button variant="outline" onClick={() => onDownloadPDF(request)}>
                                <FileText className="mr-2 h-4 w-4" /> Download PDF
                            </Button>
                        )}

                        {request.status === RequestStatus.APPROVED && onCreateOrder && (
                            request.order ? (
                                <Button className="bg-emerald-600 hover:bg-emerald-700" disabled>
                                    <ReceiptText className="mr-2 h-4 w-4" /> Purchase Order Created
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => onCreateOrder(request)}
                                    className="bg-primary-700 hover:bg-primary-800"
                                    disabled={isUpdating}
                                >
                                    <ShoppingBag className="mr-2 h-4 w-4" /> Create Purchase Order
                                </Button>
                            )
                        )}

                        <Button variant="ghost" onClick={onClose}>
                            <Package className="mr-2 h-4 w-4" /> Close
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}

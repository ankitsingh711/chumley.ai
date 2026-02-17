import { createPortal } from 'react-dom';
import { X, Check, ShoppingBag } from 'lucide-react';
import { Button } from '../ui/Button';
import { type PurchaseRequest, RequestStatus } from '../../types/api';

interface RequestDetailsModalProps {
    request: PurchaseRequest | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusUpdate?: (id: string, status: RequestStatus) => void;
    onCreateOrder?: (request: PurchaseRequest) => void;
    isUpdating?: boolean;
    canApprove?: boolean;
}

export function RequestDetailsModal({
    request,
    isOpen,
    onClose,
    onStatusUpdate,
    onCreateOrder,
    isUpdating = false,
    canApprove = false
}: RequestDetailsModalProps) {
    if (!isOpen || !request) return null;

    return createPortal(
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Request Details</h2>
                        <p className="text-sm text-gray-500">#{request.id.slice(0, 8)}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6">
                    {/* Status & Amount */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Status</p>
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium 
                            ${request.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' :
                                    request.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-700' :
                                        request.status === RequestStatus.PENDING ? 'bg-blue-50 text-blue-700' :
                                            'bg-gray-100 text-gray-700'}`}>
                                {request.status === RequestStatus.IN_PROGRESS ? 'IN PROGRESS' : request.status}
                            </span>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Total Amount</p>
                            <p className="text-2xl font-bold text-gray-900">£{Number(request.totalAmount).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Requester Info */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Requester Information</h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold">
                                    {request.requester?.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{request.requester?.name || 'Unknown'}</p>
                                    <p className="text-sm text-gray-500">{request.requester?.email}</p>
                                </div>
                            </div>
                            {request.requester?.department && (
                                <div className="pt-2 border-t">
                                    <p className="text-xs text-gray-500">Department</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {typeof request.requester.department === 'object'
                                            ? (request.requester.department as any)?.name
                                            : request.requester.department}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Items ({request.items?.length || 0})</h3>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Description</th>
                                        <th className="px-4 py-2 text-center">Quantity</th>
                                        <th className="px-4 py-2 text-right">Unit Price</th>
                                        <th className="px-4 py-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {request.items?.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">{item.description}</td>
                                            <td className="px-4 py-3 text-center">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right">£{Number(item.unitPrice).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right font-medium">£{Number(item.quantity * item.unitPrice).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {(!request.items || request.items.length === 0) && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-3 text-center text-gray-500">No items found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Created</p>
                            <p className="text-sm text-gray-900">{new Date(request.createdAt).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Last Updated</p>
                            <p className="text-sm text-gray-900">{new Date(request.updatedAt).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    {canApprove && onStatusUpdate && (request.status === RequestStatus.PENDING || request.status === RequestStatus.IN_PROGRESS) && (
                        <div className="pt-4 border-t flex gap-3">
                            <Button
                                onClick={() => {
                                    onStatusUpdate(request.id, RequestStatus.APPROVED);
                                    onClose();
                                }}
                                className="flex-1 bg-green-600 hover:bg-green-700"
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
                                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                                disabled={isUpdating}
                            >
                                <X className="mr-2 h-4 w-4" /> Reject Request
                            </Button>
                        </div>
                    )}

                    {/* Create PO Action for Approved Requests */}
                    {onCreateOrder && request.status === RequestStatus.APPROVED && (
                        <div className="pt-4 border-t">
                            <Button
                                onClick={() => onCreateOrder(request)}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                disabled={isUpdating}
                            >
                                <ShoppingBag className="mr-2 h-4 w-4" /> Create Purchase Order
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

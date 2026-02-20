import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Download, Eye, Send, CheckCircle, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Pagination } from '../components/Pagination';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { PurchaseOrdersSkeleton } from '../components/skeletons/PurchaseOrdersSkeleton';
import { ordersApi } from '../services/orders.service';
import { pdfService } from '../services/pdf.service';
import type { PurchaseOrder } from '../types/api';
import { OrderStatus, UserRole } from '../types/api';
import { isPaginatedResponse } from '../types/pagination';
import { useAuth } from '../hooks/useAuth';
import { formatDateTime, getDateAndTime } from '../utils/dateFormat';

export default function PurchaseOrders() {
    const { user } = useAuth();
    const isMember = user?.role === UserRole.MEMBER;
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [updating, setUpdating] = useState<string | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;

    // Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        variant: 'warning' | 'danger' | 'info' | 'success';
        confirmText?: string;
        showCancel?: boolean;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        variant: 'warning',
        confirmText: 'Confirm',
        showCancel: true,
        onConfirm: () => { },
    });

    const filteredOrders = orders.filter(order => {
        const query = searchQuery.toLowerCase();
        return (
            order.id.toLowerCase().includes(query) ||
            order.supplier?.name.toLowerCase().includes(query)
        );
    });

    useEffect(() => {
        loadOrders();
    }, [currentPage]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const response = await ordersApi.getAll(currentPage, limit);
            if (isPaginatedResponse(response)) {
                setOrders(response.data);
                setTotal(response.meta.total);
                setTotalPages(response.meta.totalPages);
            } else {
                setOrders(response);
                setTotal(response.length);
                setTotalPages(1);
            }
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (order: PurchaseOrder) => {
        setSelectedOrder(order);
    };

    const closeModal = () => {
        setSelectedOrder(null);
    };

    const handleDownload = (order: PurchaseOrder) => {
        // Generate CSV content
        const headers = ['PO ID', 'Supplier', 'Date Issued', 'Total Amount', 'Status'];
        const row = [
            order.id,
            `"${order.supplier?.name || 'Unknown'}"`,
            order.issuedAt ? formatDateTime(order.issuedAt) : 'Not issued',
            Number(order.totalAmount).toFixed(2),
            order.status
        ];

        const csvContent = [headers.join(','), row.join(',')].join('\n');

        // Create blob and download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `purchase-order-${order.id.slice(0, 8)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
        let title = '';
        let message = '';
        let confirmText = '';
        let variant: 'warning' | 'success' | 'danger' = 'warning';

        switch (newStatus) {
            case OrderStatus.SENT:
                title = 'Send Purchase Order';
                message = 'Are you sure you want to mark this order as SENT? This will set the issuance date to today.';
                confirmText = 'Send Order';
                variant = 'warning';
                break;
            case OrderStatus.COMPLETED:
                title = 'Complete Order';
                message = 'Are you sure you want to mark this order as COMPLETED? This confirms all goods/services have been received.';
                confirmText = 'Mark Completed';
                variant = 'success';
                break;
            default:
                return;
        }

        setConfirmModal({
            isOpen: true,
            title,
            message,
            variant,
            confirmText,
            showCancel: true,
            onConfirm: async () => {
                setUpdating(orderId);
                try {
                    await ordersApi.updateStatus(orderId, { status: newStatus });
                    await loadOrders();

                    // Update selected order if open
                    if (selectedOrder && selectedOrder.id === orderId) {
                        const updatedOrder = await ordersApi.getById(orderId);
                        setSelectedOrder(updatedOrder);
                    }

                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error: any) {
                    console.error('Failed to update status:', error);
                    const msg = error.response?.data?.error || 'Failed to update order status';
                    setConfirmModal({
                        isOpen: true,
                        title: 'Error',
                        message: msg,
                        variant: 'danger',
                        confirmText: 'OK',
                        showCancel: false,
                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                    });
                } finally {
                    setUpdating(null);
                }
            }
        });
    };

    const handleExportAll = () => {
        // Generate CSV content for all orders
        const headers = ['PO ID', 'Supplier', 'Date Issued', 'Total Amount', 'Status'];
        const rows = orders.map(order => [
            order.id,
            `"${order.supplier?.name || 'Unknown'}"`,
            order.issuedAt ? formatDateTime(order.issuedAt) : 'Not issued',
            Number(order.totalAmount).toFixed(2),
            order.status
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        // Create blob and download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `purchase-orders-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        const headers = ['PO ID', 'Supplier', 'Date Issued', 'Total Amount', 'Status'];
        const rows = filteredOrders.map(order => [
            order.id.slice(0, 8),
            order.supplier?.name || 'Unknown',
            order.issuedAt ? formatDateTime(order.issuedAt) : 'Not issued',
            `£${Number(order.totalAmount).toLocaleString()}`,
            order.status
        ]);

        pdfService.exportToPDF(
            'Purchase Orders',
            headers,
            rows,
            'purchase_orders'
        );
    };

    const handleDownloadPDF = (order: PurchaseOrder) => {
        // Note: Assuming orders have items. If not, we might need to fetch them or just show summary.
        // The current type definition and API response for getAll might not include items.
        // For the single order view, we might want to ensure we have items.
        // If items are not available on the list view object, we might need to fetch details first or just export summary.
        // Let's assume for now we are exporting the order details we have.

        // If items are not available, let's just export the summary for now or fetch if needed.
        // But for a single PO PDF, usually you want the line items.
        // If the 'order' object from the list doesn't have items, we should probably fetch it.
        // However, looking at the previous code (handleView), it seems to use the object passed to it.
        // Let's create a summary PDF for the single order if items are missing, or generic details.

        // Actually, let's just export the same summary row but maybe transponsed or just a single row table for now
        // OR better, let's fetch the full order details if we want to print a real PO.
        // But to keep it simple and consistent with the "Download CSV" which just dumps the row:

        const summaryHeaders = ['PO ID', 'Supplier', 'Date Issued', 'Total Amount', 'Status'];
        const summaryRow = [
            order.id.slice(0, 8),
            order.supplier?.name || 'Unknown',
            order.issuedAt ? formatDateTime(order.issuedAt) : 'Not issued',
            `£${Number(order.totalAmount).toLocaleString()}`,
            order.status
        ];

        pdfService.exportToPDF(
            `Purchase Order #${order.id.slice(0, 8)}`,
            summaryHeaders,
            [summaryRow],
            `purchase_order_${order.id.slice(0, 8)}`
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case OrderStatus.SENT: return 'bg-blue-50 text-blue-700';
            case OrderStatus.COMPLETED: return 'bg-green-50 text-green-700';
            case OrderStatus.IN_PROGRESS: return 'bg-gray-100 text-gray-700';
            case OrderStatus.CANCELLED: return 'bg-red-50 text-red-700';
            case OrderStatus.PARTIAL: return 'bg-yellow-50 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (loading) {
        return <PurchaseOrdersSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
                    <p className="text-sm text-gray-500">Manage and track all corporate purchase orders in one place.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleExportAll}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
                    <Button variant="outline" onClick={handleExportPDF}><FileText className="mr-2 h-4 w-4" /> Export PDF</Button>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by PO ID, supplier..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                {filteredOrders.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        No purchase orders found.
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4 font-medium">PO ID</th>
                                <th className="px-6 py-4 font-medium">Supplier</th>
                                <th className="px-6 py-4 font-medium">Date Issued</th>
                                <th className="px-6 py-4 font-medium">Total Amount</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                {!isMember && <th className="px-6 py-4 font-medium text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredOrders.map((po) => (
                                <tr key={po.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 font-medium text-primary-600 cursor-pointer hover:underline" onClick={() => handleView(po)}>
                                        #{po.id.slice(0, 8)}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {po.supplier?.name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {po.issuedAt ? (() => {
                                            const { date, time } = getDateAndTime(po.issuedAt);
                                            return (
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{date}</span>
                                                    <span className="text-xs text-gray-500">{time}</span>
                                                </div>
                                            );
                                        })() : 'Not issued'}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-900">
                                        £{Number(po.totalAmount).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(po.status)}`}>
                                            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-60"></span>
                                            {po.status === OrderStatus.IN_PROGRESS ? 'IN PROGRESS' : po.status}
                                        </span>
                                    </td>
                                    {!isMember && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 text-gray-400">
                                                <button
                                                    className="p-1 hover:text-gray-600"
                                                    onClick={() => handleView(po)}
                                                    title="View Details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    className="p-1 hover:text-gray-600"
                                                    onClick={() => handleDownload(po)}
                                                    title="Download CSV"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                                <button
                                                    className="p-1 hover:text-gray-600"
                                                    onClick={() => handleDownloadPDF(po)}
                                                    title="Download PDF"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                </button>
                                                {po.status === OrderStatus.IN_PROGRESS && (
                                                    <button
                                                        className="p-1 hover:text-blue-600 text-blue-400"
                                                        onClick={() => handleUpdateStatus(po.id, OrderStatus.SENT)}
                                                        title="Send Order"
                                                        disabled={!!updating}
                                                    >
                                                        <Send className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {po.status === OrderStatus.SENT && (
                                                    <button
                                                        className="p-1 hover:text-green-600 text-green-400"
                                                        onClick={() => handleUpdateStatus(po.id, OrderStatus.COMPLETED)}
                                                        title="Mark Completed"
                                                        disabled={!!updating}
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    total={total}
                    limit={limit}
                    onPageChange={setCurrentPage}
                />
            )}

            {/* Order Details Modal */}
            {selectedOrder && createPortal(
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
                    onClick={closeModal}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Purchase Order Details</h2>
                                <p className="text-sm text-gray-500">#{selectedOrder.id.slice(0, 8)}</p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <span className="sr-only">Close</span>
                                <svg className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* Status & Amount */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Status</p>
                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                                        {selectedOrder.status === OrderStatus.IN_PROGRESS ? 'IN PROGRESS' : selectedOrder.status}
                                    </span>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Total Amount</p>
                                    <p className="text-2xl font-bold text-gray-900">£{Number(selectedOrder.totalAmount).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Supplier Info */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">Supplier Information</h3>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                            {selectedOrder.supplier?.name?.charAt(0) || 'S'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{selectedOrder.supplier?.name || 'Unknown'}</p>
                                            <p className="text-sm text-gray-500">{selectedOrder.supplier?.contactEmail || 'No email provided'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Date Issued</p>
                                    <p className="text-sm text-gray-900">{selectedOrder.issuedAt ? formatDateTime(selectedOrder.issuedAt) : 'Not issued'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Last Updated</p>
                                    <p className="text-sm text-gray-900">{formatDateTime(selectedOrder.updatedAt)}</p>
                                </div>
                            </div>

                        </div>

                        {/* Footer Actions */}
                        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3 flex-wrap">
                            <Button variant="outline" onClick={closeModal}>Close</Button>
                            <Button onClick={() => handleDownload(selectedOrder)} variant="outline">
                                <Download className="mr-2 h-4 w-4" /> Download CSV
                            </Button>
                            <Button onClick={() => handleDownloadPDF(selectedOrder)} variant="outline">
                                <FileText className="mr-2 h-4 w-4" /> Download PDF
                            </Button>

                            {selectedOrder.status === OrderStatus.IN_PROGRESS && (
                                <Button
                                    onClick={() => handleUpdateStatus(selectedOrder.id, OrderStatus.SENT)}
                                    className="bg-blue-600 hover:bg-blue-700"
                                    disabled={!!updating}
                                >
                                    <Send className="mr-2 h-4 w-4" /> Send to Supplier
                                </Button>
                            )}

                            {selectedOrder.status === OrderStatus.SENT && (
                                <Button
                                    onClick={() => handleUpdateStatus(selectedOrder.id, OrderStatus.COMPLETED)}
                                    className="bg-green-600 hover:bg-green-700"
                                    disabled={!!updating}
                                >
                                    <CheckCircle className="mr-2 h-4 w-4" /> Mark as Completed
                                </Button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant as any}
                confirmText={confirmModal.confirmText}
                showCancel={confirmModal.showCancel}
                isLoading={!!updating}
            />
        </div>
    );
}

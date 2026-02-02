import { useEffect, useState } from 'react';
import { Search, Download, Eye } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ordersApi } from '../services/orders.service';
import type { PurchaseOrder } from '../types/api';
import { OrderStatus } from '../types/api';

export default function PurchaseOrders() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const data = await ordersApi.getAll();
            setOrders(data);
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
            order.issuedAt ? new Date(order.issuedAt).toLocaleDateString() : 'Not issued',
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

    const handleExportAll = () => {
        // Generate CSV content for all orders
        const headers = ['PO ID', 'Supplier', 'Date Issued', 'Total Amount', 'Status'];
        const rows = orders.map(order => [
            order.id,
            `"${order.supplier?.name || 'Unknown'}"`,
            order.issuedAt ? new Date(order.issuedAt).toLocaleDateString() : 'Not issued',
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case OrderStatus.SENT: return 'bg-blue-50 text-blue-700';
            case OrderStatus.COMPLETED: return 'bg-green-50 text-green-700';
            case OrderStatus.DRAFT: return 'bg-gray-100 text-gray-700';
            case OrderStatus.CANCELLED: return 'bg-red-50 text-red-700';
            case OrderStatus.PARTIAL: return 'bg-yellow-50 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
        );
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
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by PO ID, supplier..."
                        className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                {orders.length === 0 ? (
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
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.map((po) => (
                                <tr key={po.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 font-medium text-teal-600 cursor-pointer hover:underline" onClick={() => handleView(po)}>
                                        #{po.id.slice(0, 8)}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {po.supplier?.name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {po.issuedAt ? new Date(po.issuedAt).toLocaleDateString() : 'Not issued'}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-900">
                                        ${Number(po.totalAmount).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(po.status)}`}>
                                            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-60"></span>
                                            {po.status}
                                        </span>
                                    </td>
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
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
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
                                        {selectedOrder.status}
                                    </span>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Total Amount</p>
                                    <p className="text-2xl font-bold text-gray-900">${Number(selectedOrder.totalAmount).toLocaleString()}</p>
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
                                    <p className="text-sm text-gray-900">{selectedOrder.issuedAt ? new Date(selectedOrder.issuedAt).toLocaleDateString() : 'Not issued'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Last Updated</p>
                                    <p className="text-sm text-gray-900">{new Date(selectedOrder.updatedAt).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="pt-4 border-t flex justify-end gap-3">
                                <Button variant="outline" onClick={closeModal}>Close</Button>
                                <Button onClick={() => handleDownload(selectedOrder)}>
                                    <Download className="mr-2 h-4 w-4" /> Download CSV
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

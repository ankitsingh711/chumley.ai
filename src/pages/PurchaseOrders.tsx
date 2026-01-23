import { useEffect, useState } from 'react';
import { Search, Download, Eye } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ordersApi } from '../services/orders.service';
import type { PurchaseOrder } from '../types/api';
import { OrderStatus } from '../types/api';

export default function PurchaseOrders() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);

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
                    <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
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
                                    <td className="px-6 py-4 font-medium text-teal-600 cursor-pointer hover:underline">
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
                                            <button className="p-1 hover:text-gray-600"><Eye className="h-4 w-4" /></button>
                                            <button className="p-1 hover:text-gray-600"><Download className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

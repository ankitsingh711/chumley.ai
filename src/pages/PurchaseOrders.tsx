import { Search, Download, Eye, Mail } from 'lucide-react';
import { Button } from '../components/ui/Button';

const orders = [
    { id: 'PO-7824', supplier: 'AWS Cloud', date: 'Oct 24, 2023', amount: '$12,450.00', status: 'Sent', statusColor: 'bg-blue-50 text-blue-700' },
    { id: 'PO-7823', supplier: 'Paperless Inc.', date: 'Oct 22, 2023', amount: '$842.20', status: 'Received', statusColor: 'bg-green-50 text-green-700' },
    { id: 'PO-7822', supplier: 'BoxWay Logistics', date: 'Oct 21, 2023', amount: '$3,100.00', status: 'Draft', statusColor: 'bg-gray-100 text-gray-700' },
    { id: 'PO-7821', supplier: 'Office Pro Global', date: 'Oct 20, 2023', amount: '$1,205.00', status: 'Canceled', statusColor: 'bg-red-50 text-red-700' },
    { id: 'PO-7820', supplier: 'Zenith Services', date: 'Oct 19, 2023', amount: '$5,890.45', status: 'Sent', statusColor: 'bg-blue-50 text-blue-700' },
];

export default function PurchaseOrders() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <span>Orders</span>
                        <span>›</span>
                        <span className="font-medium text-gray-900">Purchase Order List</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
                    <p className="text-sm text-gray-500">Manage and track all corporate purchase orders in one place.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
                    <Button>+ New Purchase Order</Button>
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
                <div className="flex items-center gap-2">
                    <select className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-teal-500">
                        <option>Status: All</option>
                    </select>
                    <select className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-teal-500">
                        <option>Supplier: All</option>
                    </select>
                    <div className="h-9 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 flex items-center gap-2 cursor-pointer">
                        <span>Date Range</span>
                    </div>
                    <Button variant="ghost" className="text-teal-600">Clear Filters</Button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4 font-medium">PO ID</th>
                            <th className="px-6 py-4 font-medium">Supplier Name</th>
                            <th className="px-6 py-4 font-medium">Date Issued</th>
                            <th className="px-6 py-4 font-medium">Total Amount</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {orders.map((po) => (
                            <tr key={po.id} className="hover:bg-gray-50/50">
                                <td className="px-6 py-4 font-medium text-teal-600 cursor-pointer hover:underline">{po.id}</td>
                                <td className="px-6 py-4 font-medium text-gray-900">{po.supplier}</td>
                                <td className="px-6 py-4 text-gray-500">{po.date}</td>
                                <td className="px-6 py-4 font-bold text-gray-900">{po.amount}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${po.statusColor}`}>
                                        <span className={`mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-60`}></span>
                                        {po.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 text-gray-400">
                                        <button className="p-1 hover:text-gray-600"><Eye className="h-4 w-4" /></button>
                                        <button className="p-1 hover:text-gray-600"><Download className="h-4 w-4" /></button>
                                        <button className="p-1 hover:text-gray-600"><Mail className="h-4 w-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        <tr>
                            <td colSpan={6} className="px-6 py-4 border-t border-gray-100">
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>Showing 1-5 of 48 purchase orders</span>
                                    <div className="flex gap-1">
                                        <button className="rounded border px-2 py-1 hover:bg-gray-50">Previous</button>
                                        <button className="rounded border bg-teal-600 text-white px-2 py-1">1</button>
                                        <button className="rounded border px-2 py-1 hover:bg-gray-50">2</button>
                                        <button className="rounded border px-2 py-1 hover:bg-gray-50">3</button>
                                        <span className="px-2 py-1">...</span>
                                        <button className="rounded border px-2 py-1 hover:bg-gray-50">10</button>
                                        <button className="rounded border px-2 py-1 hover:bg-gray-50">Next</button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

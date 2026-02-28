import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Search,
    Download,
    Eye,
    Send,
    CheckCircle,
    FileText,
    ReceiptText,
    Wallet,
    Clock3,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Pagination } from '../components/Pagination';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { PurchaseOrdersSkeleton } from '../components/skeletons/PurchaseOrdersSkeleton';
import { ordersApi } from '../services/orders.service';
import { requestsApi } from '../services/requests.service';
import { pdfService } from '../services/pdf.service';
import type { PurchaseOrder, RequestItem } from '../types/api';
import { OrderStatus, UserRole } from '../types/api';
import { isPaginatedResponse } from '../types/pagination';
import { useAuth } from '../hooks/useAuth';
import { formatDateTime, getDateAndTime } from '../utils/dateFormat';

type OrderFilter = 'all' | OrderStatus;

const formatCurrency = (amount: number) =>
    `£${Number(amount || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

const formatStatusLabel = (status: OrderStatus) =>
    status === OrderStatus.IN_PROGRESS ? 'In Progress' : status.replace(/_/g, ' ');

const getStatusClasses = (status: OrderStatus) => {
    switch (status) {
        case OrderStatus.SENT:
            return 'border border-blue-200 bg-blue-50 text-blue-700';
        case OrderStatus.COMPLETED:
            return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
        case OrderStatus.IN_PROGRESS:
            return 'border border-amber-200 bg-amber-50 text-amber-700';
        case OrderStatus.CANCELLED:
            return 'border border-rose-200 bg-rose-50 text-rose-700';
        case OrderStatus.PARTIAL:
            return 'border border-violet-200 bg-violet-50 text-violet-700';
        default:
            return 'border border-gray-200 bg-gray-100 text-gray-700';
    }
};

export default function PurchaseOrders() {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const isMember = user?.role === UserRole.MEMBER;
    const pageTitle = isMember ? 'My Purchase Orders' : 'Purchase Orders';
    const pageDescription = isMember
        ? 'Track and review your purchase orders with live status updates.'
        : 'Manage and track all corporate purchase orders in one place.';

    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
    const [updating, setUpdating] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;

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
        onConfirm: () => {
            // no-op
        },
    });

    useEffect(() => {
        loadOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage]);

    useEffect(() => {
        if (location.state?.openOrderId) {
            const orderId = location.state.openOrderId as string;

            navigate(location.pathname, { replace: true, state: {} });

            ordersApi.getById(orderId)
                .then((order) => {
                    if (order) {
                        setSelectedOrder(order);
                    }
                })
                .catch((error) => {
                    console.error('Failed to auto-open order:', error);
                });
        }
    }, [location.state, location.pathname, navigate]);

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

    const filteredOrders = useMemo(() => {
        let list = orderFilter === 'all'
            ? orders
            : orders.filter((order) => order.status === orderFilter);

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            list = list.filter((order) =>
                order.id.toLowerCase().includes(query)
                || order.supplier?.name?.toLowerCase().includes(query)
                || order.requestId?.toLowerCase().includes(query)
            );
        }

        return list;
    }, [orders, orderFilter, searchQuery]);

    const summary = useMemo(() => {
        const inProgressCount = orders.filter((order) => order.status === OrderStatus.IN_PROGRESS).length;
        const sentCount = orders.filter((order) => order.status === OrderStatus.SENT).length;
        const completedValue = orders
            .filter((order) => order.status === OrderStatus.COMPLETED)
            .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
        const totalValue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

        return {
            inProgressCount,
            sentCount,
            completedValue,
            totalValue,
        };
    }, [orders]);

    const filterTabs: Array<{ value: OrderFilter; label: string; count: number }> = [
        { value: 'all', label: 'All Orders', count: orders.length },
        {
            value: OrderStatus.IN_PROGRESS,
            label: 'In Progress',
            count: orders.filter((order) => order.status === OrderStatus.IN_PROGRESS).length,
        },
        {
            value: OrderStatus.SENT,
            label: 'Sent',
            count: orders.filter((order) => order.status === OrderStatus.SENT).length,
        },
        {
            value: OrderStatus.COMPLETED,
            label: 'Completed',
            count: orders.filter((order) => order.status === OrderStatus.COMPLETED).length,
        },
    ];

    const activeFilterCount = useMemo(() => {
        const statusCount = orderFilter === 'all' ? 0 : 1;
        const searchCount = searchQuery ? 1 : 0;
        return statusCount + searchCount;
    }, [orderFilter, searchQuery]);

    const resetFilters = () => {
        setOrderFilter('all');
        setSearchQuery('');
    };

    const handleView = (order: PurchaseOrder) => {
        setSelectedOrder(order);
    };

    const closeModal = () => {
        setSelectedOrder(null);
    };

    const handleDownload = (order: PurchaseOrder) => {
        const headers = ['PO ID', 'Supplier', 'Date Issued', 'Total Amount', 'Status'];
        const row = [
            order.id,
            `"${order.supplier?.name || 'Unknown'}"`,
            order.issuedAt ? formatDateTime(order.issuedAt) : formatDateTime(order.createdAt),
            Number(order.totalAmount).toFixed(2),
            order.status,
        ];

        const csvContent = [headers.join(','), row.join(',')].join('\n');

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

                    if (selectedOrder && selectedOrder.id === orderId) {
                        const updatedOrder = await ordersApi.getById(orderId);
                        setSelectedOrder(updatedOrder);
                    }

                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                } catch (error: unknown) {
                    console.error('Failed to update status:', error);
                    const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
                        || 'Failed to update order status';
                    setConfirmModal({
                        isOpen: true,
                        title: 'Error',
                        message: msg,
                        variant: 'danger',
                        confirmText: 'OK',
                        showCancel: false,
                        onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
                    });
                } finally {
                    setUpdating(null);
                }
            },
        });
    };

    const handleExportAll = () => {
        const headers = ['PO ID', 'Supplier', 'Date Issued', 'Total Amount', 'Status'];
        const rows = orders.map((order) => [
            order.id,
            `"${order.supplier?.name || 'Unknown'}"`,
            order.issuedAt ? formatDateTime(order.issuedAt) : formatDateTime(order.createdAt),
            Number(order.totalAmount).toFixed(2),
            order.status,
        ]);

        const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

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
        const rows = filteredOrders.map((order) => [
            order.id.slice(0, 8),
            order.supplier?.name || 'Unknown',
            order.issuedAt ? formatDateTime(order.issuedAt) : formatDateTime(order.createdAt),
            formatCurrency(Number(order.totalAmount)),
            order.status,
        ]);

        pdfService.exportToPDF(
            'Purchase Orders',
            headers,
            rows,
            'purchase_orders',
        );
    };

    const handleDownloadPDF = async (order: PurchaseOrder) => {
        try {
            setUpdating(order.id);
            const request = await requestsApi.getById(order.requestId);

            const totalGross = Number(order.totalAmount);
            const totalNet = totalGross / 1.2;
            const totalVat = totalGross - totalNet;

            const documentData = {
                id: order.id.slice(0, 8).toUpperCase(),
                date: order.issuedAt ? formatDateTime(order.issuedAt) : formatDateTime(order.createdAt),
                type: 'Order' as const,
                supplier: {
                    name: order.supplier?.name || 'Unknown Supplier',
                    address: order.supplier?.contactEmail || '',
                },
                delivery: {
                    recipient: request?.requester?.name || 'Aspect Representative',
                    address: request?.deliveryLocation || '',
                    date: request?.expectedDeliveryDate ? new Date(request.expectedDeliveryDate).toLocaleDateString() : 'N/A',
                },
                items: (request?.items || []).map((item: RequestItem) => {
                    const gross = Number(item.totalPrice);
                    const net = gross / 1.2;
                    const vat = gross - net;
                    return {
                        code: item.id ? item.id.slice(0, 6).toUpperCase() : '-',
                        description: item.description,
                        qty: Number(item.quantity),
                        net,
                        vat,
                        gross,
                    };
                }),
                totals: {
                    net: totalNet,
                    vat: totalVat,
                    gross: totalGross,
                },
            };

            if (documentData.items.length === 0) {
                documentData.items.push({
                    code: 'MISC',
                    description: 'Purchase Order Summary',
                    qty: 1,
                    net: totalNet,
                    vat: totalVat,
                    gross: totalGross,
                });
            }

            pdfService.exportPurchaseDocumentPDF(documentData, `purchase_order_${order.id.slice(0, 8)}`);
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Export Error',
                message: 'Failed to load order details for PDF generation.',
                variant: 'danger',
                confirmText: 'OK',
                showCancel: false,
                onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
            });
        } finally {
            setUpdating(null);
        }
    };

    const renderActions = (order: PurchaseOrder) => (
        <div className="flex items-center gap-2">
            <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                onClick={() => handleView(order)}
                title="View Details"
            >
                <Eye className="h-4 w-4" />
            </button>
            <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                onClick={() => handleDownload(order)}
                title="Download CSV"
            >
                <Download className="h-4 w-4" />
            </button>
            <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                onClick={() => handleDownloadPDF(order)}
                title="Download PDF"
            >
                <FileText className="h-4 w-4" />
            </button>
            {!isMember && order.status === OrderStatus.IN_PROGRESS && (
                <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                    onClick={() => handleUpdateStatus(order.id, OrderStatus.SENT)}
                    title="Send Order"
                    disabled={!!updating}
                >
                    <Send className="h-4 w-4" />
                </button>
            )}
            {!isMember && order.status === OrderStatus.SENT && (
                <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                    onClick={() => handleUpdateStatus(order.id, OrderStatus.COMPLETED)}
                    title="Mark Completed"
                    disabled={!!updating}
                >
                    <CheckCircle className="h-4 w-4" />
                </button>
            )}
        </div>
    );

    if (loading) {
        return <PurchaseOrdersSkeleton />;
    }

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-2xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/60 to-accent-50/70 p-6 shadow-sm">
                <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary-200/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-accent-200/50 blur-3xl" />

                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700">Procurement Workspace</p>
                        <h1 className="mt-2 text-3xl font-bold text-gray-900">{pageTitle}</h1>
                        <p className="mt-2 max-w-2xl text-sm text-gray-600">{pageDescription}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={handleExportAll} className="border-white/70 bg-white/90 backdrop-blur">
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                        <Button variant="outline" onClick={handleExportPDF} className="border-white/70 bg-white/90 backdrop-blur">
                            <FileText className="mr-2 h-4 w-4" /> Export PDF
                        </Button>
                    </div>
                </div>

                <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Total Orders
                            <ReceiptText className="h-4 w-4 text-primary-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{orders.length}</p>
                        <p className="mt-1 text-xs text-gray-500">Loaded on this page</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            In Progress
                            <Clock3 className="h-4 w-4 text-amber-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-amber-700">{summary.inProgressCount}</p>
                        <p className="mt-1 text-xs text-gray-500">Orders waiting to be sent</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Sent Orders
                            <Send className="h-4 w-4 text-blue-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-blue-700">{summary.sentCount}</p>
                        <p className="mt-1 text-xs text-gray-500">Dispatched to suppliers</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Completed Value
                            <Wallet className="h-4 w-4 text-emerald-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-emerald-700">{formatCurrency(summary.completedValue)}</p>
                        <p className="mt-1 text-xs text-gray-500">Completed orders on this page</p>
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-4 py-4 lg:px-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            {filterTabs.map((tab) => (
                                <button
                                    key={tab.value}
                                    onClick={() => setOrderFilter(tab.value)}
                                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                                        orderFilter === tab.value
                                            ? 'border-primary-200 bg-primary-600 text-white shadow-sm'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-xs ${orderFilter === tab.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="relative w-full lg:max-w-md">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by PO ID, request ID, or supplier"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 text-sm text-gray-700 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                />
                            </div>

                            {activeFilterCount > 0 && (
                                <Button variant="ghost" onClick={resetFilters} className="text-gray-500">
                                    Reset Filters
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-xs text-gray-500 lg:px-6">
                    <p>
                        Showing <span className="font-semibold text-gray-700">{filteredOrders.length}</span> orders
                        {activeFilterCount > 0 ? ' after filters' : ''}.
                    </p>
                    <p className="hidden sm:block">
                        Total value on this page: <span className="font-semibold text-gray-700">{formatCurrency(summary.totalValue)}</span>
                    </p>
                </div>

                {filteredOrders.length === 0 ? (
                    <div className="px-6 py-14 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                            <ReceiptText className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-gray-900">No purchase orders found</h3>
                        <p className="mt-1 text-sm text-gray-500">Try adjusting filters or search terms to find matching orders.</p>
                        {activeFilterCount > 0 && (
                            <Button variant="outline" onClick={resetFilters} className="mt-5">
                                Reset All Filters
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="hidden xl:block">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[980px] text-left text-sm">
                                    <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Order</th>
                                            <th className="px-6 py-3 font-semibold">Supplier</th>
                                            <th className="px-6 py-3 font-semibold">Date Issued</th>
                                            <th className="px-6 py-3 font-semibold">Amount</th>
                                            <th className="px-6 py-3 font-semibold">Status</th>
                                            <th className="px-6 py-3 font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredOrders.map((order) => {
                                            const displayDate = order.issuedAt || order.createdAt;
                                            const { date, time } = getDateAndTime(displayDate);
                                            return (
                                                <tr key={order.id} className="bg-white transition hover:bg-primary-50/30">
                                                    <td className="px-6 py-4">
                                                        <p className="font-semibold text-primary-700">#{order.id.slice(0, 8)}</p>
                                                        <p className="mt-0.5 text-xs text-gray-500">Request #{order.requestId.slice(0, 8)}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-medium text-gray-900">{order.supplier?.name || 'Unknown Supplier'}</p>
                                                        <p className="mt-0.5 text-xs text-gray-500">{order.supplier?.contactEmail || 'No email'}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-medium text-gray-900">{date}</p>
                                                        <p className="text-xs text-gray-500">{time}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-base font-semibold text-gray-900">{formatCurrency(order.totalAmount)}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(order.status)}`}>
                                                            {formatStatusLabel(order.status)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {renderActions(order)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="space-y-3 p-4 xl:hidden">
                            {filteredOrders.map((order) => {
                                const displayDate = order.issuedAt || order.createdAt;
                                const { date, time } = getDateAndTime(displayDate);
                                return (
                                    <article key={order.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-primary-700">#{order.id.slice(0, 8)}</p>
                                                <p className="mt-0.5 text-xs text-gray-500">Request #{order.requestId.slice(0, 8)}</p>
                                            </div>
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(order.status)}`}>
                                                {formatStatusLabel(order.status)}
                                            </span>
                                        </div>

                                        <div className="mt-3 grid gap-2 text-sm">
                                            <p className="text-gray-700">
                                                <span className="font-medium text-gray-900">Supplier:</span> {order.supplier?.name || 'Unknown Supplier'}
                                            </p>
                                            <p className="text-gray-700">
                                                <span className="font-medium text-gray-900">Issued:</span> {date} at {time}
                                            </p>
                                            <p className="text-base font-semibold text-gray-900">{formatCurrency(order.totalAmount)}</p>
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {renderActions(order)}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </>
                )}
            </section>

            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    total={total}
                    limit={limit}
                    onPageChange={setCurrentPage}
                />
            )}

            {selectedOrder && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/55 p-4 backdrop-blur-sm"
                    onClick={closeModal}
                >
                    <div
                        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.13em] text-primary-700">Order Detail</p>
                                    <h2 className="mt-1 text-xl font-bold text-gray-900">#{selectedOrder.id.slice(0, 8)}</h2>
                                    <p className="mt-1 text-sm text-gray-500">Created {new Date(selectedOrder.createdAt).toLocaleString('en-GB')}</p>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50"
                                >
                                    <span className="sr-only">Close</span>
                                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6 p-5 sm:p-6">
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
                                    <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusClasses(selectedOrder.status)}`}>
                                        {formatStatusLabel(selectedOrder.status)}
                                    </span>
                                </div>
                                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Amount</p>
                                    <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(selectedOrder.totalAmount)}</p>
                                </div>
                                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Linked Request</p>
                                    <p className="mt-2 text-base font-semibold text-gray-900">#{selectedOrder.requestId.slice(0, 8)}</p>
                                </div>
                            </div>

                            <section className="rounded-xl border border-gray-200 bg-white p-4">
                                <h3 className="text-sm font-semibold text-gray-900">Supplier</h3>
                                <div className="mt-3 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                                        {selectedOrder.supplier?.name?.charAt(0) || 'S'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{selectedOrder.supplier?.name || 'Unknown Supplier'}</p>
                                        <p className="text-sm text-gray-500">{selectedOrder.supplier?.contactEmail || 'No email provided'}</p>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-xl border border-gray-200 bg-white p-4">
                                <h3 className="text-sm font-semibold text-gray-900">Order Timeline</h3>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Issued Date</p>
                                        <p className="mt-1 text-sm text-gray-700">
                                            {selectedOrder.issuedAt ? formatDateTime(selectedOrder.issuedAt) : formatDateTime(selectedOrder.createdAt)}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Created Date</p>
                                        <p className="mt-1 text-sm text-gray-700">{formatDateTime(selectedOrder.createdAt)}</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last Updated</p>
                                        <p className="mt-1 text-sm text-gray-700">{formatDateTime(selectedOrder.updatedAt)}</p>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="sticky bottom-0 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
                            <div className="flex flex-wrap justify-end gap-2">
                                <Button onClick={() => handleDownload(selectedOrder)} variant="outline">
                                    <Download className="mr-2 h-4 w-4" /> Download CSV
                                </Button>
                                <Button onClick={() => handleDownloadPDF(selectedOrder)} variant="outline" disabled={updating === selectedOrder.id}>
                                    <FileText className="mr-2 h-4 w-4" /> Download PDF
                                </Button>

                                {!isMember && selectedOrder.status === OrderStatus.IN_PROGRESS && (
                                    <Button
                                        onClick={() => handleUpdateStatus(selectedOrder.id, OrderStatus.SENT)}
                                        className="bg-blue-600 hover:bg-blue-700"
                                        disabled={updating === selectedOrder.id}
                                    >
                                        <Send className="mr-2 h-4 w-4" /> Send to Supplier
                                    </Button>
                                )}

                                {!isMember && selectedOrder.status === OrderStatus.SENT && (
                                    <Button
                                        onClick={() => handleUpdateStatus(selectedOrder.id, OrderStatus.COMPLETED)}
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                        disabled={updating === selectedOrder.id}
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" /> Mark as Completed
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
                confirmText={confirmModal.confirmText}
                showCancel={confirmModal.showCancel}
                isLoading={!!updating}
            />
        </div>
    );
}

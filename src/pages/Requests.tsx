import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Download,
    Filter,
    Eye,
    Plus,
    Check,
    X,
    Trash2,
    Search,
    ShoppingBag,
    FileText,
    ReceiptText,
    ExternalLink,
    Wallet,
    BarChart3,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { RequestsSkeleton } from '../components/skeletons/RequestsSkeleton';
import { RequestDetailsModal } from '../components/requests/RequestDetailsModal';
import { useAuth } from '../hooks/useAuth';
import { requestsApi } from '../services/requests.service';
import { ordersApi } from '../services/orders.service';
import { pdfService } from '../services/pdf.service';
import type { PurchaseRequest, RequestStatus as RequestStatusType } from '../types/api';
import { RequestStatus, UserRole } from '../types/api';
import { Pagination } from '../components/Pagination';
import { isPaginatedResponse } from '../types/pagination';
import { formatDateTime, getDateAndTime } from '../utils/dateFormat';

const APPROVED_SUPPLIER_STATUSES = new Set(['STANDARD', 'PREFERRED', 'ACTIVE']);

type FilterValue = 'all' | RequestStatusType;

const formatCurrency = (value: number) =>
    `£${value.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

const formatStatusLabel = (status: RequestStatusType) =>
    status === RequestStatus.IN_PROGRESS ? 'In Progress' : status.replace(/_/g, ' ');

const getStatusClasses = (status: RequestStatusType) => {
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
    if (typeof department === 'object' && 'name' in department && typeof department.name === 'string') {
        return department.name;
    }
    if (typeof department === 'string') {
        return department;
    }
    return 'Unassigned';
};

export default function Requests() {
    const navigate = useNavigate();
    const { id: requestIdFromUrl } = useParams<{ id: string }>();
    const { user } = useAuth();

    const [requests, setRequests] = useState<PurchaseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterValue>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [updating, setUpdating] = useState<string | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({
        dateFrom: '',
        dateTo: '',
        minAmount: '',
        maxAmount: '',
        requester: '',
    });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        variant: 'warning' | 'danger' | 'info';
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

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;

    useEffect(() => {
        loadRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage]);

    useEffect(() => {
        let isActive = true;

        const openRequestFromUrl = async () => {
            if (!requestIdFromUrl) {
                setSelectedRequest((current) => (current ? null : current));
                return;
            }

            const inCurrentPage = requests.find((request) => request.id === requestIdFromUrl);
            if (inCurrentPage) {
                setSelectedRequest((current) => (current?.id === inCurrentPage.id ? current : inCurrentPage));
                return;
            }

            try {
                const request = await requestsApi.getById(requestIdFromUrl);
                if (isActive) {
                    setSelectedRequest((current) => (current?.id === request.id ? current : request));
                }
            } catch (error) {
                console.error('Failed to open request from URL:', error);
                if (isActive) {
                    setSelectedRequest(null);
                    navigate('/requests', { replace: true });
                }
            }
        };

        if (!loading) {
            openRequestFromUrl();
        }

        return () => {
            isActive = false;
        };
    }, [requestIdFromUrl, requests, loading, navigate]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const response = await requestsApi.getAll(currentPage, limit);

            if (isPaginatedResponse(response)) {
                setRequests(response.data);
                setTotal(response.meta.total);
                setTotalPages(response.meta.totalPages);
            } else {
                setRequests(response);
                setTotal(response.length);
                setTotalPages(1);
            }
        } catch (error) {
            console.error('Failed to load requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, status: RequestStatusType) => {
        setUpdating(id);
        try {
            await requestsApi.updateStatus(id, { status });
            await loadRequests();
        } catch (error) {
            console.error('Failed to update status:', error);
            const errorMessage =
                (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                'Failed to update request status';
            alert(errorMessage);
        } finally {
            setUpdating(null);
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Request',
            message: 'Are you sure you want to delete this purchase request? This action cannot be undone.',
            variant: 'danger',
            onConfirm: async () => {
                setUpdating(id);
                try {
                    await requestsApi.delete(id);
                    await loadRequests();
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                    if (selectedRequest?.id === id) {
                        closeModal();
                    }
                } catch (error) {
                    console.error('Failed to delete request:', error);
                    alert('Failed to delete request');
                } finally {
                    setUpdating(null);
                }
            },
        });
    };

    const handleCreateOrder = async (request: PurchaseRequest) => {
        const supplierId = request.supplierId || request.supplier?.id;

        if (!supplierId) {
            setConfirmModal({
                isOpen: true,
                title: 'Missing Supplier',
                message: 'Cannot create order: no supplier selected for this request.',
                variant: 'info',
                confirmText: 'OK',
                showCancel: false,
                onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
            });
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Create Purchase Order',
            message: `Generate a Purchase Order for request #${request.id.slice(0, 8)} with amount ${formatCurrency(Number(request.totalAmount))}?`,
            variant: 'warning',
            confirmText: 'Create Order',
            showCancel: true,
            onConfirm: async () => {
                setUpdating(request.id);
                try {
                    await ordersApi.create({
                        requestId: request.id,
                        supplierId,
                        totalAmount: request.totalAmount,
                    });
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                    navigate('/orders');
                } catch (error: unknown) {
                    console.error('Failed to create order:', error);
                    const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
                        || 'Failed to create Purchase Order';
                    setConfirmModal({
                        isOpen: true,
                        title: 'Error Creating Order',
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

    const handleViewDetails = (request: PurchaseRequest) => {
        setSelectedRequest(request);
        navigate(`/requests/${request.id}`);
    };

    const closeModal = () => {
        if (requestIdFromUrl) {
            navigate('/requests', { replace: true });
            return;
        }
        setSelectedRequest(null);
    };

    const normalizeSupplierStatus = (status?: string | null) => status?.trim().toUpperCase() || '';

    const isSupplierApprovalBlocked = (request: PurchaseRequest) => {
        if (!request.supplierId) return false;
        const normalizedStatus = normalizeSupplierStatus(request.supplier?.status);
        if (!normalizedStatus) return false;
        return !APPROVED_SUPPLIER_STATUSES.has(normalizedStatus);
    };

    const getSupplierStatusLabel = (request: PurchaseRequest) => request.supplier?.status?.trim() || 'Unknown';

    const getSupplierApprovalBlockReason = (request: PurchaseRequest) => {
        if (!request.supplierId) return '';
        if (!isSupplierApprovalBlocked(request)) return '';
        return `Cannot approve request until supplier is approved. Current supplier status: ${getSupplierStatusLabel(request)}`;
    };

    const navigateToSupplierApproval = (request: PurchaseRequest) => {
        if (!request.supplierId) return;
        navigate(`/suppliers/${request.supplierId}`);
    };

    const canUserApprove = (request: PurchaseRequest) => {
        if (!user) return false;

        if (user.role === UserRole.SYSTEM_ADMIN) return true;

        if (user.role === UserRole.MANAGER || user.role === UserRole.SENIOR_MANAGER) {
            if (!request.requester) return false;

            if (typeof request.requester.department === 'object' && request.requester.department !== null) {
                return user.departmentId === request.requester.department.id;
            }
        }

        return false;
    };

    const filteredRequests = useMemo(() => {
        let list = filter === 'all'
            ? requests
            : filter === RequestStatus.PENDING
                ? requests.filter((request) => request.status === RequestStatus.PENDING || request.status === RequestStatus.IN_PROGRESS)
                : requests.filter((request) => request.status === filter);

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            list = list.filter((request) =>
                request.id.toLowerCase().includes(query)
                || request.requester?.name?.toLowerCase().includes(query)
                || request.requester?.email?.toLowerCase().includes(query)
                || request.supplier?.name?.toLowerCase().includes(query)
            );
        }

        if (advancedFilters.dateFrom) {
            list = list.filter((request) => new Date(request.createdAt) >= new Date(advancedFilters.dateFrom));
        }
        if (advancedFilters.dateTo) {
            list = list.filter((request) => new Date(request.createdAt) <= new Date(advancedFilters.dateTo));
        }
        if (advancedFilters.minAmount) {
            list = list.filter((request) => Number(request.totalAmount) >= Number(advancedFilters.minAmount));
        }
        if (advancedFilters.maxAmount) {
            list = list.filter((request) => Number(request.totalAmount) <= Number(advancedFilters.maxAmount));
        }
        if (advancedFilters.requester) {
            const requesterQuery = advancedFilters.requester.toLowerCase();
            list = list.filter((request) =>
                request.requester?.name?.toLowerCase().includes(requesterQuery)
                || request.requester?.email?.toLowerCase().includes(requesterQuery)
            );
        }

        return list;
    }, [requests, filter, searchQuery, advancedFilters]);

    const summary = useMemo(() => {
        const pendingCount = requests.filter(
            (request) => request.status === RequestStatus.PENDING || request.status === RequestStatus.IN_PROGRESS,
        ).length;
        const approved = requests.filter((request) => request.status === RequestStatus.APPROVED);
        const approvedValue = approved.reduce((sum, request) => sum + Number(request.totalAmount || 0), 0);
        const totalValue = requests.reduce((sum, request) => sum + Number(request.totalAmount || 0), 0);
        const avgValue = requests.length > 0 ? totalValue / requests.length : 0;

        return {
            pendingCount,
            approvedValue,
            totalValue,
            avgValue,
        };
    }, [requests]);

    const filterTabs: Array<{ value: FilterValue; label: string; count: number }> = [
        { value: 'all', label: 'All Requests', count: requests.length },
        {
            value: RequestStatus.PENDING,
            label: 'Needs Review',
            count: requests.filter((request) => request.status === RequestStatus.PENDING || request.status === RequestStatus.IN_PROGRESS).length,
        },
        {
            value: RequestStatus.APPROVED,
            label: 'Approved',
            count: requests.filter((request) => request.status === RequestStatus.APPROVED).length,
        },
        {
            value: RequestStatus.REJECTED,
            label: 'Rejected',
            count: requests.filter((request) => request.status === RequestStatus.REJECTED).length,
        },
    ];

    const activeFilterCount = useMemo(() => {
        const advancedCount = Object.values(advancedFilters).filter(Boolean).length;
        const statusCount = filter === 'all' ? 0 : 1;
        const searchCount = searchQuery ? 1 : 0;
        return advancedCount + statusCount + searchCount;
    }, [advancedFilters, filter, searchQuery]);

    const handleResetFilters = () => {
        setFilter('all');
        setSearchQuery('');
        setAdvancedFilters({
            dateFrom: '',
            dateTo: '',
            minAmount: '',
            maxAmount: '',
            requester: '',
        });
    };

    const handleExportCSV = () => {
        const headers = ['ID', 'Requester', 'Email', 'Items', 'Date', 'Amount', 'Status'];
        const csvRows = [headers.join(',')];

        filteredRequests.forEach((request) => {
            const row = [
                request.id,
                `"${request.requester?.name || 'Unknown'}"`,
                `"${request.requester?.email || ''}"`,
                request.items?.length || 0,
                formatDateTime(request.createdAt),
                Number(request.totalAmount).toFixed(2),
                request.status,
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `purchase-requests-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        const headers = ['ID', 'Requester', 'Items', 'Date', 'Amount', 'Status'];
        const rows = filteredRequests.map((request) => [
            request.id.slice(0, 8),
            request.requester?.name || 'Unknown',
            (request.items?.length || 0).toString(),
            formatDateTime(request.createdAt),
            `£${Number(request.totalAmount).toLocaleString()}`,
            request.status.replace(/_/g, ' '),
        ]);

        pdfService.exportToPDF(
            'Purchase Requests',
            headers,
            rows,
            'purchase_requests',
        );
    };

    const handleDownloadPDF = (request: PurchaseRequest) => {
        try {
            const totalGross = Number(request.totalAmount) || 0;
            const totalNet = totalGross / 1.2;
            const totalVat = totalGross - totalNet;

            const documentData = {
                id: request.id.slice(0, 8).toUpperCase(),
                date: formatDateTime(request.createdAt),
                type: 'Request' as const,
                supplier: {
                    name: request.supplier?.name || 'Pending Supplier Selection',
                    address: request.supplier?.contactEmail || '',
                },
                delivery: {
                    recipient: request.requester?.name || 'Aspect Representative',
                    address: request.deliveryLocation || '',
                    date: request.expectedDeliveryDate ? new Date(request.expectedDeliveryDate).toLocaleDateString() : 'N/A',
                },
                items: (request.items || []).map((item) => {
                    const gross = Number(item.totalPrice) || 0;
                    const net = gross / 1.2;
                    const vat = gross - net;
                    return {
                        code: item.id ? item.id.slice(0, 6).toUpperCase() : '-',
                        description: item.description,
                        qty: Number(item.quantity) || 1,
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
                    description: 'Purchase Request Summary',
                    qty: 1,
                    net: totalNet,
                    vat: totalVat,
                    gross: totalGross,
                });
            }

            pdfService.exportPurchaseDocumentPDF(documentData, `purchase_request_${request.id.slice(0, 8)}`);
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Export Error',
                message: 'Failed to generate PDF for this request.',
                variant: 'danger',
                confirmText: 'OK',
                showCancel: false,
                onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
            });
        }
    };

    const renderActionArea = (request: PurchaseRequest) => {
        const canApproveRequest = canUserApprove(request)
            && (request.status === RequestStatus.PENDING || request.status === RequestStatus.IN_PROGRESS);

        const canDeleteRequest = request.status === RequestStatus.IN_PROGRESS
            && (user?.id === request.requesterId || user?.role === UserRole.SYSTEM_ADMIN)
            && !canUserApprove(request);

        return (
            <div className="flex items-center gap-2">
                {canApproveRequest && (
                    isSupplierApprovalBlocked(request) && request.supplierId ? (
                        <button
                            className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                            onClick={() => navigateToSupplierApproval(request)}
                            title={getSupplierApprovalBlockReason(request)}
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Review Supplier
                        </button>
                    ) : (
                        <>
                            <button
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                                onClick={() => handleStatusUpdate(request.id, RequestStatus.APPROVED)}
                                disabled={updating === request.id}
                                title="Approve"
                            >
                                <Check className="h-4 w-4" />
                            </button>
                            <button
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                                onClick={() => handleStatusUpdate(request.id, RequestStatus.REJECTED)}
                                disabled={updating === request.id}
                                title="Reject"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </>
                    )
                )}

                {canDeleteRequest && (
                    <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                        onClick={() => handleDelete(request.id)}
                        disabled={updating === request.id}
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}

                {request.status === RequestStatus.APPROVED && (
                    request.order ? (
                        <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                            onClick={() => navigate(`/orders?search=${request.order?.id}`)}
                            title="View Purchase Order"
                        >
                            <ReceiptText className="h-4 w-4" />
                        </button>
                    ) : (
                        <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                            onClick={() => handleCreateOrder(request)}
                            disabled={updating === request.id}
                            title="Create Purchase Order"
                        >
                            <ShoppingBag className="h-4 w-4" />
                        </button>
                    )
                )}

                <button
                    onClick={() => handleViewDetails(request)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                    title="View request"
                >
                    <Eye className="h-4 w-4" />
                </button>
            </div>
        );
    };

    if (loading) {
        return <RequestsSkeleton />;
    }

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-2xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/60 to-accent-50/70 p-6 shadow-sm">
                <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary-200/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-accent-200/50 blur-3xl" />

                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700">Procurement Workspace</p>
                        <h1 className="mt-2 text-3xl font-bold text-gray-900">Purchase Requests</h1>
                        <p className="mt-2 max-w-2xl text-sm text-gray-600">
                            Review, approve, and convert requests to orders with clear decision support for supplier and budget status.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={handleExportCSV} className="border-white/70 bg-white/90 backdrop-blur">
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                        <Button variant="outline" onClick={handleExportPDF} className="border-white/70 bg-white/90 backdrop-blur">
                            <FileText className="mr-2 h-4 w-4" /> Export PDF
                        </Button>
                        {user?.role !== UserRole.SYSTEM_ADMIN && (
                            <Button onClick={() => navigate('/requests/new')} className="bg-primary-700 hover:bg-primary-800">
                                <Plus className="mr-2 h-4 w-4" /> New Request
                            </Button>
                        )}
                    </div>
                </div>

                <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Total Requests
                            <FileText className="h-4 w-4 text-primary-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{requests.length}</p>
                        <p className="mt-1 text-xs text-gray-500">Loaded on this page</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Needs Review
                            <Filter className="h-4 w-4 text-amber-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-amber-700">{summary.pendingCount}</p>
                        <p className="mt-1 text-xs text-gray-500">Pending and in-progress requests</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Approved Value
                            <Wallet className="h-4 w-4 text-emerald-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-emerald-700">{formatCurrency(summary.approvedValue)}</p>
                        <p className="mt-1 text-xs text-gray-500">Approved requests on this page</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Average Ticket
                            <BarChart3 className="h-4 w-4 text-primary-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(summary.avgValue)}</p>
                        <p className="mt-1 text-xs text-gray-500">Per request on this page</p>
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
                                    onClick={() => setFilter(tab.value)}
                                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                                        filter === tab.value
                                            ? 'border-primary-200 bg-primary-600 text-white shadow-sm'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-xs ${filter === tab.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
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
                                    placeholder="Search by ID, requester, supplier, or email"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 text-sm text-gray-700 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowAdvancedFilters((prev) => !prev)}
                                    className={showAdvancedFilters ? 'border-primary-300 bg-primary-50 text-primary-700' : ''}
                                >
                                    <Filter className="mr-2 h-4 w-4" />
                                    Advanced Filters
                                    {activeFilterCount > 0 && (
                                        <span className="ml-2 rounded-full bg-primary-600 px-2 py-0.5 text-xs text-white">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </Button>

                                {activeFilterCount > 0 && (
                                    <Button variant="ghost" onClick={handleResetFilters} className="text-gray-500">
                                        Reset
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {showAdvancedFilters && (
                    <div className="border-b border-gray-100 bg-gray-50 px-4 py-4 lg:px-6">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Date From
                                <input
                                    type="date"
                                    value={advancedFilters.dateFrom}
                                    onChange={(event) => setAdvancedFilters({ ...advancedFilters, dateFrom: event.target.value })}
                                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-normal text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                />
                            </label>
                            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Date To
                                <input
                                    type="date"
                                    value={advancedFilters.dateTo}
                                    onChange={(event) => setAdvancedFilters({ ...advancedFilters, dateTo: event.target.value })}
                                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-normal text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                />
                            </label>
                            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Min Amount
                                <input
                                    type="number"
                                    value={advancedFilters.minAmount}
                                    onChange={(event) => setAdvancedFilters({ ...advancedFilters, minAmount: event.target.value })}
                                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-normal text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                    placeholder="0"
                                />
                            </label>
                            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Max Amount
                                <input
                                    type="number"
                                    value={advancedFilters.maxAmount}
                                    onChange={(event) => setAdvancedFilters({ ...advancedFilters, maxAmount: event.target.value })}
                                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-normal text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                    placeholder="50000"
                                />
                            </label>
                            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Requester
                                <input
                                    type="text"
                                    value={advancedFilters.requester}
                                    onChange={(event) => setAdvancedFilters({ ...advancedFilters, requester: event.target.value })}
                                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-normal text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                    placeholder="Name or email"
                                />
                            </label>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-xs text-gray-500 lg:px-6">
                    <p>
                        Showing <span className="font-semibold text-gray-700">{filteredRequests.length}</span> requests
                        {activeFilterCount > 0 ? ' after filters' : ''}.
                    </p>
                    <p className="hidden sm:block">
                        Page <span className="font-semibold text-gray-700">{currentPage}</span> of <span className="font-semibold text-gray-700">{totalPages}</span>
                    </p>
                </div>

                {filteredRequests.length === 0 ? (
                    <div className="px-6 py-14 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                            <FileText className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-gray-900">No requests match your filters</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Adjust status, search, or advanced filters to find the records you need.
                        </p>
                        {activeFilterCount > 0 && (
                            <Button variant="outline" onClick={handleResetFilters} className="mt-5">
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
                                            <th className="px-6 py-3 font-semibold">Request</th>
                                            <th className="px-6 py-3 font-semibold">Requester</th>
                                            <th className="px-6 py-3 font-semibold">Supplier</th>
                                            <th className="px-6 py-3 font-semibold">Submitted</th>
                                            <th className="px-6 py-3 font-semibold">Amount</th>
                                            <th className="px-6 py-3 font-semibold">Status</th>
                                            <th className="px-6 py-3 font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredRequests.map((request) => {
                                            const { date, time } = getDateAndTime(request.createdAt);
                                            return (
                                                <tr key={request.id} className="bg-white transition hover:bg-primary-50/30">
                                                    <td className="px-6 py-4">
                                                        <p className="font-semibold text-primary-700">#{request.id.slice(0, 8)}</p>
                                                        <p className="mt-0.5 text-xs text-gray-500">{request.items?.length || 0} items</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-medium text-gray-900">{request.requester?.name || 'Unknown'}</p>
                                                        <p className="text-xs text-gray-500">{request.requester?.email || 'No email'}</p>
                                                        <p className="mt-0.5 text-xs text-gray-400">{getDepartmentName(request.requester?.department)}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-medium text-gray-900">{request.supplier?.name || 'Not assigned'}</p>
                                                        {request.supplier?.status ? (
                                                            <p className="mt-0.5 text-xs text-gray-500">{request.supplier.status}</p>
                                                        ) : (
                                                            <p className="mt-0.5 text-xs text-gray-400">Supplier pending</p>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-medium text-gray-900">{date}</p>
                                                        <p className="text-xs text-gray-500">{time}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-base font-semibold text-gray-900">{formatCurrency(Number(request.totalAmount))}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(request.status)}`}>
                                                            {formatStatusLabel(request.status)}
                                                        </span>
                                                        {(request.status === RequestStatus.PENDING || request.status === RequestStatus.IN_PROGRESS) && isSupplierApprovalBlocked(request) && (
                                                            <p className="mt-1 text-xs font-medium text-amber-700">
                                                                Supplier: {getSupplierStatusLabel(request)}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {renderActionArea(request)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="space-y-3 p-4 xl:hidden">
                            {filteredRequests.map((request) => {
                                const { date, time } = getDateAndTime(request.createdAt);
                                return (
                                    <article key={request.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-primary-700">#{request.id.slice(0, 8)}</p>
                                                <p className="mt-0.5 text-xs text-gray-500">{request.items?.length || 0} items</p>
                                            </div>
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(request.status)}`}>
                                                {formatStatusLabel(request.status)}
                                            </span>
                                        </div>

                                        <div className="mt-3 grid gap-2 text-sm">
                                            <p className="text-gray-700">
                                                <span className="font-medium text-gray-900">Requester:</span> {request.requester?.name || 'Unknown'}
                                            </p>
                                            <p className="text-gray-700">
                                                <span className="font-medium text-gray-900">Supplier:</span> {request.supplier?.name || 'Not assigned'}
                                            </p>
                                            <p className="text-gray-700">
                                                <span className="font-medium text-gray-900">Submitted:</span> {date} at {time}
                                            </p>
                                            <p className="text-base font-semibold text-gray-900">{formatCurrency(Number(request.totalAmount))}</p>
                                        </div>

                                        {(request.status === RequestStatus.PENDING || request.status === RequestStatus.IN_PROGRESS) && isSupplierApprovalBlocked(request) && (
                                            <p className="mt-3 text-xs font-medium text-amber-700">
                                                Supplier status requires approval: {getSupplierStatusLabel(request)}
                                            </p>
                                        )}

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {renderActionArea(request)}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </>
                )}
            </section>

            {!loading && totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    total={total}
                    limit={limit}
                    onPageChange={(page) => setCurrentPage(page)}
                />
            )}

            <RequestDetailsModal
                request={selectedRequest}
                isOpen={!!selectedRequest}
                onClose={closeModal}
                onStatusUpdate={handleStatusUpdate}
                onCreateOrder={handleCreateOrder}
                onDownloadPDF={handleDownloadPDF}
                onNavigateToSupplier={navigateToSupplierApproval}
                getSupplierBlockReason={getSupplierApprovalBlockReason}
                isSupplierApprovalBlocked={isSupplierApprovalBlocked}
                isUpdating={selectedRequest ? updating === selectedRequest.id : false}
                canApprove={selectedRequest ? canUserApprove(selectedRequest) : false}
            />

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant as 'warning' | 'danger' | 'info'}
                confirmText={confirmModal.confirmText}
                showCancel={confirmModal.showCancel}
                isLoading={!!updating}
            />
        </div>
    );
}

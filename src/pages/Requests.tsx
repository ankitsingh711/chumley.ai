import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, Filter, Eye, Plus, Check, X, Trash2, Search, ShoppingBag, FileText, ReceiptText, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { RequestsSkeleton } from '../components/skeletons/RequestsSkeleton';
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

export default function Requests() {
    const navigate = useNavigate();
    const { id: requestIdFromUrl } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [requests, setRequests] = useState<PurchaseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | RequestStatusType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [updating, setUpdating] = useState<string | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({
        dateFrom: '',
        dateTo: '',
        minAmount: '',
        maxAmount: '',
        requester: '',
    });

    // Modal State
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
        onConfirm: () => { },
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;

    const filterModalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage]); // Refetch when page changes

    // Auto-open request modal if ID is in URL
    useEffect(() => {
        if (requestIdFromUrl && requests.length > 0) {
            const request = requests.find(r => r.id === requestIdFromUrl);
            if (request) {
                setSelectedRequest(request);
            }
        }
    }, [requestIdFromUrl, requests]);

    // Close filter modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterModalRef.current && !filterModalRef.current.contains(event.target as Node)) {
                setShowFilterModal(false);
            }
        };

        if (showFilterModal) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showFilterModal]);

    const loadRequests = async () => {
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
            await loadRequests(); // Reload to get updated data
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
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    if (selectedRequest?.id === id) closeModal();
                } catch (error) {
                    console.error('Failed to delete request:', error);
                    alert('Failed to delete request');
                } finally {
                    setUpdating(null);
                }
            }
        });
    };

    const handleCreateOrder = async (request: PurchaseRequest) => {
        const supplierId = request.supplierId || request.supplier?.id;

        if (!supplierId) {
            setConfirmModal({
                isOpen: true,
                title: 'Missing Supplier',
                message: 'Cannot create order: No supplier selected for this request.',
                variant: 'info',
                confirmText: 'OK',
                showCancel: false,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Create Purchase Order',
            message: `Are you sure you want to generate a Purchase Order for Request #${request.id.slice(0, 8)}?\n\nAmount: £${Number(request.totalAmount).toLocaleString()}`,
            variant: 'warning',
            confirmText: 'Create Order',
            showCancel: true,
            onConfirm: async () => {
                setUpdating(request.id);
                try {
                    await ordersApi.create({
                        requestId: request.id,
                        supplierId: supplierId,
                        totalAmount: request.totalAmount
                    });
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    navigate('/orders');
                } catch (error: any) {
                    console.error('Failed to create order:', error);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const msg = (error as any).response?.data?.error || 'Failed to create Purchase Order';
                    setConfirmModal({
                        isOpen: true,
                        title: 'Error Creating Order',
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

    const handleViewDetails = (request: PurchaseRequest) => {
        setSelectedRequest(request);
    };

    const closeModal = () => {
        setSelectedRequest(null);
    };

    const handleExportCSV = () => {
        // Convert requests to CSV format
        const headers = ['ID', 'Requester', 'Email', 'Items', 'Date', 'Amount', 'Status'];
        const csvRows = [headers.join(',')];

        filteredRequests.forEach(req => {
            const row = [
                req.id,
                `"${req.requester?.name || 'Unknown'}"`,
                `"${req.requester?.email || ''}"`,
                req.items?.length || 0,
                formatDateTime(req.createdAt),
                Number(req.totalAmount).toFixed(2),
                req.status
            ];
            csvRows.push(row.join(','));
        });

        // Create blob and download
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
        const rows = filteredRequests.map(req => [
            req.id.slice(0, 8),
            req.requester?.name || 'Unknown',
            (req.items?.length || 0).toString(),
            formatDateTime(req.createdAt),
            `£${Number(req.totalAmount).toLocaleString()}`,
            req.status.replace(/_/g, ' ')
        ]);

        pdfService.exportToPDF(
            'Purchase Requests',
            headers,
            rows,
            'purchase_requests'
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
                    address: request.supplier?.contactEmail || ''
                },
                delivery: {
                    recipient: request.requester?.name || 'Aspect Representative',
                    address: request.deliveryLocation || '',
                    date: request.expectedDeliveryDate ? new Date(request.expectedDeliveryDate).toLocaleDateString() : 'N/A'
                },
                items: (request.items || []).map(item => {
                    const gross = Number(item.totalPrice) || 0;
                    const net = gross / 1.2;
                    const vat = gross - net;
                    return {
                        code: item.id ? item.id.slice(0, 6).toUpperCase() : '-',
                        description: item.description,
                        qty: Number(item.quantity) || 1,
                        net,
                        vat,
                        gross
                    };
                }),
                totals: {
                    net: totalNet,
                    vat: totalVat,
                    gross: totalGross
                }
            };

            // If no items available, add a fallback row
            if (documentData.items.length === 0) {
                documentData.items.push({
                    code: 'MISC',
                    description: 'Purchase Request Summary',
                    qty: 1,
                    net: totalNet,
                    vat: totalVat,
                    gross: totalGross
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
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
        }
    };

    // Apply status filter
    let filteredRequests = filter === 'all'
        ? requests
        : filter === RequestStatus.PENDING
            ? requests.filter(req => req.status === RequestStatus.PENDING || req.status === RequestStatus.IN_PROGRESS)
            : requests.filter(req => req.status === filter);

    // Apply search query
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredRequests = filteredRequests.filter(req =>
            req.id.toLowerCase().includes(query) ||
            req.requester?.name?.toLowerCase().includes(query) ||
            req.requester?.email?.toLowerCase().includes(query)
        );
    }

    // Apply advanced filters
    if (advancedFilters.dateFrom) {
        filteredRequests = filteredRequests.filter(req =>
            new Date(req.createdAt) >= new Date(advancedFilters.dateFrom)
        );
    }
    if (advancedFilters.dateTo) {
        filteredRequests = filteredRequests.filter(req =>
            new Date(req.createdAt) <= new Date(advancedFilters.dateTo)
        );
    }
    if (advancedFilters.minAmount) {
        filteredRequests = filteredRequests.filter(req =>
            Number(req.totalAmount) >= Number(advancedFilters.minAmount)
        );
    }
    if (advancedFilters.maxAmount) {
        filteredRequests = filteredRequests.filter(req =>
            Number(req.totalAmount) <= Number(advancedFilters.maxAmount)
        );
    }
    if (advancedFilters.requester) {
        filteredRequests = filteredRequests.filter(req =>
            req.requester?.name?.toLowerCase().includes(advancedFilters.requester.toLowerCase()) ||
            req.requester?.email?.toLowerCase().includes(advancedFilters.requester.toLowerCase())
        );
    }

    const handleApplyFilters = () => {
        setShowFilterModal(false);
    };

    const handleResetFilters = () => {
        setAdvancedFilters({
            dateFrom: '',
            dateTo: '',
            minAmount: '',
            maxAmount: '',
            requester: '',
        });
    };

    // Check if user can approve a specific request
    const canUserApprove = (req: PurchaseRequest) => {
        if (!user) return false;

        // System Admin can approve everything
        if (user.role === UserRole.SYSTEM_ADMIN) return true;

        // Managers can approve requests from their own department
        if (user.role === UserRole.MANAGER || user.role === UserRole.SENIOR_MANAGER) {
            // If request has no requester info, safest is to say no
            if (!req.requester) return false;

            // Check department match
            // Handle case where department is an object (relation) or string (legacy/flat)
            if (typeof req.requester.department === 'object' && req.requester.department !== null) {
                return user.departmentId === req.requester.department.id;
            }

            // Should verify against user.departmentId, but if req has string department name, we can't easily check match unless we know user's department name
            // For now, rely on ID match which is more robust
        }

        return false;
    };

    const normalizeSupplierStatus = (status?: string | null) => status?.trim().toUpperCase() || '';

    const isSupplierApprovalBlocked = (req: PurchaseRequest) => {
        if (!req.supplierId) return false;
        const normalizedStatus = normalizeSupplierStatus(req.supplier?.status);
        if (!normalizedStatus) return false;
        return !APPROVED_SUPPLIER_STATUSES.has(normalizedStatus);
    };

    const getSupplierStatusLabel = (req: PurchaseRequest) => req.supplier?.status?.trim() || 'Unknown';

    const getSupplierApprovalBlockReason = (req: PurchaseRequest) => {
        if (!req.supplierId) return '';
        if (!isSupplierApprovalBlocked(req)) return '';
        return `Cannot approve request until supplier is approved. Current supplier status: ${getSupplierStatusLabel(req)}`;
    };

    const navigateToSupplierApproval = (req: PurchaseRequest) => {
        if (!req.supplierId) return;
        navigate(`/suppliers/${req.supplierId}`);
    };

    if (loading) {
        return <RequestsSkeleton />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Purchase Requests</h1>
                    <p className="text-sm text-gray-500">Manage and track internal purchase requisitions.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleExportCSV}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
                    <Button variant="outline" onClick={handleExportPDF}><FileText className="mr-2 h-4 w-4" /> Export PDF</Button>
                    {user?.role !== UserRole.SYSTEM_ADMIN && (
                        <Button onClick={() => navigate('/requests/new')}><Plus className="mr-2 h-4 w-4" /> New Request</Button>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-xl">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={filter === 'all' ? 'bg-white border shadow-sm' : ''}
                            onClick={() => setFilter('all')}
                        >
                            All Requests
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={filter === RequestStatus.PENDING ? 'bg-white border shadow-sm' : ''}
                            onClick={() => setFilter(RequestStatus.PENDING)}
                        >
                            Pending
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={filter === RequestStatus.APPROVED ? 'bg-white border shadow-sm' : ''}
                            onClick={() => setFilter(RequestStatus.APPROVED)}
                        >
                            Approved
                        </Button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search requests..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white"
                            />
                        </div>

                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-500"
                                onClick={() => setShowFilterModal(!showFilterModal)}
                            >
                                <Filter className="h-4 w-4 mr-2" /> Filter
                            </Button>

                            {/* Filter Dropdown */}
                            {showFilterModal && (
                                <div ref={filterModalRef} className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-gray-900">Advanced Filters</h3>
                                            <button onClick={handleResetFilters} className="text-xs text-primary-600 hover:text-primary-700">
                                                Reset All
                                            </button>
                                        </div>

                                        {/* Date Range */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-2">Date Range</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="date"
                                                    value={advancedFilters.dateFrom}
                                                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateFrom: e.target.value })}
                                                    className="rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
                                                    placeholder="From"
                                                />
                                                <input
                                                    type="date"
                                                    value={advancedFilters.dateTo}
                                                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateTo: e.target.value })}
                                                    className="rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
                                                    placeholder="To"
                                                />
                                            </div>
                                        </div>

                                        {/* Amount Range */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-2">Amount Range</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="number"
                                                    value={advancedFilters.minAmount}
                                                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, minAmount: e.target.value })}
                                                    className="rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
                                                    placeholder="Min (£)"
                                                />
                                                <input
                                                    type="number"
                                                    value={advancedFilters.maxAmount}
                                                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, maxAmount: e.target.value })}
                                                    className="rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
                                                    placeholder="Max (£)"
                                                />
                                            </div>
                                        </div>

                                        {/* Requester Search */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-2">Requester</label>
                                            <input
                                                type="text"
                                                value={advancedFilters.requester}
                                                onChange={(e) => setAdvancedFilters({ ...advancedFilters, requester: e.target.value })}
                                                className="w-full rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
                                                placeholder="Search by name or email"
                                            />
                                        </div>

                                        {/* Apply Button */}
                                        <Button
                                            onClick={handleApplyFilters}
                                            className="w-full bg-primary-600 hover:bg-primary-600"
                                            size="sm"
                                        >
                                            Apply Filters
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {filteredRequests.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 rounded-b-xl">
                        No requests found. {filter !== 'all' && 'Try changing the filter.'}
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-b-xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white border-b border-gray-100 text-gray-500 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4 font-medium">ID</th>
                                    <th className="px-6 py-4 font-medium">Requester</th>
                                    <th className="px-6 py-4 font-medium">Items</th>
                                    <th className="px-6 py-4 font-medium">Date</th>
                                    <th className="px-6 py-4 font-medium">Amount</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium">Actions</th>
                                    <th className="px-6 py-4 font-medium text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRequests.map((req) => (
                                    <tr key={req.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 font-medium text-primary-600">
                                            #{req.id.slice(0, 8)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                                                    {req.requester?.name?.charAt(0) || 'U'}
                                                </div>
                                                <span className="font-medium text-gray-900">{req.requester?.name || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">{req.items?.length || 0} items</td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {(() => {
                                                const { date, time } = getDateAndTime(req.createdAt);
                                                return (
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900">{date}</span>
                                                        <span className="text-xs text-gray-500">{time}</span>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">£{Number(req.totalAmount).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium 
                                            ${req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' :
                                                    req.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-700' :
                                                        req.status === RequestStatus.PENDING ? 'bg-blue-50 text-blue-700' :
                                                            'bg-gray-100 text-gray-700'}`}>
                                                {req.status === RequestStatus.IN_PROGRESS ? 'IN PROGRESS' : req.status}
                                            </span>
                                            {(req.status === RequestStatus.PENDING || req.status === RequestStatus.IN_PROGRESS) &&
                                                isSupplierApprovalBlocked(req) && (
                                                <div className="mt-1.5">
                                                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                                        Supplier: {getSupplierStatusLabel(req)}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {canUserApprove(req) && (req.status === RequestStatus.PENDING || req.status === RequestStatus.IN_PROGRESS) && (
                                                isSupplierApprovalBlocked(req) && req.supplierId ? (
                                                    <button
                                                        className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                                                        onClick={() => navigateToSupplierApproval(req)}
                                                        title={getSupplierApprovalBlockReason(req)}
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        Review Supplier
                                                    </button>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="p-1.5 rounded hover:bg-green-50 text-green-600 disabled:opacity-50"
                                                            onClick={() => handleStatusUpdate(req.id, RequestStatus.APPROVED)}
                                                            disabled={updating === req.id}
                                                            title="Approve"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            className="p-1.5 rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
                                                            onClick={() => handleStatusUpdate(req.id, RequestStatus.REJECTED)}
                                                            disabled={updating === req.id}
                                                            title="Reject"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                            {/* User can delete their own draft only if they are NOT an approver who sees approval actions (avoids duplicates/confusion) */}
                                            {req.status === RequestStatus.IN_PROGRESS && (user?.id === req.requesterId || user?.role === UserRole.SYSTEM_ADMIN) && !canUserApprove(req) && (
                                                <div className="flex gap-2">
                                                    <button
                                                        className="p-1.5 rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
                                                        onClick={() => handleDelete(req.id)}
                                                        disabled={updating === req.id}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Create PO Button for Approved Requests */}
                                            {req.status === RequestStatus.APPROVED && (
                                                req.order ? (
                                                    <button
                                                        className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 disabled:opacity-50"
                                                        onClick={() => navigate(`/orders?search=${req.order?.id}`)} // Or navigate to specific order
                                                        title="View Purchase Order"
                                                    >
                                                        <ReceiptText className="h-4 w-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="p-1.5 rounded hover:bg-blue-50 text-blue-600 disabled:opacity-50"
                                                        onClick={() => handleCreateOrder(req)}
                                                        disabled={updating === req.id}
                                                        title="Create Purchase Order"
                                                    >
                                                        <ShoppingBag className="h-4 w-4" />
                                                    </button>
                                                )
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleViewDetails(req)}
                                                className="p-1 hover:text-primary-600 text-gray-400"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Request Detail Modal */}
            {
                selectedRequest && createPortal(
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
                                    <h2 className="text-xl font-bold text-gray-900">Request Details</h2>
                                    <p className="text-sm text-gray-500">#{selectedRequest.id.slice(0, 8)}</p>
                                </div>
                                <button
                                    onClick={closeModal}
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
                                        ${selectedRequest.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' :
                                                selectedRequest.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-700' :
                                                    selectedRequest.status === RequestStatus.PENDING ? 'bg-blue-50 text-blue-700' :
                                                        'bg-gray-100 text-gray-700'}`}>
                                            {selectedRequest.status === RequestStatus.IN_PROGRESS ? 'IN PROGRESS' : selectedRequest.status}
                                        </span>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Total Amount</p>
                                        <p className="text-2xl font-bold text-gray-900">£{Number(selectedRequest.totalAmount).toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Information Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Supplier Info */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Supplier Information</h3>
                                        {selectedRequest.supplier ? (
                                            <div className="bg-gray-50 rounded-lg p-4 space-y-2 h-full">
                                                <div className="flex items-center gap-3">
                                                    {selectedRequest.supplier.logoUrl ? (
                                                        <img
                                                            src={selectedRequest.supplier.logoUrl}
                                                            alt={selectedRequest.supplier.name}
                                                            className="h-10 w-10 rounded-full object-cover bg-white ring-2 ring-gray-100"
                                                        />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold ring-2 ring-white">
                                                            {selectedRequest.supplier.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-gray-900">{selectedRequest.supplier.name}</p>
                                                        <p className="text-sm text-gray-500">{selectedRequest.supplier.category}</p>
                                                    </div>
                                                </div>
                                                {(selectedRequest.supplier.contactName || selectedRequest.supplier.contactEmail) && (
                                                    <div className="pt-3 mt-1 border-t border-gray-200">
                                                        <p className="text-xs text-gray-500 uppercase mb-1">Contact Person</p>
                                                        {selectedRequest.supplier.contactName && (
                                                            <p className="text-sm font-medium text-gray-900">{selectedRequest.supplier.contactName}</p>
                                                        )}
                                                        {selectedRequest.supplier.contactEmail && (
                                                            <p className="text-sm text-gray-500">{selectedRequest.supplier.contactEmail}</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50 rounded-lg p-4 h-full flex items-center justify-center text-gray-400 text-sm italic">
                                                No supplier selected
                                            </div>
                                        )}
                                    </div>

                                    {/* Requester Info */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Requester Information</h3>
                                        <div className="bg-gray-50 rounded-lg p-4 space-y-2 h-full">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold ring-2 ring-white">
                                                    {selectedRequest.requester?.name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{selectedRequest.requester?.name || 'Unknown'}</p>
                                                    <p className="text-sm text-gray-500">{selectedRequest.requester?.email}</p>
                                                </div>
                                            </div>
                                            {selectedRequest.requester?.department && (
                                                <div className="pt-3 mt-1 border-t border-gray-200">
                                                    <p className="text-xs text-gray-500 uppercase mb-1">Department</p>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {typeof selectedRequest.requester.department === 'object'
                                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                            ? (selectedRequest.requester.department as any)?.name
                                                            : selectedRequest.requester.department}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Items */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Items ({selectedRequest.items?.length || 0})</h3>
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
                                                {selectedRequest.items?.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3">{item.description}</td>
                                                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                                                        <td className="px-4 py-3 text-right">£{Number(item.unitPrice).toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-right font-medium">£{Number(item.quantity * item.unitPrice).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Created</p>
                                        <p className="text-sm text-gray-900">{new Date(selectedRequest.createdAt).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Last Updated</p>
                                        <p className="text-sm text-gray-900">{new Date(selectedRequest.updatedAt).toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                {canUserApprove(selectedRequest) && (selectedRequest.status === RequestStatus.PENDING || selectedRequest.status === RequestStatus.IN_PROGRESS) && (
                                    isSupplierApprovalBlocked(selectedRequest) && selectedRequest.supplierId ? (
                                        <div className="pt-4 border-t space-y-2">
                                            <Button
                                                onClick={() => {
                                                    navigateToSupplierApproval(selectedRequest);
                                                    closeModal();
                                                }}
                                                variant="outline"
                                                className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                                                title={getSupplierApprovalBlockReason(selectedRequest)}
                                            >
                                                <ExternalLink className="mr-2 h-4 w-4" /> Open Supplier To Approve
                                            </Button>
                                            <p className="text-xs text-amber-700">
                                                {getSupplierApprovalBlockReason(selectedRequest)}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="pt-4 border-t flex gap-3">
                                            <Button
                                                onClick={() => {
                                                    handleStatusUpdate(selectedRequest.id, RequestStatus.APPROVED);
                                                    closeModal();
                                                }}
                                                className="flex-1 bg-green-600 hover:bg-green-700"
                                                disabled={updating === selectedRequest.id}
                                                title="Approve"
                                            >
                                                <Check className="mr-2 h-4 w-4" /> Approve
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    handleStatusUpdate(selectedRequest.id, RequestStatus.REJECTED);
                                                    closeModal();
                                                }}
                                                variant="outline"
                                                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                                            >
                                                <X className="mr-2 h-4 w-4" /> Reject
                                            </Button>
                                        </div>
                                    )
                                )}

                                <div className="pt-4 border-t flex flex-wrap gap-3">
                                    <Button onClick={() => handleDownloadPDF(selectedRequest)} variant="outline" className="flex-1">
                                        <FileText className="mr-2 h-4 w-4" /> Download PDF
                                    </Button>
                                </div>

                                {/* Create PO Action for Approved Requests */}
                                {selectedRequest.status === RequestStatus.APPROVED && (
                                    selectedRequest.order ? (
                                        <div className="pt-4 border-t">
                                            <Button
                                                onClick={() => navigate(`/orders?search=${selectedRequest.order?.id}`)}
                                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                                                disabled={updating === selectedRequest.id}
                                            >
                                                <ReceiptText className="mr-2 h-4 w-4" /> View Purchase Order
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="pt-4 border-t">
                                            <Button
                                                onClick={() => handleCreateOrder(selectedRequest)}
                                                className="w-full bg-blue-600 hover:bg-blue-700"
                                                disabled={updating === selectedRequest.id}
                                            >
                                                <ShoppingBag className="mr-2 h-4 w-4" /> Create Purchase Order
                                            </Button>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="mt-6">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        total={total}
                        limit={limit}
                        onPageChange={(page) => setCurrentPage(page)}
                    />
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
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

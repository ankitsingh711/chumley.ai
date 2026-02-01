import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Filter, Eye, Plus, Check, X, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { requestsApi } from '../services/requests.service';
import type { PurchaseRequest, RequestStatus as RequestStatusType } from '../types/api';
import { RequestStatus, UserRole } from '../types/api';

export default function Requests() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [requests, setRequests] = useState<PurchaseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | RequestStatusType>('all');
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
    const filterModalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadRequests();
    }, []);

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
            const data = await requestsApi.getAll();
            setRequests(data);
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
            alert('Failed to update request status');
        } finally {
            setUpdating(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this request?')) return;
        setUpdating(id);
        try {
            await requestsApi.delete(id);
            await loadRequests();
        } catch (error) {
            console.error('Failed to delete request:', error);
            alert('Failed to delete request');
        } finally {
            setUpdating(null);
        }
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
                new Date(req.createdAt).toLocaleDateString(),
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

    // Apply status filter
    let filteredRequests = filter === 'all'
        ? requests
        : requests.filter(req => req.status === filter);

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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
        );
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
                    <Button onClick={() => navigate('/requests/new')}><Plus className="mr-2 h-4 w-4" /> New Request</Button>
                </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
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
                                        <button onClick={handleResetFilters} className="text-xs text-teal-600 hover:text-teal-700">
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
                                                className="rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                                                placeholder="From"
                                            />
                                            <input
                                                type="date"
                                                value={advancedFilters.dateTo}
                                                onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateTo: e.target.value })}
                                                className="rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
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
                                                className="rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                                                placeholder="Min ($)"
                                            />
                                            <input
                                                type="number"
                                                value={advancedFilters.maxAmount}
                                                onChange={(e) => setAdvancedFilters({ ...advancedFilters, maxAmount: e.target.value })}
                                                className="rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                                                placeholder="Max ($)"
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
                                            className="w-full rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                                            placeholder="Search by name or email"
                                        />
                                    </div>

                                    {/* Apply Button */}
                                    <Button
                                        onClick={handleApplyFilters}
                                        className="w-full bg-teal-600 hover:bg-teal-700"
                                        size="sm"
                                    >
                                        Apply Filters
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {filteredRequests.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        No requests found. {filter !== 'all' && 'Try changing the filter.'}
                    </div>
                ) : (
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
                                    <td className="px-6 py-4 font-medium text-teal-600">
                                        #{req.id.slice(0, 8)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold text-sm">
                                                {req.requester?.name?.charAt(0) || 'U'}
                                            </div>
                                            <span className="font-medium text-gray-900">{req.requester?.name || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{req.items?.length || 0} items</td>
                                    <td className="px-6 py-4 text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900">${Number(req.totalAmount).toLocaleString()}</td>
                                    <td className="px-6 py-4">

                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium 
                                            ${req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' :
                                                req.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-700' :
                                                    req.status === RequestStatus.PENDING ? 'bg-blue-50 text-blue-700' :
                                                        'bg-gray-100 text-gray-700'}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    {/* Action Column */}
                                    <td className="px-6 py-4">
                                        {canUserApprove(req) && (req.status === RequestStatus.PENDING || req.status === RequestStatus.DRAFT) && (
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
                                        )}
                                        {/* User can delete their own draft only if they are NOT an approver who sees approval actions (avoids duplicates/confusion) */}
                                        {req.status === RequestStatus.DRAFT && (user?.id === req.requesterId || user?.role === UserRole.SYSTEM_ADMIN) && !canUserApprove(req) && (
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
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleViewDetails(req)}
                                            className="p-1 hover:text-teal-600 text-gray-400"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Request Detail Modal */}
            {selectedRequest && (
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
                                        {selectedRequest.status}
                                    </span>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Total Amount</p>
                                    <p className="text-2xl font-bold text-gray-900">${Number(selectedRequest.totalAmount).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Requester Info */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">Requester Information</h3>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold">
                                            {selectedRequest.requester?.name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{selectedRequest.requester?.name || 'Unknown'}</p>
                                            <p className="text-sm text-gray-500">{selectedRequest.requester?.email}</p>
                                        </div>
                                    </div>
                                    {selectedRequest.requester?.department && (
                                        <div className="pt-2 border-t">
                                            <p className="text-xs text-gray-500">Department</p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {typeof selectedRequest.requester.department === 'object'
                                                    ? selectedRequest.requester.department?.name
                                                    : selectedRequest.requester.department}
                                            </p>
                                        </div>
                                    )}
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
                                                    <td className="px-4 py-3 text-right">${Number(item.unitPrice).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-right font-medium">${Number(item.quantity * item.unitPrice).toLocaleString()}</td>
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
                            {canUserApprove(selectedRequest) && (selectedRequest.status === RequestStatus.PENDING || selectedRequest.status === RequestStatus.DRAFT) && (
                                <div className="pt-4 border-t flex gap-3">
                                    <Button
                                        onClick={() => {
                                            handleStatusUpdate(selectedRequest.id, RequestStatus.APPROVED);
                                            closeModal();
                                        }}
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                        <Check className="mr-2 h-4 w-4" /> Approve Request
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            handleStatusUpdate(selectedRequest.id, RequestStatus.REJECTED);
                                            closeModal();
                                        }}
                                        variant="outline"
                                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                                    >
                                        <X className="mr-2 h-4 w-4" /> Reject Request
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

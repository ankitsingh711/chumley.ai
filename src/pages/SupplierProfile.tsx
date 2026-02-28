import {
    MapPin,
    CreditCard,
    Shield,
    FileText,
    Star,
    Phone,
    Plus,
} from 'lucide-react';
import { pdfService } from '../services/pdf.service';
import { Button } from '../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { SupplierProfileSkeleton } from '../components/skeletons/SupplierProfileSkeleton';
import { useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { suppliersApi } from '../services/suppliers.service';
import type { Supplier, InteractionLog, Review, PurchaseRequest } from '../types/api';
import { UserRole } from '../types/api';
import { EditSupplierModal } from '../components/suppliers/EditSupplierModal';
import { MessageSupplierModal } from '../components/suppliers/MessageSupplierModal';
import { AddDocumentModal } from '../components/suppliers/AddDocumentModal';
import { WriteReviewModal } from '../components/suppliers/WriteReviewModal';
import { RequestDetailsModal } from '../components/requests/RequestDetailsModal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { useAuth } from '../hooks/useAuth';

const normalizeStatus = (status?: string) => (status || '').trim().toLowerCase().replace(/\s+/g, '_');

const getSupplierStatusLabel = (status?: string) => {
    const normalized = normalizeStatus(status);

    switch (normalized) {
        case 'preferred':
            return 'Preferred';
        case 'standard':
            return 'Standard';
        case 'active':
            return 'Active';
        case 'review_pending':
        case 'pending':
            return 'Review Pending';
        case 'rejected':
            return 'Rejected';
        default:
            return status || 'Standard';
    }
};

const getSupplierStatusClasses = (status?: string) => {
    const normalized = normalizeStatus(status);

    switch (normalized) {
        case 'preferred':
        case 'active':
            return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
        case 'standard':
            return 'border border-blue-200 bg-blue-50 text-blue-700';
        case 'review_pending':
        case 'pending':
            return 'border border-amber-200 bg-amber-50 text-amber-700';
        case 'rejected':
            return 'border border-rose-200 bg-rose-50 text-rose-700';
        default:
            return 'border border-gray-200 bg-gray-100 text-gray-700';
    }
};

const getRequestStatusClasses = (status: string) => {
    const normalized = normalizeStatus(status);

    switch (normalized) {
        case 'approved':
            return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
        case 'pending':
            return 'border border-amber-200 bg-amber-50 text-amber-700';
        case 'in_progress':
            return 'border border-sky-200 bg-sky-50 text-sky-700';
        case 'rejected':
            return 'border border-rose-200 bg-rose-50 text-rose-700';
        default:
            return 'border border-gray-200 bg-gray-100 text-gray-700';
    }
};

const formatCurrency = (value: number) =>
    `£${Number(value || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

export default function SupplierProfile() {
    const { user } = useAuth();
    const { id } = useParams<{ id: string }>();

    const isSystemAdmin = user?.role === UserRole.SYSTEM_ADMIN;
    const canReviewSupplier =
        user?.role === UserRole.SYSTEM_ADMIN
        || user?.role === UserRole.SENIOR_MANAGER
        || user?.role === UserRole.MANAGER;

    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [showEditModal, setShowEditModal] = useState(false);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false);

    const [interactions, setInteractions] = useState<InteractionLog[]>([]);
    const [showAddLog, setShowAddLog] = useState(false);
    const [newLog, setNewLog] = useState({ title: '', description: '', eventType: 'meeting', date: '' });

    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsPage, setReviewsPage] = useState(1);
    const [reviewsTotal, setReviewsTotal] = useState(0);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectingSupplier, setRejectingSupplier] = useState(false);
    const [rejectError, setRejectError] = useState<string | null>(null);

    const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestFilter, setRequestFilter] = useState('ALL');

    const fetchReviews = async (pageNum = 1, append = false) => {
        if (!id) return;

        try {
            setLoadingReviews(true);
            const { data, meta } = await suppliersApi.getReviews(id, pageNum);

            if (append) {
                setReviews((prev) => [...prev, ...data]);
            } else {
                setReviews(data);
            }

            setReviewsTotal(meta.total);
            setReviewsPage(pageNum);
        } catch (error) {
            console.error('Failed to fetch reviews:', error);
        } finally {
            setLoadingReviews(false);
        }
    };

    useEffect(() => {
        const fetchSupplier = async () => {
            if (!id) return;

            try {
                setIsLoading(true);

                const [supplierData, interactionData] = await Promise.all([
                    suppliersApi.getDetails(id),
                    suppliersApi.getInteractions(id),
                ]);

                setSupplier(supplierData);
                setInteractions(interactionData);
                await fetchReviews(1, false);
            } catch (error) {
                console.error('Failed to fetch supplier:', error);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchSupplier();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const filteredRequests = useMemo(() => {
        const requests = supplier?.requests || [];

        if (requestFilter === 'ALL') return requests;
        return requests.filter((request) => request.status === requestFilter);
    }, [supplier?.requests, requestFilter]);

    const statusLabel = getSupplierStatusLabel(supplier?.status);
    const statusClasses = getSupplierStatusClasses(supplier?.status);
    const statusKey = normalizeStatus(supplier?.status);
    const isPendingReview = statusKey === 'review_pending' || statusKey === 'pending';

    const initials = supplier?.name
        ? supplier.name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : '??';

    const rating = supplier?.details?.rating ? Number(supplier.details.rating).toFixed(1) : '0.0';
    const reviewCount = supplier?.details?.reviewCount || 0;
    const activeOrders = supplier?.stats?.activeOrders || 0;
    const totalSpend = supplier?.stats?.totalSpend || 0;
    const reliabilityScore = supplier?.details
        ? Math.round(((supplier.details.qualityScore || 0) + (supplier.details.communicationScore || 0)) / 2)
        : 0;

    const handleConfirmRejectSupplier = async () => {
        if (!supplier) return;

        setRejectingSupplier(true);
        setRejectError(null);

        try {
            const updated = await suppliersApi.reject(supplier.id);
            setSupplier(updated);
            setShowRejectModal(false);
        } catch (error) {
            const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
                || 'Failed to reject supplier. Please try again.';
            setRejectError(message);
            console.error('Failed to reject supplier', error);
        } finally {
            setRejectingSupplier(false);
        }
    };

    const handleApproveSupplier = async () => {
        if (!supplier) return;

        try {
            const updated = await suppliersApi.approve(supplier.id);
            setSupplier(updated);
        } catch (error) {
            console.error('Failed to approve supplier', error);
        }
    };

    if (isLoading) {
        return <SupplierProfileSkeleton />;
    }

    if (!supplier) {
        return <div className="flex h-64 items-center justify-center">Supplier not found</div>;
    }

    return (
        <div className="space-y-6">
            <section className="relative rounded-2xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/60 to-accent-50/70 p-6 shadow-sm">
                <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary-200/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-accent-200/50 blur-3xl" />

                <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex gap-4">
                        {supplier.logoUrl ? (
                            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                                <img
                                    src={supplier.logoUrl}
                                    alt={supplier.name}
                                    className="h-full w-full object-cover"
                                    onError={(event) => {
                                        (event.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-900 text-3xl font-bold text-white">
                                {initials}
                            </div>
                        )}

                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-3xl font-bold text-gray-900">{supplier.name}</h1>
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${statusClasses}`}>
                                    {statusLabel}
                                </span>
                            </div>

                            <p className="mt-1 text-sm text-gray-600">{supplier.category} | ID: {supplier.id.slice(0, 8)}</p>

                            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                <div className="inline-flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span>{rating}</span>
                                    <span className="text-gray-500">({reviewCount} reviews)</span>
                                </div>

                                {(supplier.details?.city || supplier.details?.state || supplier.details?.address || supplier.details?.country) && (
                                    <div className="inline-flex items-center gap-1">
                                        <MapPin className="h-4 w-4 text-gray-400" />
                                        <span>
                                            {[supplier.details?.city, supplier.details?.state].filter(Boolean).join(', ')
                                                || supplier.details?.address
                                                || supplier.details?.country}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {canReviewSupplier && isPendingReview ? (
                            <>
                                <Button
                                    variant="outline"
                                    className="border-red-200 text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                        setRejectError(null);
                                        setShowRejectModal(true);
                                    }}
                                >
                                    Reject
                                </Button>
                                <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleApproveSupplier}>
                                    Approve Supplier
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" onClick={() => setShowMessageModal(true)}>
                                    Message
                                </Button>
                                {isSystemAdmin && (
                                    <Button onClick={() => setShowEditModal(true)}>Edit Profile</Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <Tabs defaultValue="overview">
                    <TabsList className="mb-4 h-auto w-full justify-start gap-2 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-1.5 no-scrollbar">
                        <TabsTrigger value="overview" className="rounded-lg px-4 py-2 text-sm">Overview</TabsTrigger>
                        <TabsTrigger value="orders" className="rounded-lg px-4 py-2 text-sm">Purchase Orders</TabsTrigger>
                        <TabsTrigger value="compliance" className="rounded-lg px-4 py-2 text-sm">Compliance & Documents</TabsTrigger>
                        <TabsTrigger value="performance" className="rounded-lg px-4 py-2 text-sm">Performance</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Spend (YTD)</p>
                                <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(totalSpend)}</p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Active Orders</p>
                                <p className="mt-2 text-3xl font-bold text-gray-900">{activeOrders.toString().padStart(2, '0')}</p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reliability Score</p>
                                <p className="mt-2 text-3xl font-bold text-emerald-700">{reliabilityScore}%</p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quality / Comms</p>
                                <p className="mt-2 text-3xl font-bold text-primary-700">{supplier.details?.qualityScore || 0}% / {supplier.details?.communicationScore || 0}%</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                            <div className="space-y-6 xl:col-span-2">
                                <section className="rounded-xl border border-gray-200 bg-white p-5">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900">Recent Requests & Orders</h3>
                                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Latest {Math.min(6, supplier.requests?.length || 0)}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {supplier.requests && supplier.requests.length > 0 ? (
                                            supplier.requests.slice(0, 6).map((request) => (
                                                <button
                                                    key={request.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedRequest(request);
                                                        setShowRequestModal(true);
                                                    }}
                                                    className="grid w-full grid-cols-12 items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-left text-sm transition hover:border-primary-200 hover:bg-primary-50/30"
                                                >
                                                    <span className="col-span-4 font-semibold text-primary-700">#{request.id.slice(0, 8)}</span>
                                                    <span className="col-span-3 text-gray-500">{new Date(request.createdAt).toLocaleDateString('en-GB')}</span>
                                                    <span className="col-span-2 font-semibold text-gray-900">{formatCurrency(Number(request.totalAmount))}</span>
                                                    <span className={`col-span-3 inline-flex justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${getRequestStatusClasses(request.status)}`}>
                                                        {request.status.replace(/_/g, ' ')}
                                                    </span>
                                                </button>
                                            ))
                                        ) : (
                                            <p className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">No recent activity.</p>
                                        )}
                                    </div>
                                </section>

                                <section className="rounded-xl border border-gray-200 bg-white p-5">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900">Compliance Snapshot</h3>
                                        <Button variant="outline" size="sm" onClick={() => setIsAddDocumentOpen(true)}>
                                            <Plus className="mr-1 h-4 w-4" /> Upload
                                        </Button>
                                    </div>

                                    {supplier.documents && supplier.documents.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            {supplier.documents.slice(0, 4).map((document) => (
                                                <button
                                                    key={document.id}
                                                    type="button"
                                                    className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-left transition hover:border-primary-200"
                                                    onClick={() => window.open(document.url, '_blank')}
                                                >
                                                    <div className="rounded-lg bg-white p-2">
                                                        {document.type === 'Insurance' ? (
                                                            <Shield className="h-5 w-5 text-blue-600" />
                                                        ) : (
                                                            <FileText className="h-5 w-5 text-purple-600" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-gray-900">{document.title}</p>
                                                        <p className="text-xs text-gray-500">{document.status}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">No documents uploaded.</p>
                                    )}
                                </section>

                                <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Internal Procurement Notes</h4>
                                    <p className="text-sm text-amber-900">
                                        {supplier.details?.internalNotes || 'No internal notes available for this supplier.'}
                                    </p>
                                </section>
                            </div>

                            <div className="space-y-6">
                                <section className="rounded-xl border border-gray-200 bg-white p-5">
                                    <h3 className="text-lg font-semibold text-gray-900">Contact Details</h3>
                                    <div className="mt-4 space-y-4 text-sm">
                                        <div className="flex gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                                                {(supplier.contactName || supplier.name).charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">{supplier.contactName || supplier.name}</p>
                                                <p className="text-xs text-gray-500">Account Manager</p>
                                                <p className="text-xs text-primary-700">{supplier.contactEmail || 'No email available'}</p>
                                            </div>
                                        </div>

                                        {(supplier.details?.address || supplier.details?.city || supplier.details?.state) && (
                                            <div className="flex gap-3">
                                                <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                                                <div>
                                                    <p className="text-xs uppercase tracking-wide text-gray-500">Mailing Address</p>
                                                    <p className="text-gray-900">
                                                        {supplier.details?.address || ''}
                                                        {supplier.details?.address && (supplier.details?.city || supplier.details?.state) ? ', ' : ''}
                                                        {[supplier.details?.city, supplier.details?.state].filter(Boolean).join(', ')}
                                                        {supplier.details?.zipCode ? ` ${supplier.details.zipCode}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {supplier.details?.phone && (
                                            <div className="flex gap-3">
                                                <Phone className="mt-0.5 h-4 w-4 text-gray-400" />
                                                <div>
                                                    <p className="text-xs uppercase tracking-wide text-gray-500">Phone</p>
                                                    <p className="text-gray-900">{supplier.details.phone}</p>
                                                </div>
                                            </div>
                                        )}

                                        {(supplier.details?.paymentTerms || supplier.details?.paymentMethod) && (
                                            <div className="flex gap-3">
                                                <CreditCard className="mt-0.5 h-4 w-4 text-gray-400" />
                                                <div>
                                                    <p className="text-xs uppercase tracking-wide text-gray-500">Payment</p>
                                                    <p className="text-gray-900">{supplier.details?.paymentTerms || 'N/A'}</p>
                                                    {supplier.details?.paymentMethod && <p className="text-xs text-gray-500">Via {supplier.details.paymentMethod}</p>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <section className="rounded-xl border border-gray-200 bg-white p-5">
                                    <h3 className="text-lg font-semibold text-gray-900">Interaction Timeline</h3>

                                    <div className="mt-4 space-y-4 border-l border-gray-200 pl-4">
                                        {interactions.length > 0 ? (
                                            interactions.map((interaction, index) => (
                                                <div key={interaction.id} className="relative">
                                                    <span className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${index === 0 ? 'bg-primary-600' : 'bg-gray-300'}`} />
                                                    <p className="text-sm font-medium text-gray-900">{interaction.title}</p>
                                                    <p className="text-xs text-gray-500">{new Date(interaction.eventDate).toLocaleString('en-GB')}</p>
                                                    {interaction.description && <p className="mt-1 text-xs text-gray-600">{interaction.description}</p>}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-gray-500">No interactions logged yet.</p>
                                        )}
                                    </div>

                                    {showAddLog ? (
                                        <div className="mt-4 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                            <input
                                                type="text"
                                                placeholder="Event title"
                                                value={newLog.title}
                                                onChange={(event) => setNewLog({ ...newLog, title: event.target.value })}
                                                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                                            />
                                            <textarea
                                                placeholder="Description (optional)"
                                                value={newLog.description}
                                                onChange={(event) => setNewLog({ ...newLog, description: event.target.value })}
                                                className="w-full resize-none rounded border border-gray-200 px-3 py-2 text-sm"
                                                rows={2}
                                            />
                                            <Select
                                                value={newLog.eventType}
                                                onChange={(value) => setNewLog({ ...newLog, eventType: value })}
                                                options={[
                                                    { value: 'meeting', label: 'Meeting' },
                                                    { value: 'call', label: 'Call' },
                                                    { value: 'email', label: 'Email' },
                                                    { value: 'contract', label: 'Contract' },
                                                    { value: 'other', label: 'Other' },
                                                ]}
                                                placeholder="Select type"
                                                className="w-full"
                                            />
                                            <DatePicker
                                                value={newLog.date}
                                                onChange={(value) => setNewLog({ ...newLog, date: value })}
                                                placeholder="Event date (optional)"
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    className="flex-1"
                                                    onClick={() => {
                                                        setShowAddLog(false);
                                                        setNewLog({ title: '', description: '', eventType: 'meeting', date: '' });
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    className="flex-1"
                                                    onClick={async () => {
                                                        if (!id || !newLog.title) return;

                                                        try {
                                                            const created = await suppliersApi.createInteraction(id, {
                                                                title: newLog.title,
                                                                description: newLog.description,
                                                                eventType: newLog.eventType,
                                                                eventDate: newLog.date ? new Date(newLog.date).toISOString() : new Date().toISOString(),
                                                            });
                                                            setInteractions((prev) => [created, ...prev]);
                                                            setShowAddLog(false);
                                                            setNewLog({ title: '', description: '', eventType: 'meeting', date: '' });
                                                        } catch (error) {
                                                            console.error('Failed to add log:', error);
                                                        }
                                                    }}
                                                >
                                                    Add Entry
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button variant="outline" className="mt-4 w-full" onClick={() => setShowAddLog(true)}>
                                            Add Log Entry
                                        </Button>
                                    )}
                                </section>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="orders" className="space-y-4">
                        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Purchase Orders History</h3>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            const headers = ['Order ID', 'Date', 'Items', 'Amount', 'Status'];
                                            const rows = filteredRequests.map((request) => [
                                                request.id.slice(0, 8),
                                                new Date(request.createdAt).toLocaleDateString('en-GB'),
                                                (request.items?.length || 1).toString(),
                                                formatCurrency(Number(request.totalAmount)),
                                                request.status.replace(/_/g, ' '),
                                            ]);
                                            pdfService.exportToPDF(
                                                `Purchase Orders - ${supplier.name}`,
                                                headers,
                                                rows,
                                                `purchase_orders_${supplier.name.replace(/\s+/g, '_').toLowerCase()}`,
                                            );
                                        }}
                                    >
                                        <FileText className="mr-2 h-4 w-4" /> Export PDF
                                    </Button>

                                    <div className="w-44">
                                        <Select
                                            value={requestFilter}
                                            onChange={setRequestFilter}
                                            options={[
                                                { value: 'ALL', label: 'All Status' },
                                                { value: 'APPROVED', label: 'Approved' },
                                                { value: 'PENDING', label: 'Pending' },
                                                { value: 'IN_PROGRESS', label: 'In Progress' },
                                                { value: 'REJECTED', label: 'Rejected' },
                                            ]}
                                            placeholder="Filter status"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[820px] text-left text-sm">
                                    <thead className="border-b border-gray-100 bg-white text-xs uppercase tracking-wide text-gray-500">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Order</th>
                                            <th className="px-6 py-3 font-semibold">Date</th>
                                            <th className="px-6 py-3 font-semibold">Items</th>
                                            <th className="px-6 py-3 font-semibold">Amount</th>
                                            <th className="px-6 py-3 font-semibold">Status</th>
                                            <th className="px-6 py-3 font-semibold text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredRequests.length > 0 ? (
                                            filteredRequests.map((request) => (
                                                <tr key={request.id} className="bg-white transition hover:bg-primary-50/20">
                                                    <td className="px-6 py-4 font-semibold text-primary-700">#{request.id.slice(0, 8)}</td>
                                                    <td className="px-6 py-4 text-gray-600">{new Date(request.createdAt).toLocaleDateString('en-GB')}</td>
                                                    <td className="px-6 py-4 text-gray-600">{request.items?.length || 1}</td>
                                                    <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(Number(request.totalAmount))}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRequestStatusClasses(request.status)}`}>
                                                            {request.status.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedRequest(request);
                                                                setShowRequestModal(true);
                                                            }}
                                                        >
                                                            View
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">No purchase orders found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </TabsContent>

                    <TabsContent value="compliance" className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <section className="rounded-xl border border-gray-200 bg-white p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Active Documents</h3>
                                <Button variant="outline" size="sm" onClick={() => setIsAddDocumentOpen(true)}>
                                    <Plus className="mr-1 h-4 w-4" /> Upload New
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {supplier.documents && supplier.documents.length > 0 ? (
                                    supplier.documents.map((document) => (
                                        <div key={document.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg bg-white p-2">
                                                    {document.type === 'Insurance' ? (
                                                        <Shield className="h-5 w-5 text-blue-600" />
                                                    ) : (
                                                        <FileText className="h-5 w-5 text-purple-600" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{document.title}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {document.expiryDate ? `Expires: ${new Date(document.expiryDate).toLocaleDateString('en-GB')}` : 'No expiry'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${document.status === 'Valid'
                                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                                : document.status === 'Expiring Soon'
                                                    ? 'border border-amber-200 bg-amber-50 text-amber-700'
                                                    : 'border border-rose-200 bg-rose-50 text-rose-700'
                                                }`}
                                            >
                                                {document.status}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">No documents found.</p>
                                )}
                            </div>
                        </section>

                        <div className="space-y-6">
                            <section className="rounded-xl border border-gray-200 bg-white p-5">
                                <h3 className="text-lg font-semibold text-gray-900">Compliance Status</h3>

                                <div className="mt-4 space-y-4">
                                    <div>
                                        <div className="mb-1 flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Onboarding Completion</span>
                                            <span className="font-semibold text-gray-900">100%</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-gray-100">
                                            <div className="h-full w-full rounded-full bg-emerald-500" />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mb-1 flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Document Validity</span>
                                            <span className="font-semibold text-gray-900">
                                                {supplier.documents && supplier.documents.length > 0
                                                    ? Math.round((supplier.documents.filter((document) => document.status === 'Valid').length / supplier.documents.length) * 100)
                                                    : 0}%
                                            </span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-gray-100">
                                            <div
                                                className="h-full rounded-full bg-amber-500"
                                                style={{
                                                    width: `${supplier.documents && supplier.documents.length > 0
                                                        ? (supplier.documents.filter((document) => document.status === 'Valid').length / supplier.documents.length) * 100
                                                        : 0}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-xl border border-gray-200 bg-white p-5">
                                <h3 className="text-lg font-semibold text-gray-900">Certifications</h3>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {supplier.documents?.filter((document) => document.type === 'Certification').map((certification) => (
                                        <span key={certification.id} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
                                            {certification.title}
                                        </span>
                                    ))}
                                    {!supplier.documents?.some((document) => document.type === 'Certification') && (
                                        <span className="text-xs text-gray-500">No certifications listed.</span>
                                    )}
                                </div>
                            </section>
                        </div>
                    </TabsContent>

                    <TabsContent value="performance" className="space-y-6">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery Delay Avg</p>
                                <p className="mt-2 text-2xl font-bold text-gray-900">
                                    {supplier.details?.deliveryDelayAverage !== undefined
                                        ? `${Math.abs(supplier.details.deliveryDelayAverage)} days ${supplier.details.deliveryDelayAverage < 0 ? 'early' : supplier.details.deliveryDelayAverage > 0 ? 'late' : 'on time'}`
                                        : 'N/A'}
                                </p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quality Rating</p>
                                <p className="mt-2 text-2xl font-bold text-purple-700">
                                    {supplier.details?.qualityScore ? `${(supplier.details.qualityScore / 20).toFixed(1)}/5` : 'N/A'}
                                </p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Communication</p>
                                <p className="mt-2 text-2xl font-bold text-emerald-700">{supplier.details?.communicationScore || 0}%</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                            <section className="rounded-xl border border-gray-200 bg-white p-5">
                                <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>

                                <div className="mt-5 space-y-5">
                                    <div>
                                        <div className="mb-1 flex items-end justify-between text-sm">
                                            <span className="font-medium text-gray-700">Delivery Delay</span>
                                            <span className="font-semibold text-gray-900">{supplier.details?.deliveryDelayAverage || 0} days</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-gray-100">
                                            <div
                                                className={`h-full rounded-full ${supplier.details?.deliveryDelayAverage && supplier.details.deliveryDelayAverage > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${Math.min(100, Math.max(0, 100 - (Math.abs(supplier.details?.deliveryDelayAverage || 0) * 5)))}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mb-1 flex items-end justify-between text-sm">
                                            <span className="font-medium text-gray-700">Product Quality</span>
                                            <span className="font-semibold text-gray-900">{supplier.details?.qualityScore || 0}%</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-gray-100">
                                            <div className="h-full rounded-full bg-purple-600" style={{ width: `${supplier.details?.qualityScore || 0}%` }} />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mb-1 flex items-end justify-between text-sm">
                                            <span className="font-medium text-gray-700">Communication</span>
                                            <span className="font-semibold text-gray-900">{supplier.details?.communicationScore || 0}%</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-gray-100">
                                            <div className="h-full rounded-full bg-yellow-500" style={{ width: `${supplier.details?.communicationScore || 0}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-xl border border-gray-200 bg-white p-5">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900">Feedback History</h3>
                                    <Button variant="outline" size="sm" onClick={() => setShowReviewModal(true)}>
                                        Write Review
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {reviews.length > 0 ? (
                                        reviews.map((review) => (
                                            <article key={review.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                                <div className="mb-2 flex items-start justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                                            {review.user?.name ? review.user.name.charAt(0).toUpperCase() : 'U'}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900">{review.user?.name || 'Unknown User'}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString('en-GB')}</span>
                                                </div>
                                                <p className="text-sm text-gray-700">{review.comment}</p>
                                                <div className="mt-2 flex gap-0.5">
                                                    {Array.from({ length: 5 }).map((_, index) => (
                                                        <span key={index} className={index < review.rating ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                                                    ))}
                                                </div>
                                            </article>
                                        ))
                                    ) : (
                                        <p className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">No reviews yet.</p>
                                    )}
                                </div>

                                {reviews.length < reviewsTotal && (
                                    <Button
                                        variant="outline"
                                        className="mt-4 w-full"
                                        onClick={() => void fetchReviews(reviewsPage + 1, true)}
                                        disabled={loadingReviews}
                                    >
                                        {loadingReviews ? 'Loading...' : 'Load More Reviews'}
                                    </Button>
                                )}
                            </section>
                        </div>
                    </TabsContent>
                </Tabs>
            </section>

            <EditSupplierModal
                supplier={supplier}
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                onSuccess={(updated) => {
                    setSupplier(updated);
                    setShowEditModal(false);
                }}
            />

            <MessageSupplierModal
                supplierId={supplier.id}
                supplierName={supplier.name}
                isOpen={showMessageModal}
                onClose={() => setShowMessageModal(false)}
            />

            <AddDocumentModal
                isOpen={isAddDocumentOpen}
                onClose={() => setIsAddDocumentOpen(false)}
                supplierId={supplier.id}
                onSuccess={async () => {
                    const data = await suppliersApi.getDetails(supplier.id);
                    setSupplier(data);
                }}
            />

            <WriteReviewModal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                supplierId={supplier.id}
                onSuccess={() => {
                    void fetchReviews(1, false);
                    void suppliersApi.getDetails(supplier.id).then(setSupplier);
                }}
            />

            <RequestDetailsModal
                isOpen={showRequestModal}
                onClose={() => setShowRequestModal(false)}
                request={selectedRequest}
                canApprove={false}
            />

            <ConfirmationModal
                isOpen={showRejectModal}
                onClose={() => {
                    if (rejectingSupplier) return;
                    setShowRejectModal(false);
                    setRejectError(null);
                }}
                onConfirm={handleConfirmRejectSupplier}
                title={rejectError ? 'Unable to Reject Supplier' : 'Reject Supplier'}
                message={rejectError || 'Are you sure you want to reject this supplier?'}
                confirmText={rejectError ? 'Try Again' : 'Reject Supplier'}
                cancelText="Cancel"
                variant="danger"
                isLoading={rejectingSupplier}
            />
        </div>
    );
}

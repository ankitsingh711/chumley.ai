import { MapPin, CreditCard, Shield, FileText } from 'lucide-react';
import { pdfService } from '../services/pdf.service';
import { Button } from '../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { StatCard } from '../components/dashboard/StatCard';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { suppliersApi } from '../services/suppliers.service';
import type { Supplier, InteractionLog, Review } from '../types/api';
import { UserRole } from '../types/api';
import { EditSupplierModal } from '../components/suppliers/EditSupplierModal';
import { MessageSupplierModal } from '../components/suppliers/MessageSupplierModal';
import { AddDocumentModal } from '../components/suppliers/AddDocumentModal';
import { WriteReviewModal } from '../components/suppliers/WriteReviewModal';

import { useAuth } from '../hooks/useAuth';

export default function SupplierProfile() {
    const { user } = useAuth();
    const { id } = useParams<{ id: string }>();
    const isSystemAdmin = user?.role === UserRole.SYSTEM_ADMIN;
    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false);
    const [interactions, setInteractions] = useState<InteractionLog[]>([]);
    const [showAddLog, setShowAddLog] = useState(false);
    const [newLog, setNewLog] = useState({ title: '', description: '', eventType: 'meeting', date: '' });

    // Reviews State
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsPage, setReviewsPage] = useState(1);
    const [reviewsTotal, setReviewsTotal] = useState(0);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);

    const fetchReviews = async (pageNum = 1, append = false) => {
        if (!id) return;
        try {
            setLoadingReviews(true);
            const { data, meta } = await suppliersApi.getReviews(id, pageNum);
            if (append) {
                setReviews(prev => [...prev, ...data]);
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
                // Fetch extended supplier details
                const data = await suppliersApi.getDetails(id);
                setSupplier(data);

                // Fetch interactions
                const interactionData = await suppliersApi.getInteractions(id);
                setInteractions(interactionData);

                // Fetch reviews
                fetchReviews(1, false);
            } catch (error) {
                console.error('Failed to fetch supplier:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSupplier();
    }, [id]);

    // Compute initials from supplier name
    const initials = supplier?.name
        ? supplier.name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : '??';

    if (isLoading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    if (!supplier) {
        return <div className="flex items-center justify-center h-64">Supplier not found</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                        {supplier.logoUrl ? (
                            <div className="h-16 w-16 rounded-lg bg-white border border-gray-100 flex items-center justify-center overflow-hidden">
                                <img
                                    src={supplier.logoUrl}
                                    alt={supplier.name}
                                    className="h-full w-full object-contain p-1"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.classList.add('hidden');
                                        // You might want to show the fallback here, but simpler is to just hide
                                        // or handled via state ideally. For now, rely on valid URL.
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="h-16 w-16 rounded-lg bg-primary-900 flex items-center justify-center text-white text-2xl font-bold">
                                {initials}
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-gray-900">{supplier.name}</h1>
                                {supplier.status === 'Preferred' && (
                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">VERIFIED</span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">{supplier.category} | ID: {supplier.id.slice(0, 8)}</p>
                            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                    <span className="text-yellow-500">★ {supplier.details?.rating ? Number(supplier.details.rating).toFixed(1) : '0.0'}</span> ({supplier.details?.reviewCount || 0} Reviews)
                                </div>
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> Austin, TX
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {isSystemAdmin && (supplier.status === 'Review Pending' || supplier.status === 'Pending') ? (
                            <>
                                <Button
                                    variant="outline"
                                    className="text-red-600 hover:bg-red-50 border-red-200"
                                    onClick={async () => {
                                        if (confirm('Are you sure you want to reject this supplier?')) {
                                            try {
                                                const updated = await suppliersApi.reject(supplier.id);
                                                setSupplier(updated);
                                            } catch (err) {
                                                console.error('Failed to reject supplier', err);
                                            }
                                        }
                                    }}
                                >
                                    Reject
                                </Button>
                                <Button
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={async () => {
                                        try {
                                            const updated = await suppliersApi.approve(supplier.id);
                                            setSupplier(updated);
                                        } catch (err) {
                                            console.error('Failed to approve supplier', err);
                                        }
                                    }}
                                >
                                    Approve Supplier
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" onClick={() => setShowMessageModal(true)}>Message</Button>
                                {isSystemAdmin && (
                                    <Button onClick={() => setShowEditModal(true)}>Edit Profile</Button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="mt-8">
                    <Tabs defaultValue="overview">
                        <TabsList className="bg-transparent p-0 border-b w-full justify-start rounded-none h-auto">
                            <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary-600 data-[state=active]:shadow-none rounded-none px-4 py-2">Overview</TabsTrigger>
                            <TabsTrigger value="orders" className="data-[state=active]:border-b-2 data-[state=active]:border-primary-600 data-[state=active]:shadow-none rounded-none px-4 py-2">Purchase Orders</TabsTrigger>
                            <TabsTrigger value="compliance" className="data-[state=active]:border-b-2 data-[state=active]:border-primary-600 data-[state=active]:shadow-none rounded-none px-4 py-2">Compliance & Documents</TabsTrigger>
                            <TabsTrigger value="performance" className="data-[state=active]:border-b-2 data-[state=active]:border-primary-600 data-[state=active]:shadow-none rounded-none px-4 py-2">Performance</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="pt-6 space-y-6">
                            {/* Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatCard
                                    title="TOTAL SPEND (YTD)"
                                    value={supplier.stats?.totalSpend ? `£${(supplier.stats.totalSpend / 1000).toFixed(1)}k` : '£0.0k'}
                                // removed static trend
                                />
                                <StatCard
                                    title="ACTIVE ORDERS"
                                    value={supplier.stats?.activeOrders?.toString().padStart(2, '0') || '00'}
                                />
                                <StatCard
                                    title="RELIABILITY SCORE"
                                    value={`${supplier.details ? Math.round(((supplier.details.qualityScore || 0) + (supplier.details.communicationScore || 0)) / 2) : 0}%`}
                                    color="green"
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left Col: Recent POs & Compliance */}
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Recent Purchase Orders Widget */}
                                    <div className="rounded-xl border border-gray-100 bg-white p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-gray-900">Recent Requests & Orders</h3>
                                            <Button variant="ghost" size="sm">View All</Button>
                                        </div>
                                        <div className="space-y-4">
                                            {supplier.requests && supplier.requests.length > 0 ? (
                                                supplier.requests.map((req) => (
                                                    <div key={req.id} className="flex justify-between items-center py-2 border-b last:border-0 border-gray-50">
                                                        <span className="text-sm font-medium text-primary-600">#{req.id.slice(0, 8)}</span>
                                                        <span className="text-sm text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</span>
                                                        <span className="text-sm font-medium">£{Number(req.totalAmount).toLocaleString()}</span>
                                                        <span className={`text-xs px-2 py-1 rounded ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                            req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {req.status.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-sm text-gray-500 text-center py-4">No recent activity</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Compliance Widget */}
                                    <div className="rounded-xl border border-gray-100 bg-white p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-gray-900">Compliance & Documents</h3>
                                            <Button variant="ghost" size="sm" onClick={() => setIsAddDocumentOpen(true)}>+</Button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {supplier.documents && supplier.documents.length > 0 ? (
                                                supplier.documents.slice(0, 4).map((doc) => (
                                                    <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => window.open(doc.url, '_blank')}>
                                                        <div className={`p-2 rounded ${doc.type === 'Tax' ? 'bg-red-50 text-red-600' :
                                                            doc.type === 'Insurance' ? 'bg-blue-50 text-blue-600' :
                                                                'bg-purple-50 text-purple-600'
                                                            }`}>
                                                            {doc.type === 'Insurance' ? <Shield className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="text-sm font-medium truncate" title={doc.title}>{doc.title}</p>
                                                            <p className={`text-xs ${doc.status === 'Expiring Soon' ? 'text-yellow-600 font-medium' :
                                                                doc.status === 'Expired' ? 'text-red-600 font-medium' :
                                                                    'text-gray-400'
                                                                }`}>
                                                                {doc.status === 'Expiring Soon' ? 'EXPIRES SOON' :
                                                                    doc.status === 'Expired' ? 'EXPIRED' :
                                                                        doc.expiryDate ? `Expires: ${new Date(doc.expiryDate).toLocaleDateString()}` : 'Valid'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="col-span-2 text-center py-4 text-sm text-gray-500">
                                                    No documents uploaded.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Col: Contact & Timeline */}
                                <div className="space-y-6">
                                    {/* Contact Details */}
                                    <div className="rounded-xl border border-gray-100 bg-white p-6">
                                        <h3 className="font-semibold text-gray-900 mb-4">Contact Details</h3>
                                        <div className="space-y-4 text-sm">
                                            <div className="flex gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                                                    {supplier.contactName ? supplier.contactName.charAt(0).toUpperCase() : initials}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{supplier.contactName || 'Contact Person'}</p>
                                                    <p className="text-xs text-gray-500">ACCOUNT MANAGER</p>
                                                    <p className="text-xs text-primary-600">{supplier.contactEmail || 'No email'}</p>
                                                    {supplier.details?.phone && (
                                                        <p className="text-xs text-gray-500 mt-1">📞 {supplier.details.phone}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {(supplier.details?.address || supplier.details?.city) && (
                                                <div className="flex gap-3">
                                                    <MapPin className="h-5 w-5 text-gray-400" />
                                                    <div>
                                                        <p className="text-gray-500 text-xs">MAILING ADDRESS</p>
                                                        {supplier.details.address && <p className="font-medium">{supplier.details.address}</p>}
                                                        {(supplier.details.city || supplier.details.state) && (
                                                            <p>{supplier.details.city}{supplier.details.city && supplier.details.state && ', '}{supplier.details.state} {supplier.details.zipCode}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {supplier.details?.paymentTerms && (
                                                <div className="flex gap-3">
                                                    <CreditCard className="h-5 w-5 text-gray-400" />
                                                    <div>
                                                        <p className="text-gray-500 text-xs">PAYMENT TERMS</p>
                                                        <p className="font-medium">{supplier.details.paymentTerms}</p>
                                                        {supplier.details.paymentMethod && (
                                                            <p className="text-xs text-gray-400">Via {supplier.details.paymentMethod}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Interaction Timeline */}
                                    <div className="rounded-xl border border-gray-100 bg-white p-6">
                                        <h3 className="font-semibold text-gray-900 mb-4">Interaction Timeline</h3>
                                        <div className="space-y-6 relative pl-4 border-l border-gray-200">
                                            {interactions.length > 0 ? (
                                                interactions.map((interaction, index) => (
                                                    <div key={interaction.id} className="relative">
                                                        <span className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${index === 0 ? 'bg-primary-500' : 'bg-gray-300'
                                                            }`}></span>
                                                        <p className="text-sm font-medium">{interaction.title}</p>
                                                        <p className="text-xs text-gray-400">
                                                            {new Date(interaction.eventDate).toLocaleString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                                hour: 'numeric',
                                                                minute: '2-digit'
                                                            }).toUpperCase()}
                                                        </p>
                                                        {interaction.description && (
                                                            <p className="mt-1 text-xs text-gray-500">{interaction.description}</p>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-gray-500">No interactions logged yet</p>
                                            )}
                                        </div>

                                        {/* Add Log Entry Form */}
                                        {showAddLog ? (
                                            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                                                <input
                                                    type="text"
                                                    placeholder="Event title"
                                                    value={newLog.title}
                                                    onChange={(e) => setNewLog({ ...newLog, title: e.target.value })}
                                                    className="w-full rounded border px-3 py-2 text-sm"
                                                />
                                                <textarea
                                                    placeholder="Description (optional)"
                                                    value={newLog.description}
                                                    onChange={(e) => setNewLog({ ...newLog, description: e.target.value })}
                                                    className="w-full rounded border px-3 py-2 text-sm resize-none"
                                                    rows={2}
                                                />
                                                <Select
                                                    value={newLog.eventType}
                                                    onChange={(val) => setNewLog({ ...newLog, eventType: val })}
                                                    options={[
                                                        { value: 'meeting', label: 'Meeting' },
                                                        { value: 'call', label: 'Call' },
                                                        { value: 'email', label: 'Email' },
                                                        { value: 'contract', label: 'Contract' },
                                                        { value: 'other', label: 'Other' },
                                                    ]}
                                                    placeholder="Select type..."
                                                    className="w-full"
                                                />
                                                <DatePicker
                                                    value={newLog.date}
                                                    onChange={(val) => setNewLog({ ...newLog, date: val })}
                                                    placeholder="Event Date (optional)"
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="secondary"
                                                        className="flex-1 text-xs h-8"
                                                        onClick={() => {
                                                            setShowAddLog(false);
                                                            setNewLog({ title: '', description: '', eventType: 'meeting', date: '' });
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        className="flex-1 text-xs h-8 bg-primary-600 hover:bg-primary-600"
                                                        onClick={async () => {
                                                            if (!id || !newLog.title) return;
                                                            try {
                                                                const created = await suppliersApi.createInteraction(id, {
                                                                    ...newLog,
                                                                    eventDate: newLog.date ? new Date(newLog.date).toISOString() : new Date().toISOString(),
                                                                });
                                                                setInteractions([created, ...interactions]);
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
                                            <Button
                                                variant="secondary"
                                                className="w-full mt-4 text-xs font-normal h-8"
                                                onClick={() => setShowAddLog(true)}
                                            >
                                                ADD LOG ENTRY
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Internal Notes */}
                            <div className="rounded-lg bg-orange-50 p-4 border border-orange-100">
                                <h4 className="flex items-center gap-2 text-xs font-bold text-orange-800 uppercase mb-1">
                                    <FileText className="h-3 w-3" /> Internal Procurement Notes
                                </h4>
                                <p className="text-sm text-orange-900">
                                    Reliable for bulk orders, but historically slow with custom motherboard quotes. Recommend contacting Sarah directly via phone for expedited requests.
                                </p>
                            </div>
                        </TabsContent>

                        <TabsContent value="orders" className="pt-6">
                            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-900">Purchase Orders History</h3>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => {
                                            if (!supplier.requests) return;
                                            const headers = ['Order ID', 'Date', 'Items', 'Amount', 'Status'];
                                            const rows = supplier.requests.map(req => [
                                                req.id.slice(0, 8),
                                                new Date(req.createdAt).toLocaleDateString(),
                                                (req.items?.length || 1).toString(),
                                                `£${Number(req.totalAmount).toLocaleString()}`,
                                                req.status.replace(/_/g, ' ')
                                            ]);
                                            pdfService.exportToPDF(
                                                `Purchase Orders - ${supplier.name}`,
                                                headers,
                                                rows,
                                                `purchase_orders_${supplier.name.replace(/\s+/g, '_').toLowerCase()}`
                                            );
                                        }}>
                                            <FileText className="mr-2 h-4 w-4" /> Export PDF
                                        </Button>
                                        <Button variant="outline" size="sm">Filter</Button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                            <tr>
                                                <th className="px-6 py-3">Order ID</th>
                                                <th className="px-6 py-3">Date</th>
                                                <th className="px-6 py-3">Items</th>
                                                <th className="px-6 py-3">Amount</th>
                                                <th className="px-6 py-3">Status</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {supplier.requests && supplier.requests.length > 0 ? (
                                                supplier.requests.map((req) => (
                                                    <tr key={req.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 font-medium text-primary-600">#{req.id.slice(0, 8)}</td>
                                                        <td className="px-6 py-4 text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4 text-gray-500">{req.items?.length || 1} items</td>
                                                        <td className="px-6 py-4 font-medium">£{Number(req.totalAmount).toLocaleString()}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${req.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                                req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-red-100 text-red-800'
                                                                }`}>
                                                                {req.status.replace(/_/g, ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <Button variant="ghost" size="sm">View</Button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                        No purchase orders found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="compliance" className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm h-fit">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="font-semibold text-gray-900">Active Documents</h3>
                                        <Button variant="outline" size="sm" onClick={() => setIsAddDocumentOpen(true)}>+ Upload New</Button>
                                    </div>
                                    <div className="space-y-4">
                                        {supplier.documents && supplier.documents.length > 0 ? (
                                            supplier.documents.map((doc) => (
                                                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-primary-200 transition-colors cursor-pointer group">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-3 rounded-lg transition-colors group-hover:bg-opacity-80 ${doc.type === 'Tax' ? 'bg-red-50 text-red-600' :
                                                            doc.type === 'Insurance' ? 'bg-blue-50 text-blue-600' :
                                                                'bg-purple-50 text-purple-600'
                                                            }`}>
                                                            {doc.type === 'Insurance' ? <Shield className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900">{doc.title}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {doc.expiryDate ? `Expires: ${new Date(doc.expiryDate).toLocaleDateString()}` : 'No Expiry'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`inline-block px-2 py-1 text-xs rounded-md font-medium ${doc.status === 'Valid' ? 'bg-green-100 text-green-700' :
                                                            doc.status === 'Expiring Soon' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {doc.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-gray-500 text-center py-4">No documents found.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                                        <h3 className="font-semibold text-gray-900 mb-4">Compliance Status</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600">Onboarding Completion</span>
                                                    <span className="font-medium">100%</span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-green-500 w-full"></div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600">Document Validity</span>
                                                    <span className="font-medium">
                                                        {supplier.documents ? Math.round((supplier.documents.filter(d => d.status === 'Valid').length / supplier.documents.length) * 100) : 0}%
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-yellow-500" style={{ width: `${supplier.documents ? (supplier.documents.filter(d => d.status === 'Valid').length / supplier.documents.length) * 100 : 0}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                                        <h3 className="font-semibold text-gray-900 mb-4">Certifications</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {supplier.documents?.filter(d => d.type === 'Certification').map(cert => (
                                                <span key={cert.id} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{cert.title}</span>
                                            ))}
                                            {!supplier.documents?.some(d => d.type === 'Certification') && (
                                                <span className="text-xs text-gray-500">No certifications listed</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="performance" className="pt-6">
                            {/* Reusing Stats for Context */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <StatCard
                                    title="AVG DELIVERY DELAY"
                                    value={supplier.details?.deliveryDelayAverage !== undefined
                                        ? `${Math.abs(supplier.details.deliveryDelayAverage)} Days ${supplier.details.deliveryDelayAverage === 0 ? '' : (supplier.details.deliveryDelayAverage < 0 ? 'Early' : 'Late')}`
                                        : 'N/A'}
                                    trend={{
                                        value: supplier.details?.deliveryDelayAverage !== undefined
                                            ? (supplier.details.deliveryDelayAverage < 0 ? 'Ahead of Schedule' : (supplier.details.deliveryDelayAverage === 0 ? 'On Time' : 'Behind Schedule'))
                                            : 'N/A',
                                        isPositive: supplier.details?.deliveryDelayAverage !== undefined ? supplier.details.deliveryDelayAverage <= 0 : true,
                                        label: 'Current Status'
                                    }}
                                    color="blue"
                                />
                                <StatCard
                                    title="QUALITY RATING"
                                    value={supplier.details?.qualityScore ? `${(supplier.details.qualityScore / 20).toFixed(1)}/5` : 'N/A'}
                                    color="purple"
                                />
                                <StatCard
                                    title="COMMUNICATION"
                                    value={supplier.details?.communicationScore ? `${supplier.details.communicationScore}%` : 'N/A'}
                                    color="green"
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 mb-6">Performance Metrics</h3>
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-sm font-medium text-gray-700">Delivery Delay Avg</span>
                                                <span className="text-sm font-bold text-gray-900">{supplier.details?.deliveryDelayAverage !== undefined ? Math.abs(supplier.details.deliveryDelayAverage) : 0} Days {supplier.details?.deliveryDelayAverage && supplier.details.deliveryDelayAverage < 0 ? 'Early' : 'Late'}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                                <div
                                                    className={`h-2.5 rounded-full ${supplier.details?.deliveryDelayAverage && supplier.details.deliveryDelayAverage > 0 ? 'bg-red-500' : 'bg-green-500'}`}
                                                    style={{
                                                        width: `${Math.min(100, Math.max(0, 100 - (Math.abs(supplier.details?.deliveryDelayAverage || 0) * 5)))}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-sm font-medium text-gray-700">Product Quality</span>
                                                <span className="text-sm font-bold text-gray-900">{supplier.details?.qualityScore || 0}%</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                                <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${supplier.details?.qualityScore || 0}%` }}></div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-sm font-medium text-gray-700">Communication</span>
                                                <span className="text-sm font-bold text-gray-900">{supplier.details?.communicationScore || 0}%</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                                <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: `${supplier.details?.communicationScore || 0}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-semibold text-gray-900">Feedback History</h3>
                                        <Button variant="outline" size="sm" onClick={() => setShowReviewModal(true)}>Write a Review</Button>
                                    </div>
                                    <div className="space-y-4">
                                        {reviews.length > 0 ? (
                                            reviews.map((review) => (
                                                <div key={review.id} className="p-4 bg-gray-50 rounded-lg">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-700 font-bold">
                                                                {review.user?.name ? review.user.name.charAt(0).toUpperCase() : 'U'}
                                                            </div>
                                                            <span className="text-sm font-medium">{review.user?.name || 'Unknown User'}</span>
                                                        </div>
                                                        <span className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600">{review.comment}</p>
                                                    <div className="mt-2 flex gap-0.5">
                                                        {[...Array(5)].map((_, i) => (
                                                            <span key={i} className={`text-xs ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-gray-500 text-center py-4">No reviews yet.</p>
                                        )}
                                    </div>
                                    {reviews.length < reviewsTotal && (
                                        <Button
                                            variant="outline"
                                            className="w-full mt-4"
                                            onClick={() => fetchReviews(reviewsPage + 1, true)}
                                            disabled={loadingReviews}
                                        >
                                            {loadingReviews ? 'Loading...' : 'Load More Reviews'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Modals */}
            {supplier && (
                <>
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
                            // Refresh supplier to see new document
                            const data = await suppliersApi.getDetails(supplier.id);
                            setSupplier(data);
                        }}
                    />
                    <WriteReviewModal
                        isOpen={showReviewModal}
                        onClose={() => setShowReviewModal(false)}
                        supplierId={supplier.id}
                        onSuccess={() => {
                            fetchReviews(1, false);
                            // Also refresh supplier details to update rating
                            suppliersApi.getDetails(supplier.id).then(setSupplier);
                        }}
                    />
                </>
            )}
        </div>
    );
}

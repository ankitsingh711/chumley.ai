import { MapPin, CreditCard, Shield, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { StatCard } from '../components/dashboard/StatCard';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { suppliersApi } from '../services/suppliers.service';
import type { Supplier, InteractionLog } from '../types/api';
import { EditSupplierModal } from '../components/suppliers/EditSupplierModal';
import { MessageSupplierModal } from '../components/suppliers/MessageSupplierModal';

export default function SupplierProfile() {
    const { id } = useParams<{ id: string }>();
    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [interactions, setInteractions] = useState<InteractionLog[]>([]);
    const [showAddLog, setShowAddLog] = useState(false);
    const [newLog, setNewLog] = useState({ title: '', description: '', eventType: 'meeting' });

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
                        <div className="h-16 w-16 rounded-lg bg-primary-900 flex items-center justify-center text-white text-2xl font-bold">
                            {initials}
                        </div>
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
                                    <span className="text-yellow-500">★ 4.8</span> (24 Reviews)
                                </div>
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> Austin, TX
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowMessageModal(true)}>Message</Button>
                        <Button onClick={() => setShowEditModal(true)}>Edit Profile</Button>
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
                                    value={supplier.stats?.totalSpend ? `$${(supplier.stats.totalSpend / 1000).toFixed(1)}k` : '$0.0k'}
                                    trend={{ value: '+12%', isPositive: true }}
                                />
                                <StatCard
                                    title="ACTIVE ORDERS"
                                    value={supplier.stats?.activeOrders?.toString().padStart(2, '0') || '00'}
                                />
                                <StatCard title="RELIABILITY SCORE" value="98.2%" color="green" />
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
                                                        <span className="text-sm font-medium">${Number(req.totalAmount).toLocaleString()}</span>
                                                        <span className={`text-xs px-2 py-1 rounded ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                            req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {req.status}
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
                                            <Button variant="ghost" size="sm">+</Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center gap-3 p-3 border rounded-lg">
                                                <div className="p-2 bg-red-50 text-red-600 rounded"><FileText className="h-5 w-5" /></div>
                                                <div>
                                                    <p className="text-sm font-medium">W-9 Tax Form (2023)</p>
                                                    <p className="text-xs text-gray-400">Modified Oct 1, 2023</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 border rounded-lg">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded"><Shield className="h-5 w-5" /></div>
                                                <div>
                                                    <p className="text-sm font-medium">Liability Insurance</p>
                                                    <p className="text-xs text-yellow-600">EXPIRES IN 12 DAYS</p>
                                                </div>
                                            </div>
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
                                                <select
                                                    value={newLog.eventType}
                                                    onChange={(e) => setNewLog({ ...newLog, eventType: e.target.value })}
                                                    className="w-full rounded border px-3 py-2 text-sm"
                                                >
                                                    <option value="meeting">Meeting</option>
                                                    <option value="call">Call</option>
                                                    <option value="email">Email</option>
                                                    <option value="contract">Contract</option>
                                                    <option value="other">Other</option>
                                                </select>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="secondary"
                                                        className="flex-1 text-xs h-8"
                                                        onClick={() => {
                                                            setShowAddLog(false);
                                                            setNewLog({ title: '', description: '', eventType: 'meeting' });
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
                                                                    eventDate: new Date().toISOString(),
                                                                });
                                                                setInteractions([created, ...interactions]);
                                                                setShowAddLog(false);
                                                                setNewLog({ title: '', description: '', eventType: 'meeting' });
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
                </>
            )}
        </div>
    );
}

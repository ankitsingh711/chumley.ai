import { MapPin, CreditCard, Shield, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { StatCard } from '../components/dashboard/StatCard';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { suppliersApi } from '../services/suppliers.service';
import type { Supplier } from '../types/api';

export default function SupplierProfile() {
    const { id } = useParams<{ id: string }>();
    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSupplier = async () => {
            if (!id) return;
            try {
                setIsLoading(true);
                const data = await suppliersApi.getById(id);
                setSupplier(data);
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
                        <div className="h-16 w-16 rounded-lg bg-teal-900 flex items-center justify-center text-white text-2xl font-bold">
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
                        <Button variant="outline">Message</Button>
                        <Button>Edit Profile</Button>
                    </div>
                </div>

                <div className="mt-8">
                    <Tabs defaultValue="overview">
                        <TabsList className="bg-transparent p-0 border-b w-full justify-start rounded-none h-auto">
                            <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-teal-600 data-[state=active]:shadow-none rounded-none px-4 py-2">Overview</TabsTrigger>
                            <TabsTrigger value="orders" className="data-[state=active]:border-b-2 data-[state=active]:border-teal-600 data-[state=active]:shadow-none rounded-none px-4 py-2">Purchase Orders</TabsTrigger>
                            <TabsTrigger value="compliance" className="data-[state=active]:border-b-2 data-[state=active]:border-teal-600 data-[state=active]:shadow-none rounded-none px-4 py-2">Compliance & Documents</TabsTrigger>
                            <TabsTrigger value="performance" className="data-[state=active]:border-b-2 data-[state=active]:border-teal-600 data-[state=active]:shadow-none rounded-none px-4 py-2">Performance</TabsTrigger>
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
                                            <h3 className="font-semibold text-gray-900">Recent Purchase Orders</h3>
                                            <Button variant="ghost" size="sm">View All</Button>
                                        </div>
                                        <div className="space-y-4">
                                            {/* List Items Placeholder */}
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="flex justify-between items-center py-2 border-b last:border-0 border-gray-50">
                                                    <span className="text-sm font-medium text-teal-600">#PO-2023-049{i}</span>
                                                    <span className="text-sm text-gray-500">Oct {24 - i}, 2023</span>
                                                    <span className="text-sm font-medium">$12,450.00</span>
                                                    <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">INTRAMIT</span>
                                                </div>
                                            ))}
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
                                                <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold">
                                                    {supplier.contactName ? supplier.contactName.charAt(0).toUpperCase() : initials}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{supplier.contactName || 'Contact Person'}</p>
                                                    <p className="text-xs text-gray-500">ACCOUNT MANAGER</p>
                                                    <p className="text-xs text-teal-600">{supplier.contactEmail || 'No email'}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <MapPin className="h-5 w-5 text-gray-400" />
                                                <div>
                                                    <p className="text-gray-500 text-xs">MAILING ADDRESS</p>
                                                    <p className="font-medium">1201 Tech Plaza</p>
                                                    <p>Austin, TX 78701</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <CreditCard className="h-5 w-5 text-gray-400" />
                                                <div>
                                                    <p className="text-gray-500 text-xs">PAYMENT TERMS</p>
                                                    <p className="font-medium">Net 30</p>
                                                    <p className="text-xs text-gray-400">Via Wire Transfer</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Interaction Timeline */}
                                    <div className="rounded-xl border border-gray-100 bg-white p-6">
                                        <h3 className="font-semibold text-gray-900 mb-4">Interaction Timeline</h3>
                                        <div className="space-y-6 relative pl-4 border-l border-gray-200">
                                            <div className="relative">
                                                <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-teal-500 ring-4 ring-white"></span>
                                                <p className="text-sm font-medium">QBR Meeting Conducted</p>
                                                <p className="text-xs text-gray-400">OCT 28, 2023 • 2:30 PM</p>
                                                <p className="mt-1 text-xs text-gray-500">Discussed expanding warehouse capacity.</p>
                                            </div>
                                            <div className="relative">
                                                <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-gray-300 ring-4 ring-white"></span>
                                                <p className="text-sm font-medium">Contract Signed</p>
                                                <p className="text-xs text-gray-400">SEP 15, 2023</p>
                                            </div>
                                        </div>
                                        <Button variant="secondary" className="w-full mt-4 text-xs font-normal h-8">ADD LOG ENTRY</Button>
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
        </div>
    );
}

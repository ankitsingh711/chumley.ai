import { useMemo, useState, useEffect } from 'react';
import { Plus, LayoutGrid, List as ListIcon, FileText, Search, Building2, ShieldCheck, Clock3, Wallet } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SupplierCard, type Supplier as CardSupplier } from '../components/suppliers/SupplierCard';
import { suppliersApi } from '../services/suppliers.service';
import { AddSupplierModal } from '../components/suppliers/AddSupplierModal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { pdfService } from '../services/pdf.service';
import { SuppliersSkeleton } from '../components/skeletons/SuppliersSkeleton';
import { Pagination } from '../components/Pagination';
import { isPaginatedResponse } from '../types/pagination';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/api';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'grid' | 'list';

const categories = ['Software', 'Office Supplies', 'Hardware', 'Marketing', 'Shipping & Logistics', 'Other'];
const filterOptions = ['All Vendors', ...categories];

const normalizeStatus = (status?: string) => (status || '').trim().toLowerCase().replace(/\s+/g, '_');

const normalizeStatusLabel = (status?: string) => {
    const normalized = normalizeStatus(status);
    switch (normalized) {
        case 'preferred':
            return 'Preferred';
        case 'standard':
            return 'Standard';
        case 'active':
            return 'Active';
        case 'pending':
        case 'review_pending':
            return 'Review Pending';
        case 'rejected':
            return 'Rejected';
        default:
            return status || 'Standard';
    }
};

const parseSpendValue = (value: string) => {
    const numeric = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
};

const formatCurrency = (amount: number) =>
    `£${Number(amount || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

const getStatusClasses = (status: string) => {
    const normalized = normalizeStatus(status);

    switch (normalized) {
        case 'preferred':
        case 'active':
            return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
        case 'standard':
            return 'border border-blue-200 bg-blue-50 text-blue-700';
        case 'pending':
        case 'review_pending':
            return 'border border-amber-200 bg-amber-50 text-amber-700';
        case 'rejected':
            return 'border border-rose-200 bg-rose-50 text-rose-700';
        default:
            return 'border border-gray-200 bg-gray-100 text-gray-700';
    }
};

export default function Suppliers() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const isRestricted = user?.role !== UserRole.SYSTEM_ADMIN
        && user?.role !== UserRole.SENIOR_MANAGER
        && user?.role !== UserRole.MANAGER;

    const [suppliers, setSuppliers] = useState<CardSupplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    const [activeFilter, setActiveFilter] = useState('All Vendors');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    useEffect(() => {
        void fetchSuppliers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage]);

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            const response = await suppliersApi.getAll(currentPage, limit);

            let supplierData: Array<{
                id: string;
                name: string;
                category: string;
                status?: string;
                logoUrl?: string;
                contactName?: string;
                contactEmail?: string;
                activeOrdersCount?: number;
                totalSpend?: number;
                stats?: { activeOrders?: number; totalSpend?: number };
                lastOrderDate?: string;
            }>;

            if (isPaginatedResponse(response)) {
                supplierData = response.data;
                setTotal(response.meta.total);
                setTotalPages(response.meta.totalPages);
                setCurrentPage(response.meta.page);
            } else {
                supplierData = response;
                setTotal(response.length);
                setTotalPages(1);
            }

            const mappedData: CardSupplier[] = supplierData.map((supplier) => {
                const totalSpendValue = supplier.totalSpend || supplier.stats?.totalSpend || 0;
                const activeOrders = supplier.activeOrdersCount || supplier.stats?.activeOrders || 0;

                return {
                    id: supplier.id,
                    name: supplier.name,
                    category: supplier.category,
                    status: normalizeStatusLabel(supplier.status),
                    logoColor: 'bg-primary-600',
                    contact: {
                        name: supplier.contactName || supplier.name || 'Unknown',
                        role: 'Representative',
                        image: supplier.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(supplier.contactName || supplier.name)}&background=eff6ff&color=1d4ed8`,
                    },
                    stats: {
                        activeOrders,
                        totalSpend: formatCurrency(totalSpendValue),
                        totalSpendValue,
                    },
                    lastOrder: supplier.lastOrderDate ? new Date(supplier.lastOrderDate).toLocaleDateString('en-GB') : 'No orders yet',
                    contactEmail: supplier.contactEmail,
                };
            });

            setSuppliers(mappedData);
        } catch (error) {
            console.error('Failed to fetch suppliers:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSuppliers = useMemo(() => {
        let list = activeFilter === 'All Vendors'
            ? suppliers
            : suppliers.filter((supplier) => supplier.category === activeFilter);

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            list = list.filter((supplier) =>
                supplier.name.toLowerCase().includes(query)
                || supplier.category.toLowerCase().includes(query)
                || supplier.contact.name.toLowerCase().includes(query)
                || supplier.status.toLowerCase().includes(query)
            );
        }

        return list;
    }, [activeFilter, suppliers, searchQuery]);

    const summary = useMemo(() => {
        const preferredCount = filteredSuppliers.filter((supplier) => {
            const status = normalizeStatus(supplier.status);
            return status === 'preferred' || status === 'active';
        }).length;

        const pendingCount = filteredSuppliers.filter((supplier) => {
            const status = normalizeStatus(supplier.status);
            return status === 'review_pending' || status === 'pending';
        }).length;

        const totalSpend = filteredSuppliers.reduce((sum, supplier) => {
            if (typeof supplier.stats.totalSpendValue === 'number') return sum + supplier.stats.totalSpendValue;
            return sum + parseSpendValue(supplier.stats.totalSpend);
        }, 0);

        return {
            supplierCount: filteredSuppliers.length,
            preferredCount,
            pendingCount,
            totalSpend,
        };
    }, [filteredSuppliers]);

    const handleSupplierAdded = (newSupplier: {
        id: string;
        name: string;
        category: string;
        status?: string;
        contactName?: string;
        logoUrl?: string;
    }) => {
        const mappedNew: CardSupplier = {
            id: newSupplier.id,
            name: newSupplier.name,
            category: newSupplier.category,
            status: normalizeStatusLabel(isRestricted ? 'Review Pending' : (newSupplier.status || 'Standard')),
            logoColor: 'bg-primary-600',
            contact: {
                name: newSupplier.contactName || 'Unknown',
                role: 'Representative',
                image: newSupplier.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(newSupplier.contactName || newSupplier.name)}&background=eff6ff&color=1d4ed8`,
            },
            stats: {
                activeOrders: 0,
                totalSpend: '£0',
                totalSpendValue: 0,
            },
            lastOrder: 'New',
        };

        setSuppliers((prev) => [mappedNew, ...prev]);
        if (isRestricted) {
            setShowSuccessModal(true);
        }
    };

    const handleExportPDF = () => {
        const headers = ['Name', 'Category', 'Status', 'Contact', 'Active Orders', 'Total Spend'];
        const rows = filteredSuppliers.map((supplier) => [
            supplier.name,
            supplier.category,
            supplier.status,
            supplier.contact.name,
            supplier.stats.activeOrders.toString(),
            supplier.stats.totalSpend,
        ]);

        pdfService.exportToPDF('Supplier Directory', headers, rows, 'supplier_directory');
    };

    if (loading) {
        return <SuppliersSkeleton />;
    }

    return (
        <div className="space-y-6">
            <section className="relative rounded-2xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/60 to-accent-50/70 p-6 shadow-sm">
                <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary-200/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-accent-200/50 blur-3xl" />

                <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700">Vendor Workspace</p>
                        <h1 className="mt-2 text-3xl font-bold text-gray-900">Supplier Directory</h1>
                        <p className="mt-2 max-w-2xl text-sm text-gray-600">
                            Manage vendor relationships, track spend exposure, and monitor supplier approval status.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={handleExportPDF} className="border-white/70 bg-white/90 backdrop-blur">
                            <FileText className="mr-2 h-4 w-4" /> Export PDF
                        </Button>
                        <Button onClick={() => setShowAddModal(true)} className="bg-primary-700 hover:bg-primary-800">
                            <Plus className="mr-2 h-4 w-4" /> {isRestricted ? 'Request New Supplier' : 'Add New Supplier'}
                        </Button>
                    </div>
                </div>

                <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Visible Suppliers
                            <Building2 className="h-4 w-4 text-primary-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{summary.supplierCount}</p>
                        <p className="mt-1 text-xs text-gray-500">Matching current filters</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Preferred / Active
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-emerald-700">{summary.preferredCount}</p>
                        <p className="mt-1 text-xs text-gray-500">Strategic supplier base</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Pending Review
                            <Clock3 className="h-4 w-4 text-amber-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-amber-700">{summary.pendingCount}</p>
                        <p className="mt-1 text-xs text-gray-500">Waiting approval or changes</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Total Spend Scope
                            <Wallet className="h-4 w-4 text-primary-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(summary.totalSpend)}</p>
                        <p className="mt-1 text-xs text-gray-500">Across filtered suppliers</p>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:p-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative w-full lg:max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search suppliers, categories, contacts, or status"
                                className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 text-sm text-gray-700 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-1">
                                <button
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
                                    onClick={() => setViewMode('grid')}
                                    title="Grid view"
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </button>
                                <button
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
                                    onClick={() => setViewMode('list')}
                                    title="List view"
                                >
                                    <ListIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {filterOptions.map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                                    activeFilter === filter
                                        ? 'border-primary-200 bg-primary-700 text-white'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700'
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                        <span className="font-medium text-gray-700">
                            {filteredSuppliers.length} supplier{filteredSuppliers.length === 1 ? '' : 's'} visible
                        </span>
                        <span>
                            Filter: <span className="font-medium text-gray-900">{activeFilter}</span> | View: <span className="font-medium text-gray-900 capitalize">{viewMode}</span>
                        </span>
                    </div>
                </div>
            </section>

            {filteredSuppliers.length === 0 ? (
                <section className="rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
                    <p className="text-lg font-semibold text-gray-900">No suppliers match the current filters</p>
                    <p className="mt-1 text-sm text-gray-500">Try a broader category or remove search text.</p>
                </section>
            ) : viewMode === 'grid' ? (
                <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredSuppliers.map((supplier) => (
                        <SupplierCard key={supplier.id} supplier={supplier} />
                    ))}
                </section>
            ) : (
                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-left text-sm">
                            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Supplier</th>
                                    <th className="px-6 py-3 font-semibold">Category</th>
                                    <th className="px-6 py-3 font-semibold">Status</th>
                                    <th className="px-6 py-3 font-semibold">Active Orders</th>
                                    <th className="px-6 py-3 font-semibold">Total Spend</th>
                                    <th className="px-6 py-3 font-semibold">Last Order</th>
                                    <th className="px-6 py-3 font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSuppliers.map((supplier) => (
                                    <tr key={supplier.id} className="bg-white transition hover:bg-primary-50/30">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-semibold text-gray-900">{supplier.name}</p>
                                                <p className="text-xs text-gray-500">{supplier.contact.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{supplier.category}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(supplier.status)}`}>
                                                {supplier.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-900">{supplier.stats.activeOrders}</td>
                                        <td className="px-6 py-4 font-semibold text-gray-900">{supplier.stats.totalSpend}</td>
                                        <td className="px-6 py-4 text-gray-600">{supplier.lastOrder}</td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                className="h-8 px-3 text-xs font-semibold text-primary-700 hover:bg-primary-50"
                                                onClick={() => navigate(`/suppliers/${supplier.id}`)}
                                            >
                                                View Profile
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {!loading && totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    total={total}
                    limit={limit}
                    onPageChange={(page) => setCurrentPage(page)}
                />
            )}

            <AddSupplierModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={handleSupplierAdded}
                isRestricted={isRestricted}
            />

            <ConfirmationModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                onConfirm={() => setShowSuccessModal(false)}
                title="Request Sent"
                message="Your supplier request has been sent for approval. You will be notified once it is reviewed."
                confirmText="OK"
                variant="success"
                showCancel={false}
            />
        </div>
    );
}

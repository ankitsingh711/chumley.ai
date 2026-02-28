import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Plus,
    FileText,
    Calendar,
    PoundSterling,
    Building2,
    X,
    Search,
    LayoutGrid,
    List,
    Wallet,
    Clock3,
    CheckCircle2,
    RefreshCcw,
} from 'lucide-react';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { Button } from '../components/ui/Button';
import { Pagination } from '../components/Pagination';
import { ContractsSkeleton } from '../components/skeletons/ContractsSkeleton';
import { contractsApi } from '../services/contracts.service';
import { suppliersApi } from '../services/suppliers.service';
import type { Contract, Supplier } from '../types/api';
import { ContractStatus } from '../types/api';
import { isPaginatedResponse } from '../types/pagination';

type ContractFilter = 'all' | ContractStatus;
type ViewMode = 'grid' | 'list';
type SortOption = 'recent' | 'end_soonest' | 'value_desc' | 'title_asc';

const ITEMS_PER_PAGE = 9;

const statusLabelMap: Record<ContractStatus, string> = {
    [ContractStatus.DRAFT]: 'Draft',
    [ContractStatus.ACTIVE]: 'Active',
    [ContractStatus.EXPIRING_SOON]: 'Expiring Soon',
    [ContractStatus.EXPIRED]: 'Expired',
    [ContractStatus.TERMINATED]: 'Terminated',
    [ContractStatus.RENEWED]: 'Renewed',
};

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

const formatCurrency = (value: number, currency?: string) => {
    const normalizedCurrency = currency || 'GBP';
    try {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: normalizedCurrency,
            maximumFractionDigits: 0,
        }).format(Number(value || 0));
    } catch {
        return `£${Number(value || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
    }
};

const getStatusClasses = (status: ContractStatus) => {
    switch (status) {
        case ContractStatus.ACTIVE:
            return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
        case ContractStatus.EXPIRING_SOON:
            return 'border border-amber-200 bg-amber-50 text-amber-700';
        case ContractStatus.EXPIRED:
        case ContractStatus.TERMINATED:
            return 'border border-rose-200 bg-rose-50 text-rose-700';
        case ContractStatus.RENEWED:
            return 'border border-blue-200 bg-blue-50 text-blue-700';
        default:
            return 'border border-gray-200 bg-gray-100 text-gray-700';
    }
};

export default function Contracts() {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [filter, setFilter] = useState<ContractFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [sortBy, setSortBy] = useState<SortOption>('recent');
    const [currentPage, setCurrentPage] = useState(1);

    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        supplierId: '',
        startDate: '',
        endDate: '',
        totalValue: '',
        paymentTerms: '',
        autoRenew: false,
        description: '',
    });

    const fetchSuppliers = useCallback(async () => {
        try {
            const response = await suppliersApi.getAll();
            const data = isPaginatedResponse(response) ? response.data : response;
            setSuppliers(data);
        } catch (error) {
            console.error('Failed to fetch suppliers:', error);
        }
    }, []);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const contractsResponse = await contractsApi.getAll();
            const contractsData = isPaginatedResponse<Contract>(contractsResponse)
                ? contractsResponse.data
                : contractsResponse;

            setContracts(contractsData as Contract[]);
            await fetchSuppliers();
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    }, [fetchSuppliers]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filter, searchQuery, sortBy, viewMode]);

    const handleCloseModal = () => {
        if (saving) return;
        setShowAddModal(false);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            supplierId: suppliers[0]?.id || '',
            startDate: '',
            endDate: '',
            totalValue: '',
            paymentTerms: '',
            autoRenew: false,
            description: '',
        });
    };

    const handleOpenModal = () => {
        resetForm();
        setShowAddModal(true);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!formData.startDate || !formData.endDate) return;
        if (formData.endDate < formData.startDate) return;
        if (!formData.supplierId || Number(formData.totalValue) <= 0) return;

        try {
            setSaving(true);
            await contractsApi.create({
                ...formData,
                totalValue: Number(formData.totalValue),
                status: ContractStatus.DRAFT,
            });

            await loadData();
            handleCloseModal();
            resetForm();
        } catch (error) {
            console.error('Failed to create contract:', error);
        } finally {
            setSaving(false);
        }
    };

    const summary = useMemo(() => {
        const totalValue = contracts.reduce((sum, contract) => sum + Number(contract.totalValue || 0), 0);
        const activeCount = contracts.filter((contract) => contract.status === ContractStatus.ACTIVE).length;
        const expiringSoonCount = contracts.filter((contract) => contract.status === ContractStatus.EXPIRING_SOON).length;
        const autoRenewCount = contracts.filter((contract) => contract.autoRenew).length;

        return {
            totalValue,
            activeCount,
            expiringSoonCount,
            autoRenewCount,
        };
    }, [contracts]);

    const filterCounts = useMemo(() => {
        const counts = {
            all: contracts.length,
            [ContractStatus.ACTIVE]: 0,
            [ContractStatus.EXPIRING_SOON]: 0,
            [ContractStatus.EXPIRED]: 0,
            [ContractStatus.DRAFT]: 0,
            [ContractStatus.RENEWED]: 0,
        };

        contracts.forEach((contract) => {
            if (contract.status in counts) {
                counts[contract.status as keyof typeof counts] += 1;
            }
        });

        return counts;
    }, [contracts]);

    const visibleContracts = useMemo(() => {
        let list = [...contracts];

        if (filter !== 'all') {
            list = list.filter((contract) => contract.status === filter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            list = list.filter((contract) => {
                const supplierName = contract.supplier?.name || '';
                return (
                    contract.title.toLowerCase().includes(query)
                    || supplierName.toLowerCase().includes(query)
                    || (contract.contractNumber || '').toLowerCase().includes(query)
                    || (contract.paymentTerms || '').toLowerCase().includes(query)
                );
            });
        }

        list.sort((left, right) => {
            if (sortBy === 'title_asc') return left.title.localeCompare(right.title);
            if (sortBy === 'value_desc') return Number(right.totalValue) - Number(left.totalValue);
            if (sortBy === 'end_soonest') return new Date(left.endDate).getTime() - new Date(right.endDate).getTime();
            return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        });

        return list;
    }, [contracts, filter, searchQuery, sortBy]);

    const totalPages = Math.max(1, Math.ceil(visibleContracts.length / ITEMS_PER_PAGE));
    const boundedPage = Math.min(currentPage, totalPages);
    const paginatedContracts = visibleContracts.slice(
        (boundedPage - 1) * ITEMS_PER_PAGE,
        boundedPage * ITEMS_PER_PAGE,
    );

    if (loading) {
        return <ContractsSkeleton />;
    }

    return (
        <div className="space-y-6">
            <section className="relative rounded-2xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/60 to-accent-50/70 p-6 shadow-sm">
                <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary-200/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-accent-200/50 blur-3xl" />

                <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700">Legal & Procurement</p>
                        <h1 className="mt-2 text-3xl font-bold text-gray-900">Contract Management</h1>
                        <p className="mt-2 max-w-2xl text-sm text-gray-600">
                            Track supplier agreements, renewal risk, and commercial exposure from one operating view.
                        </p>
                    </div>
                    <Button onClick={handleOpenModal} className="bg-primary-700 hover:bg-primary-800">
                        <Plus className="mr-2 h-4 w-4" />
                        New Contract
                    </Button>
                </div>

                <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Total Contract Value
                            <Wallet className="h-4 w-4 text-primary-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(summary.totalValue)}</p>
                        <p className="mt-1 text-xs text-gray-500">Portfolio exposure</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Active Contracts
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-emerald-700">{summary.activeCount}</p>
                        <p className="mt-1 text-xs text-gray-500">Currently in force</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Expiring Soon
                            <Clock3 className="h-4 w-4 text-amber-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-amber-700">{summary.expiringSoonCount}</p>
                        <p className="mt-1 text-xs text-gray-500">Needs renewal planning</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Auto-Renew
                            <RefreshCcw className="h-4 w-4 text-primary-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{summary.autoRenewCount}</p>
                        <p className="mt-1 text-xs text-gray-500">Contracts with auto-renewal</p>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:p-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="relative w-full xl:max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search contract title, supplier, number, or payment terms"
                                className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 text-sm text-gray-700 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                            />
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="w-full sm:w-52">
                                <Select
                                    value={sortBy}
                                    onChange={(value) => setSortBy(value as SortOption)}
                                    options={[
                                        { value: 'recent', label: 'Recently updated' },
                                        { value: 'end_soonest', label: 'Ending soonest' },
                                        { value: 'value_desc', label: 'Highest value' },
                                        { value: 'title_asc', label: 'Title A-Z' },
                                    ]}
                                    triggerClassName="h-11"
                                />
                            </div>

                            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-1">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`inline-flex h-9 w-9 items-center justify-center rounded ${
                                        viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700'
                                    }`}
                                    title="Grid view"
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={`inline-flex h-9 w-9 items-center justify-center rounded ${
                                        viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700'
                                    }`}
                                    title="List view"
                                >
                                    <List className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setFilter('all')}
                            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                                filter === 'all'
                                    ? 'border-primary-200 bg-primary-700 text-white'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700'
                            }`}
                        >
                            All ({filterCounts.all})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilter(ContractStatus.ACTIVE)}
                            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                                filter === ContractStatus.ACTIVE
                                    ? 'border-primary-200 bg-primary-700 text-white'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700'
                            }`}
                        >
                            Active ({filterCounts.ACTIVE})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilter(ContractStatus.EXPIRING_SOON)}
                            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                                filter === ContractStatus.EXPIRING_SOON
                                    ? 'border-primary-200 bg-primary-700 text-white'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700'
                            }`}
                        >
                            Expiring Soon ({filterCounts.EXPIRING_SOON})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilter(ContractStatus.EXPIRED)}
                            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                                filter === ContractStatus.EXPIRED
                                    ? 'border-primary-200 bg-primary-700 text-white'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700'
                            }`}
                        >
                            Expired ({filterCounts.EXPIRED})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilter(ContractStatus.DRAFT)}
                            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                                filter === ContractStatus.DRAFT
                                    ? 'border-primary-200 bg-primary-700 text-white'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700'
                            }`}
                        >
                            Draft ({filterCounts.DRAFT})
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                        <span className="font-medium text-gray-700">
                            {visibleContracts.length} contracts visible
                        </span>
                        <span>
                            Filter: <span className="font-medium text-gray-900">{filter === 'all' ? 'All' : statusLabelMap[filter]}</span> | Sort: <span className="font-medium text-gray-900">{sortBy.replace('_', ' ')}</span>
                        </span>
                    </div>
                </div>
            </section>

            {visibleContracts.length === 0 ? (
                <section className="rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
                    <FileText className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-900">No contracts found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {contracts.length === 0
                            ? 'Get started by creating your first contract.'
                            : 'Try adjusting filters or search criteria.'}
                    </p>
                    <div className="mt-5 flex items-center justify-center gap-3">
                        {contracts.length > 0 && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setFilter('all');
                                    setSearchQuery('');
                                }}
                            >
                                Clear Filters
                            </Button>
                        )}
                        <Button onClick={handleOpenModal}>
                            <Plus className="mr-2 h-4 w-4" />
                            New Contract
                        </Button>
                    </div>
                </section>
            ) : viewMode === 'grid' ? (
                <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {paginatedContracts.map((contract) => (
                        <article
                            key={contract.id}
                            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
                        >
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusClasses(contract.status)}`}>
                                    {statusLabelMap[contract.status]}
                                </span>
                                <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                    {contract.contractNumber || contract.id.slice(0, 8)}
                                </span>
                            </div>

                            <h3 className="text-lg font-semibold text-gray-900">{contract.title}</h3>

                            <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-gray-600">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                {contract.supplier?.name || 'Unknown Supplier'}
                            </div>

                            <p className="mt-3 line-clamp-2 min-h-[2.75rem] text-sm text-gray-500">
                                {contract.description || 'No description provided.'}
                            </p>

                            <div className="mt-4 space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1 text-gray-500">
                                        <Calendar className="h-3.5 w-3.5" />
                                        End Date
                                    </span>
                                    <span className="font-medium text-gray-900">{formatDate(contract.endDate)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1 text-gray-500">
                                        <PoundSterling className="h-3.5 w-3.5" />
                                        Contract Value
                                    </span>
                                    <span className="font-medium text-gray-900">{formatCurrency(contract.totalValue, contract.currency)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Renewal</span>
                                    <span className={contract.autoRenew ? 'font-medium text-emerald-700' : 'font-medium text-gray-700'}>
                                        {contract.autoRenew ? 'Auto-renew' : 'Manual renewal'}
                                    </span>
                                </div>
                                {typeof contract.daysUntilExpiry === 'number' && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">Days Until Expiry</span>
                                        <span className={`font-semibold ${contract.daysUntilExpiry <= 30 ? 'text-amber-700' : 'text-gray-900'}`}>
                                            {contract.daysUntilExpiry}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </article>
                    ))}
                </section>
            ) : (
                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-left text-sm">
                            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Contract</th>
                                    <th className="px-6 py-3 font-semibold">Supplier</th>
                                    <th className="px-6 py-3 font-semibold">Term</th>
                                    <th className="px-6 py-3 font-semibold">Value</th>
                                    <th className="px-6 py-3 font-semibold">Status</th>
                                    <th className="px-6 py-3 font-semibold">Renewal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedContracts.map((contract) => (
                                    <tr key={contract.id} className="transition hover:bg-primary-50/30">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900">{contract.title}</p>
                                            <p className="text-xs text-gray-500">#{contract.contractNumber || contract.id.slice(0, 8)}</p>
                                        </td>
                                        <td className="px-6 py-4 text-gray-700">{contract.supplier?.name || 'Unknown Supplier'}</td>
                                        <td className="px-6 py-4 text-gray-700">
                                            {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-900">
                                            {formatCurrency(contract.totalValue, contract.currency)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(contract.status)}`}>
                                                {statusLabelMap[contract.status]}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-700">
                                            {contract.autoRenew ? 'Auto-renew' : 'Manual'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {visibleContracts.length > 0 && (
                <Pagination
                    currentPage={boundedPage}
                    totalPages={totalPages}
                    total={visibleContracts.length}
                    limit={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
            )}

            {showAddModal && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    onClick={handleCloseModal}
                >
                    <div
                        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="sticky top-0 z-10 border-b border-gray-100 bg-gradient-to-r from-white via-primary-50/35 to-white px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700">New Agreement</p>
                                    <h2 className="mt-1 text-xl font-bold text-gray-900">Create Contract</h2>
                                    <p className="mt-1 text-sm text-gray-500">Capture supplier terms, dates, and commercial value.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 p-6">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Contract Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                    placeholder="e.g. Office Supplies Annual Agreement"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Supplier <span className="text-red-500">*</span>
                                </label>
                                <Select
                                    value={formData.supplierId}
                                    onChange={(value) => setFormData({ ...formData, supplierId: value })}
                                    options={[
                                        { value: '', label: 'Select supplier' },
                                        ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name })),
                                    ]}
                                    triggerClassName="h-11"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Start Date <span className="text-red-500">*</span>
                                    </label>
                                    <DatePicker
                                        value={formData.startDate}
                                        onChange={(value) => setFormData({ ...formData, startDate: value })}
                                        className="w-full"
                                        placeholder="Start date"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        End Date <span className="text-red-500">*</span>
                                    </label>
                                    <DatePicker
                                        value={formData.endDate}
                                        onChange={(value) => setFormData({ ...formData, endDate: value })}
                                        className="w-full"
                                        placeholder="End date"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Total Value <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={formData.totalValue}
                                        onChange={(event) => setFormData({ ...formData, totalValue: event.target.value })}
                                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                        placeholder="50000"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Payment Terms</label>
                                    <input
                                        type="text"
                                        value={formData.paymentTerms}
                                        onChange={(event) => setFormData({ ...formData, paymentTerms: event.target.value })}
                                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                        placeholder="e.g. Net 30"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                                    className="w-full resize-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                    placeholder="Add key commercial or legal notes"
                                />
                            </div>

                            <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={formData.autoRenew}
                                    onChange={(event) => setFormData({ ...formData, autoRenew: event.target.checked })}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                Auto-renew this contract
                            </label>

                            {formData.startDate && formData.endDate && formData.endDate < formData.startDate && (
                                <p className="text-sm font-medium text-red-600">End date must be after start date.</p>
                            )}

                            <div className="flex gap-3 border-t border-gray-100 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCloseModal}
                                    className="flex-1"
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 bg-primary-700 hover:bg-primary-800"
                                    disabled={
                                        saving
                                        || !formData.title.trim()
                                        || !formData.supplierId
                                        || !formData.startDate
                                        || !formData.endDate
                                        || Number(formData.totalValue) <= 0
                                        || formData.endDate < formData.startDate
                                    }
                                >
                                    {saving ? 'Creating...' : 'Create Contract'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}

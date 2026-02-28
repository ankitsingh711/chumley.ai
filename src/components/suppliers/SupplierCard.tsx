import { memo, useCallback } from 'react';
import { Mail, Cloud, Printer, Truck, Palette, Monitor, Package, Building2, ShieldCheck, Clock3 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

export interface Supplier {
    id: string;
    name: string;
    category: string;
    status: string;
    logoColor: string;
    contact: {
        name: string;
        role: string;
        image: string;
    };
    stats: {
        activeOrders: number;
        totalSpend: string;
        totalSpendValue?: number;
    };
    lastOrder: string;
    contactEmail?: string;
}

interface SupplierCardProps {
    supplier: Supplier;
}

const STATUS_STYLES: Record<string, string> = {
    preferred: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    standard: 'border border-blue-200 bg-blue-50 text-blue-700',
    active: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    pending: 'border border-amber-200 bg-amber-50 text-amber-700',
    review_pending: 'border border-amber-200 bg-amber-50 text-amber-700',
    rejected: 'border border-rose-200 bg-rose-50 text-rose-700',
};

function getStatusKey(status: string) {
    return status.trim().toLowerCase().replace(/\s+/g, '_');
}

function getStatusLabel(status: string) {
    const key = getStatusKey(status);
    switch (key) {
        case 'review_pending':
            return 'Review Pending';
        case 'preferred':
            return 'Preferred';
        case 'standard':
            return 'Standard';
        case 'active':
            return 'Active';
        case 'pending':
            return 'Pending';
        case 'rejected':
            return 'Rejected';
        default:
            return status;
    }
}

function getCategoryIcon(category: string) {
    const normalized = category.toLowerCase();

    if (normalized.includes('software') || normalized.includes('cloud')) {
        return { icon: Cloud, color: 'text-blue-500 bg-blue-50' };
    }
    if (normalized.includes('office') || normalized.includes('supplies')) {
        return { icon: Printer, color: 'text-orange-500 bg-orange-50' };
    }
    if (normalized.includes('logistic') || normalized.includes('shipping')) {
        return { icon: Truck, color: 'text-primary-500 bg-primary-50' };
    }
    if (normalized.includes('marketing') || normalized.includes('creative')) {
        return { icon: Palette, color: 'text-purple-500 bg-purple-50' };
    }
    if (normalized.includes('hardware') || normalized.includes('it')) {
        return { icon: Monitor, color: 'text-indigo-500 bg-indigo-50' };
    }
    if (normalized.includes('service')) {
        return { icon: Building2, color: 'text-gray-500 bg-gray-50' };
    }

    return { icon: Package, color: 'text-gray-500 bg-gray-50' };
}

function formatSpend(value: string) {
    const number = parseInt(value.replace(/[^0-9]/g, ''), 10);

    if (Number.isNaN(number)) return value;
    if (number >= 1000000) return `£${(number / 1000000).toFixed(1)}m`;
    if (number >= 1000) return `£${(number / 1000).toFixed(1)}k`;

    return `£${number}`;
}

export const SupplierCard = memo(function SupplierCard({ supplier }: SupplierCardProps) {
    const navigate = useNavigate();

    const handleViewProfile = useCallback(() => {
        navigate(`/suppliers/${supplier.id}`);
    }, [navigate, supplier.id]);

    const { icon: CategoryIcon, color: categoryIconStyle } = getCategoryIcon(supplier.category);
    const statusKey = getStatusKey(supplier.status);
    const statusStyle = STATUS_STYLES[statusKey] || 'border border-gray-200 bg-gray-100 text-gray-700';
    const statusLabel = getStatusLabel(supplier.status);
    const isPending = statusKey === 'review_pending' || statusKey === 'pending';

    return (
        <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${categoryIconStyle}`}>
                    <CategoryIcon className="h-6 w-6" />
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusStyle}`}>
                    {statusLabel}
                </span>
            </div>

            <div className="mb-5">
                <h3 className="text-2xl font-bold text-gray-900 transition group-hover:text-primary-700">{supplier.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{supplier.category}</p>
            </div>

            <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                    <img
                        src={supplier.contact.image}
                        alt={supplier.contact.name}
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
                        onError={(event) => {
                            (event.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(supplier.contact.name)}&background=eff6ff&color=1d4ed8`;
                        }}
                    />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{supplier.contact.name}</p>
                        <p className="truncate text-xs text-gray-500">{supplier.contact.role}</p>
                    </div>
                    <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition hover:border-primary-200 hover:text-primary-700"
                        title={supplier.contactEmail || 'Contact Supplier'}
                    >
                        <Mail className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-100 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Orders</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{supplier.stats.activeOrders.toString().padStart(2, '0')}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Spend</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{formatSpend(supplier.stats.totalSpend)}</p>
                </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    {isPending ? (
                        <>
                            <Clock3 className="h-3.5 w-3.5 text-amber-500" />
                            Awaiting approval
                        </>
                    ) : (
                        <>
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                            Last order: {supplier.lastOrder}
                        </>
                    )}
                </div>
                <Button
                    variant="ghost"
                    className="h-8 px-3 text-xs font-semibold text-primary-700 hover:bg-primary-50"
                    onClick={handleViewProfile}
                >
                    View Profile
                </Button>
            </div>
        </article>
    );
});

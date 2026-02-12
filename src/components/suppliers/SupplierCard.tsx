import { Mail, Cloud, Printer, Truck, Palette, Monitor, Package, Building2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

export interface Supplier {
    id: string;
    name: string;
    category: string;
    status: 'Preferred' | 'Standard' | 'Review Pending';
    logoColor: string;
    contact: {
        name: string;
        role: string;
        image: string;
    };
    stats: {
        activeOrders: number;
        totalSpend: string;
    };
    lastOrder: string;
}

interface SupplierCardProps {
    supplier: Supplier;
}

export function SupplierCard({ supplier }: SupplierCardProps) {
    const navigate = useNavigate();

    const statusStyles = {
        'Preferred': 'bg-green-50 text-green-700 border border-green-200',
        'Standard': 'bg-blue-50 text-blue-700 border border-blue-200',
        'Review Pending': 'bg-orange-50 text-orange-700 border border-orange-200',
    };

    const getCategoryIcon = (category: string) => {
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
    };

    const formatCurrency = (str: string) => {
        // Assuming string is like "£12,345" or "12345"
        const num = parseInt(str.replace(/[^0-9]/g, ''));
        if (isNaN(num)) return str;
        if (num >= 1000) {
            return `£${(num / 1000).toFixed(1)}k`;
        }
        return `£${num}`;
    };

    const { icon: Icon, color: iconStyle } = getCategoryIcon(supplier.category);
    const isReviewPending = supplier.status === 'Review Pending';

    return (
        <div className={`relative rounded-xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col h-full hover:shadow-md transition-all group overflow-hidden ${isReviewPending ? 'border-l-4 border-l-orange-500' : ''}`}>

            <div className="flex justify-between items-start mb-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${iconStyle}`}>
                    <Icon className="h-6 w-6" />
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${statusStyles[supplier.status]}`}>
                    {supplier.status}
                </span>
            </div>

            <div className="mb-6">
                <h3 className="font-bold text-gray-900 text-lg group-hover:text-primary-600 transition-colors">{supplier.name}</h3>
                <p className="text-sm text-gray-400 font-medium">{supplier.category}</p>
            </div>

            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-50">
                <img
                    src={supplier.contact.image}
                    alt={supplier.contact.name}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-white shadow-sm"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(supplier.contact.name)}&background=random`;
                    }}
                />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{supplier.contact.name}</p>
                    <p className="text-xs text-gray-400 truncate">{supplier.contact.role}</p>
                </div>
                <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                    <Mail className="h-4 w-4" />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">ACTIVE ORDERS</p>
                    <p className="text-2xl font-bold text-gray-900">{supplier.stats.activeOrders.toString().padStart(2, '0')}</p>
                </div>
                <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">TOTAL SPEND</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(supplier.stats.totalSpend)}</p>
                </div>
            </div>

            <div className="mt-auto flex items-center justify-between pt-2">
                <p className={`text-xs ${isReviewPending ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                    {isReviewPending ? 'Contract expires soon' : `Last order: ${supplier.lastOrder}`}
                </p>
                <Button
                    variant="ghost"
                    className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 text-xs font-semibold h-8 px-3"
                    onClick={() => navigate(`/suppliers/${supplier.id}`)}
                >
                    View Profile
                </Button>
            </div>
        </div>
    );
}

import { Mail } from 'lucide-react';
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
        'Preferred': 'bg-green-100 text-green-700',
        'Standard': 'bg-blue-50 text-blue-700',
        'Review Pending': 'bg-orange-100 text-orange-700',
    };

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-white ${supplier.logoColor}`}>
                    <span className="font-bold text-lg">{supplier.name.substring(0, 1)}</span>
                    {/* Ideally real logo, utilizing color prop for placeholder */}
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wide ${statusStyles[supplier.status]}`}>
                    {supplier.status}
                </span>
            </div>

            <div className="mb-6">
                <h3 className="font-bold text-gray-900 text-lg">{supplier.name}</h3>
                <p className="text-sm text-blue-600 font-medium">{supplier.category}</p>
            </div>

            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-50">
                <img src={supplier.contact.image} alt={supplier.contact.name} className="h-8 w-8 rounded-full object-cover" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{supplier.contact.name}</p>
                    <p className="text-xs text-gray-400">{supplier.contact.role}</p>
                </div>
                <button className="text-gray-400 hover:text-gray-600"><Mail className="h-4 w-4" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ACTIVE ORDERS</p>
                    <p className="text-xl font-bold text-gray-900">{supplier.stats.activeOrders.toString().padStart(2, '0')}</p>
                </div>
                <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">TOTAL SPEND</p>
                    <p className="text-xl font-bold text-gray-900">{supplier.stats.totalSpend}</p>
                </div>
            </div>

            <div className="mt-auto flex items-center justify-between pt-2">
                <p className="text-xs text-gray-400">{supplier.lastOrder}</p>
                <Button
                    variant="ghost"
                    className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 text-sm h-8 px-2"
                    onClick={() => navigate(`/suppliers/${supplier.id}`)}
                >
                    View Profile
                </Button>
            </div>
        </div>
    );
}

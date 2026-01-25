import { useEffect, useState } from 'react';
import { Download, Plus, LayoutGrid, List as ListIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SupplierCard, type Supplier as CardSupplier } from '../components/suppliers/SupplierCard';
import { suppliersApi } from '../services/suppliers.service';
import { useNavigate } from 'react-router-dom';

export default function Suppliers() {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<CardSupplier[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const data = await suppliersApi.getAll();
                // Map API data to Card props
                const mappedSuppliers: CardSupplier[] = data.map(s => ({
                    id: s.id,
                    name: s.name,
                    category: s.category,
                    status: (s.status === 'Preferred' || s.status === 'Standard' || s.status === 'Review Pending') ? s.status : 'Standard', // Default mapping
                    logoColor: 'bg-teal-600', // Random or hash based if needed, staying static for now
                    contact: {
                        name: s.contactName || 'No Contact',
                        role: 'Representative', // Placeholder as not in DB yet
                        image: 'https://ui-avatars.com/api/?name=' + (s.contactName || s.name) + '&background=random',
                    },
                    stats: {
                        activeOrders: s.stats?.activeOrders || 0,
                        totalSpend: s.stats?.totalSpend
                            ? `$${(s.stats.totalSpend / 1000).toFixed(1)}k`
                            : '$0.0k',
                    },
                    lastOrder: s.lastOrderDate
                        ? `Last order: ${new Date(s.lastOrderDate).toLocaleDateString()}`
                        : 'No orders yet'
                }));
                setSuppliers(mappedSuppliers);
            } catch (error) {
                console.error('Failed to fetch suppliers:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSuppliers();
    }, []);

    if (loading) {
        return <div className="p-8 text-center">Loading suppliers...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Supplier Directory</h1>
                    <p className="text-sm text-gray-500">Manage approved vendors, track performance, and monitor spend.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export List</Button>
                    <Button onClick={() => navigate('/suppliers/new')}><Plus className="mr-2 h-4 w-4" /> Add New Supplier</Button>
                </div>
            </div>

            {/* Filters & Search - Similar to Image 3 */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
                    <button className="whitespace-nowrap rounded-full bg-teal-800 px-4 py-1.5 text-sm font-medium text-white">All Vendors</button>
                    <button className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Software</button>
                    <button className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Office Supplies</button>
                    <button className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Hardware</button>
                    <button className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Marketing</button>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {/* <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input 
                  placeholder="Search suppliers..." 
                  className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-teal-500"
                />
             </div> */}
                    {/* Note: The image shows search in header or top bar, but the image 3 specifically has a "Search" placeholder in the header or in text? 
                 Actually Image 3 has a Filter bar with pills. Let's assume global search covers it or add a specific one.
                 Wait, Image 3 top bar has "Search suppliers by name...". I'll add it.
             */}

                    <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                        <button className="p-1.5 rounded bg-gray-100 text-gray-900"><LayoutGrid className="h-4 w-4" /></button>
                        <button className="p-1.5 rounded text-gray-400 hover:text-gray-600"><ListIcon className="h-4 w-4" /></button>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suppliers.map(supplier => (
                    <SupplierCard key={supplier.id} supplier={supplier} />
                ))}

                {/* Add New Quick Card */}
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 flex flex-col items-center justify-center text-center hover:border-teal-300 hover:bg-teal-50/50 transition-colors cursor-pointer group h-full min-h-[300px]"
                    onClick={() => navigate('/suppliers/new')}
                >
                    <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                        <Plus className="h-6 w-6 text-teal-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Add New Supplier</h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-[200px]">Onboard a new vendor to your approved list</p>
                </div>
            </div>
        </div>
    );
}

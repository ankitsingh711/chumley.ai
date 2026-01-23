import { Download, Plus, LayoutGrid, List as ListIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SupplierCard, type Supplier } from '../components/suppliers/SupplierCard';

const suppliers: Supplier[] = [
    {
        id: '1',
        name: 'Nexus Cloud Services',
        category: 'Software & Infrastructure',
        status: 'Preferred',
        logoColor: 'bg-teal-600',
        contact: { name: 'Sarah Waters', role: 'Account Executive', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
        stats: { activeOrders: 12, totalSpend: '$42.8k' },
        lastOrder: 'Last order: 2 days ago'
    },
    {
        id: '2',
        name: 'Global Office Supplies',
        category: 'Office & Facilities',
        status: 'Standard',
        logoColor: 'bg-orange-500',
        contact: { name: 'David Chen', role: 'Sales Representative', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
        stats: { activeOrders: 5, totalSpend: '$18.2k' },
        lastOrder: 'Last order: 1 week ago'
    },
    {
        id: '3',
        name: 'Starlight Logistics',
        category: 'Shipping & Logistics',
        status: 'Review Pending',
        logoColor: 'bg-emerald-600',
        contact: { name: 'Elena Rodriguez', role: 'Logistics Manager', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
        stats: { activeOrders: 2, totalSpend: '$9.5k' },
        lastOrder: 'Contract expires soon'
    },
    {
        id: '4',
        name: 'Creative Pulse Agency',
        category: 'Marketing & Creative',
        status: 'Preferred',
        logoColor: 'bg-purple-600',
        contact: { name: 'Marcus Thorne', role: 'Creative Director', image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
        stats: { activeOrders: 8, totalSpend: '$31.4k' },
        lastOrder: 'Last order: 4 days ago'
    },
    {
        id: '5',
        name: 'Precision Hardware Co.',
        category: 'IT Hardware',
        status: 'Standard',
        logoColor: 'bg-blue-600',
        contact: { name: 'Thomas Miller', role: 'Tech Consultant', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
        stats: { activeOrders: 15, totalSpend: '$89.2k' },
        lastOrder: 'Last order: 1 day ago'
    }
];

export default function Suppliers() {
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
                    <Button><Plus className="mr-2 h-4 w-4" /> Add New Supplier</Button>
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
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 flex flex-col items-center justify-center text-center hover:border-teal-300 hover:bg-teal-50/50 transition-colors cursor-pointer group h-full min-h-[300px]">
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

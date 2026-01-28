import { useEffect, useState } from 'react';
import { Download, Plus, LayoutGrid, List as ListIcon, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SupplierCard, type Supplier as CardSupplier } from '../components/suppliers/SupplierCard';
import { suppliersApi } from '../services/suppliers.service';

interface AddSupplierForm {
    name: string;
    contactEmail: string;
    contactName: string;
    phone: string;
    address: string;
    category: string;
    status: string;
}

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState<CardSupplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<AddSupplierForm>({
        name: '',
        contactEmail: '',
        contactName: '',
        phone: '',
        address: '',
        category: 'Software',
        status: 'Standard'
    });
    const [errors, setErrors] = useState<Partial<AddSupplierForm>>({});

    const [activeFilter, setActiveFilter] = useState('All Vendors');

    const categories = ['Software', 'Office Supplies', 'Hardware', 'Marketing', 'Other'];
    const filterOptions = ['All Vendors', ...categories];
    const statuses = ['Preferred', 'Standard', 'Review Pending'];

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            const data = await suppliersApi.getAll();
            const mappedData: CardSupplier[] = data.map(s => ({
                id: s.id,
                name: s.name,
                category: s.category,
                status: (['Preferred', 'Standard', 'Review Pending'].includes(s.status) ? s.status : 'Standard') as any,
                logoColor: 'bg-teal-600',
                contact: {
                    name: s.contactName || 'Unknown',
                    role: 'Representative',
                    image: s.logoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(s.contactName || s.name),
                },
                stats: {
                    activeOrders: s.stats?.activeOrders || 0,
                    totalSpend: s.stats?.totalSpend ? `$${s.stats.totalSpend.toLocaleString()}` : '$0',
                },
                lastOrder: s.lastOrderDate ? new Date(s.lastOrderDate).toLocaleDateString() : 'No orders yet'
            }));
            setSuppliers(mappedData);
        } catch (error) {
            console.error('Failed to fetch suppliers:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter suppliers based on active selection
    const filteredSuppliers = activeFilter === 'All Vendors'
        ? suppliers
        : suppliers.filter(s => s.category === activeFilter);

    const handleOpenModal = () => {
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setFormData({
            name: '',
            contactEmail: '',
            contactName: '',
            phone: '',
            address: '',
            category: 'Software',
            status: 'Standard'
        });
        setErrors({});
    };

    const validateForm = () => {
        const newErrors: Partial<AddSupplierForm> = {};
        if (!formData.name) newErrors.name = 'Company Name is required';
        if (!formData.category) newErrors.category = 'Category is required';
        if (!formData.contactEmail) newErrors.contactEmail = 'Contact Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
            newErrors.contactEmail = 'Invalid email address';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setSaving(true);
            const payload = {
                name: formData.name,
                category: formData.category,
                status: formData.status,
                contactName: formData.contactName,
                contactEmail: formData.contactEmail,
            };
            const newSupplier = await suppliersApi.create(payload);

            const mappedNew: CardSupplier = {
                id: newSupplier.id,
                name: newSupplier.name,
                category: newSupplier.category,
                status: (['Preferred', 'Standard', 'Review Pending'].includes(newSupplier.status) ? newSupplier.status : 'Standard') as any,
                logoColor: 'bg-teal-600',
                contact: {
                    name: newSupplier.contactName || 'Unknown',
                    role: 'Representative',
                    image: newSupplier.logoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(newSupplier.contactName || newSupplier.name),
                },
                stats: {
                    activeOrders: 0,
                    totalSpend: '$0',
                },
                lastOrder: 'New',
            };

            setSuppliers([...suppliers, mappedNew]);
            handleCloseModal();
        } catch (error) {
            console.error('Failed to create supplier:', error);
        } finally {
            setSaving(false);
        }
    };

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
                    <Button onClick={handleOpenModal}><Plus className="mr-2 h-4 w-4" /> Add New Supplier</Button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
                    {filterOptions.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${activeFilter === filter
                                ? 'bg-teal-800 text-white'
                                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                        <button className="p-1.5 rounded bg-gray-100 text-gray-900"><LayoutGrid className="h-4 w-4" /></button>
                        <button className="p-1.5 rounded text-gray-400 hover:text-gray-600"><ListIcon className="h-4 w-4" /></button>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSuppliers.map(supplier => (
                    <SupplierCard key={supplier.id} supplier={supplier} />
                ))}

                {/* Add New Quick Card */}
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 flex flex-col items-center justify-center text-center hover:border-teal-300 hover:bg-teal-50/50 transition-colors cursor-pointer group h-full min-h-[300px]"
                    onClick={handleOpenModal}
                >
                    <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                        <Plus className="h-6 w-6 text-teal-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Add New Supplier</h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-[200px]">Onboard a new vendor to your approved list</p>
                </div>
            </div>

            {/* Add Supplier Modal */}
            {showAddModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto"
                    onClick={handleCloseModal}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8 max-h-[calc(100vh-4rem)] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Add New Supplier</h2>
                                <p className="text-sm text-gray-500">Onboard a new vendor to your approved list</p>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Company Information */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-4">Company Information</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Company Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className={`w - full rounded - lg border ${errors.name ? 'border-red-300' : 'border-gray-200'} px - 4 py - 2.5 text - sm outline - none focus: border - teal - 500 focus: ring - 1 focus: ring - teal - 500`}
                                            placeholder="e.g., ABC Corporation"
                                        />
                                        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Category <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className={`w - full rounded - lg border ${errors.category ? 'border-red-300' : 'border-gray-200'} px - 4 py - 2.5 text - sm outline - none focus: border - teal - 500 focus: ring - 1 focus: ring - teal - 500`}
                                            >
                                                {categories.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Status
                                            </label>
                                            <select
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                            >
                                                {statuses.map(status => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Contact Email <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.contactEmail}
                                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                            className={`w - full rounded - lg border ${errors.contactEmail ? 'border-red-300' : 'border-gray-200'} px - 4 py - 2.5 text - sm outline - none focus: border - teal - 500 focus: ring - 1 focus: ring - teal - 500`}
                                            placeholder="contact@company.com"
                                        />
                                        {errors.contactEmail && <p className="mt-1 text-xs text-red-600">{errors.contactEmail}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Contact Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.contactName}
                                            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                            placeholder="John Doe"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Address
                                        </label>
                                        <textarea
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            rows={3}
                                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                                            placeholder="123 Main St, City, State, ZIP"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t">
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
                                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                                    disabled={saving}
                                >
                                    {saving ? 'Adding Supplier...' : 'Add Supplier'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

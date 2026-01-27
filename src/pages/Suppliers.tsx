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

    const categories = ['Software', 'Office Supplies', 'Hardware', 'Marketing', 'Other'];
    const statuses = ['Preferred', 'Standard', 'Review Pending'];

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const data = await suppliersApi.getAll();
            const mappedSuppliers: CardSupplier[] = data.map(s => ({
                id: s.id,
                name: s.name,
                category: s.category,
                status: (s.status === 'Preferred' || s.status === 'Standard' || s.status === 'Review Pending') ? s.status : 'Standard',
                logoColor: 'bg-teal-600',
                contact: {
                    name: s.contactName || 'No Contact',
                    role: 'Representative',
                    image: 'https://ui-avatars.com/api/?name=' + (s.contactName || s.name) + '&background=random',
                },
                stats: {
                    activeOrders: s.stats?.activeOrders || 0,
                    totalSpend: s.stats?.totalSpend
                        ? `$${(s.stats.totalSpend / 1000).toFixed(1)} k`
                        : '$0.0k',
                },
                lastOrder: s.lastOrderDate
                    ? `Last order: ${new Date(s.lastOrderDate).toLocaleDateString()} `
                    : 'No orders yet'
            }));
            setSuppliers(mappedSuppliers);
        } catch (error) {
            console.error('Failed to fetch suppliers:', error);
        } finally {
            setLoading(false);
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Partial<AddSupplierForm> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Company name is required';
        }

        if (!formData.contactEmail.trim()) {
            newErrors.contactEmail = 'Contact email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
            newErrors.contactEmail = 'Invalid email format';
        }

        if (!formData.category) {
            newErrors.category = 'Category is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setSaving(true);
        try {
            await suppliersApi.create({
                name: formData.name,
                contactEmail: formData.contactEmail,
                contactName: formData.contactName || undefined,
                category: formData.category,
                status: formData.status,
            });

            // Reset form and close modal
            setFormData({
                name: '',
                contactEmail: '',
                contactName: '',
                phone: '',
                address: '',
                category: 'Software',
                status: 'Standard'
            });
            setShowAddModal(false);

            // Refresh suppliers list
            await fetchSuppliers();
        } catch (error: any) {
            console.error('Failed to create supplier:', error);
            alert(error.response?.data?.error || 'Failed to create supplier');
        } finally {
            setSaving(false);
        }
    };

    const handleOpenModal = () => {
        setShowAddModal(true);
        setErrors({});
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
                    <Button onClick={handleOpenModal}><Plus className="mr-2 h-4 w-4" /> Add New Supplier</Button>
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
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={handleCloseModal}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
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

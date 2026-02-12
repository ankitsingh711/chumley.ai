import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { ImageUpload } from '../ui/ImageUpload';
import { suppliersApi } from '../../services/suppliers.service';

interface AddSupplierProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newSupplier: any) => void;
    isRestricted: boolean;
}

interface AddSupplierForm {
    name: string;
    contactEmail: string;
    contactName: string;
    phone: string;
    address: string;
    category: string;
    status: string;
    logoUrl: string;
}

export function AddSupplierModal({ isOpen, onClose, onSuccess, isRestricted }: AddSupplierProps) {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<AddSupplierForm>({
        name: '',
        contactEmail: '',
        contactName: '',
        phone: '',
        address: '',
        category: 'Software',
        status: 'Standard',
        logoUrl: ''
    });
    const [errors, setErrors] = useState<Partial<AddSupplierForm>>({});

    const categories = ['Software', 'Office Supplies', 'Hardware', 'Marketing', 'Shipping & Logistics', 'Other'];
    const statuses = ['Preferred', 'Standard', 'Review Pending'];

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
                logoUrl: formData.logoUrl,
            };

            const newSupplier = await suppliersApi.create(payload);
            onSuccess(newSupplier);
            onClose();

            // Reset form
            setFormData({
                name: '',
                contactEmail: '',
                contactName: '',
                phone: '',
                address: '',
                category: 'Software',
                status: 'Standard',
                logoUrl: ''
            });

        } catch (error) {
            console.error('Failed to create supplier:', error);
            alert("Failed to create supplier");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-xl max-w-3xl w-full my-8 max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex-shrink-0 bg-white border-b px-8 py-6 flex items-center justify-between rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{isRestricted ? 'Request New Supplier' : 'Add New Supplier'}</h2>
                        <p className="text-sm text-gray-500 mt-1">{isRestricted ? 'Submit details for admin approval' : 'Onboard a new vendor to your approved list'}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Company Information */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                                <div className="h-8 w-1 bg-primary-500 rounded-full" />
                                <h3 className="text-lg font-bold text-gray-900">Company Information</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Company Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className={`w-full rounded-xl border ${errors.name ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-100'} px-4 py-3 text-sm outline-none focus:ring-4 transition-all`}
                                            placeholder="e.g., ABC Corporation"
                                        />
                                        {errors.name && <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.name}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Category <span className="text-red-500">*</span>
                                            </label>
                                            <Select
                                                value={formData.category}
                                                onChange={(val) => setFormData({ ...formData, category: val })}
                                                options={categories.map(cat => ({ value: cat, label: cat }))}
                                                error={errors.category}
                                                placeholder="Select Category"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Status
                                            </label>
                                            <Select
                                                value={formData.status}
                                                onChange={(val) => setFormData({ ...formData, status: val })}
                                                options={statuses.map(status => ({ value: status, label: status }))}
                                                placeholder="Select Status"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Address
                                        </label>
                                        <textarea
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            rows={3}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all resize-none"
                                            placeholder="123 Main St, City, State, ZIP"
                                        />
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100/50">
                                    <ImageUpload
                                        value={formData.logoUrl}
                                        onChange={(url) => setFormData({ ...formData, logoUrl: url })}
                                        label="Company Logo"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                                <div className="h-8 w-1 bg-blue-500 rounded-full" />
                                <h3 className="text-lg font-bold text-gray-900">Contact Information</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Contact Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.contactName}
                                        onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all"
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Contact Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.contactEmail}
                                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                        className={`w-full rounded-xl border ${errors.contactEmail ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-100'} px-4 py-3 text-sm outline-none focus:ring-4 transition-all`}
                                        placeholder="contact@company.com"
                                    />
                                    {errors.contactEmail && <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.contactEmail}</p>}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all"
                                        placeholder="+1 (555) 000-0000"
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Modal Footer */}
                <div className="flex-shrink-0 bg-gray-50 border-t px-8 py-5 flex items-center justify-end gap-3 rounded-b-2xl">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="px-6 py-2.5 h-auto text-sm font-semibold"
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="px-6 py-2.5 h-auto bg-primary-600 hover:bg-primary-600 text-sm font-semibold shadow-md shadow-primary-200"
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isRestricted ? 'Sending Request...' : 'Adding Supplier...'}
                            </>
                        ) : (
                            isRestricted ? 'Submit Request' : 'Add Supplier'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

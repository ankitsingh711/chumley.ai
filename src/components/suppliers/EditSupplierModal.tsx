import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { suppliersApi } from '../../services/suppliers.service';
import { ImageUpload } from '../ui/ImageUpload';
import type { Supplier, UpdateSupplierDetailsInput } from '../../types/api';

interface EditSupplierModalProps {
    supplier: Supplier;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (updatedSupplier: Supplier) => void;
}

export function EditSupplierModal({ supplier, isOpen, onClose, onSuccess }: EditSupplierModalProps) {
    const [formData, setFormData] = useState<UpdateSupplierDetailsInput>({
        name: supplier.name,
        category: supplier.category,
        status: supplier.status,
        contactName: supplier.contactName || '',
        contactEmail: supplier.contactEmail || '',
        phone: supplier.details?.phone || '',
        address: supplier.details?.address || '',
        city: supplier.details?.city || '',
        state: supplier.details?.state || '',
        zipCode: supplier.details?.zipCode || '',
        country: supplier.details?.country || 'USA',
        paymentTerms: supplier.details?.paymentTerms || 'Net 30',
        paymentMethod: supplier.details?.paymentMethod || 'Wire Transfer',
        internalNotes: supplier.details?.internalNotes || '',
        logoUrl: supplier.logoUrl || ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const categories = ['Software', 'Office Supplies', 'Hardware', 'Marketing', 'Other'];
    const statuses = ['Preferred', 'Standard', 'Review Pending'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSaving(true);

        try {
            const updated = await suppliersApi.updateDetails(supplier.id, formData);
            onSuccess(updated);
            onClose();
        } catch (err: any) {
            console.error('Failed to update supplier:', err);
            setError(err.response?.data?.error || 'Failed to update supplier');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8 max-h-[calc(100vh-4rem)] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Edit Supplier Profile</h2>
                        <p className="text-sm text-gray-500">Update supplier information and details</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Modal Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Company Information */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Company Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Company Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                    required
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
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
                        <div className="mt-4">
                            <ImageUpload
                                value={formData.logoUrl}
                                onChange={(url: string) => setFormData({ ...formData, logoUrl: url })}
                                label="Company Logo"
                            />
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Contact Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.contactName}
                                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Contact Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.contactEmail}
                                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address Information */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Address Information</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Street Address
                                </label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                    placeholder="1201 Tech Plaza"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        City
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                        placeholder="Austin"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        State
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                        placeholder="TX"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        ZIP Code
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.zipCode}
                                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                        placeholder="78701"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Information */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Payment Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Payment Terms
                                </label>
                                <select
                                    value={formData.paymentTerms}
                                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="Net 15">Net 15</option>
                                    <option value="Net 30">Net 30</option>
                                    <option value="Net 45">Net 45</option>
                                    <option value="Net 60">Net 60</option>
                                    <option value="Due on Receipt">Due on Receipt</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Payment Method
                                </label>
                                <select
                                    value={formData.paymentMethod}
                                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="Wire Transfer">Wire Transfer</option>
                                    <option value="ACH">ACH</option>
                                    <option value="Check">Check</option>
                                    <option value="Credit Card">Credit Card</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Internal Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Internal Notes
                        </label>
                        <textarea
                            value={formData.internalNotes}
                            onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                            rows={3}
                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                            placeholder="Add internal procurement notes..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-teal-600 hover:bg-teal-700"
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

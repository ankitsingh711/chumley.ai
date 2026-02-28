import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Loader2,
    Building2,
    Tag,
    MapPin,
    UserRound,
    Mail,
    Phone,
    CheckCircle2,
    Info,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { ImageUpload } from '../ui/ImageUpload';
import { suppliersApi } from '../../services/suppliers.service';
import type { Supplier } from '../../types/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AddSupplierProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newSupplier: Supplier) => void;
    isRestricted: boolean;
}

interface AddSupplierForm {
    name: string;
    contactEmail: string;
    contactName: string;
    phone: string;
    address: string;
    category: string;
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
        logoUrl: ''
    });
    const [errors, setErrors] = useState<Partial<AddSupplierForm>>({});

    const categories = ['Software', 'Office Supplies', 'Hardware', 'Marketing', 'Shipping & Logistics', 'Other'];
    useEffect(() => {
        if (!isOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !saving) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose, saving]);

    const readiness = useMemo(() => {
        const emailValid = EMAIL_REGEX.test(formData.contactEmail);
        return {
            companyName: Boolean(formData.name.trim()),
            category: Boolean(formData.category),
            address: Boolean(formData.address.trim()),
            contactName: Boolean(formData.contactName.trim()),
            contactEmail: emailValid,
            phone: Boolean(formData.phone.trim()),
        };
    }, [formData]);

    const canSubmit = Object.values(readiness).every(Boolean) && !saving;
    const selectedCategory = formData.category || 'Uncategorized';
    const supplierInitials = formData.name
        ? formData.name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : 'SP';

    const handleDismiss = () => {
        if (saving) return;
        onClose();
    };

    const handleFieldChange = <K extends keyof AddSupplierForm>(field: K, value: AddSupplierForm[K]) => {
        setFormData((current) => ({ ...current, [field]: value }));
        setErrors((current) => {
            if (!current[field]) return current;
            return { ...current, [field]: undefined };
        });
    };

    const validateForm = () => {
        const newErrors: Partial<AddSupplierForm> = {};
        if (!formData.name) newErrors.name = 'Company Name is required';
        if (!formData.category) newErrors.category = 'Category is required';
        if (!formData.contactName) newErrors.contactName = 'Contact Name is required';
        if (!formData.phone) newErrors.phone = 'Phone Number is required';
        if (!formData.address) newErrors.address = 'Address is required';
        if (!formData.contactEmail) newErrors.contactEmail = 'Contact Email is required';
        else if (!EMAIL_REGEX.test(formData.contactEmail)) {
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
                contactName: formData.contactName,
                contactEmail: formData.contactEmail,
                phone: formData.phone,
                address: formData.address,
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
                logoUrl: ''
            });
            setErrors({});

        } catch (error) {
            console.error('Failed to create supplier:', error);
            alert("Failed to create supplier");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
            onClick={handleDismiss}
        >
            <div
                className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="relative border-b border-gray-100 bg-gradient-to-r from-white via-primary-50/55 to-accent-50/45 px-5 py-4 sm:px-6">
                    <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary-200/30 blur-2xl" />
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700">
                            {isRestricted ? 'Supplier Request' : 'Supplier Onboarding'}
                        </p>
                        <h2 className="mt-1 text-3xl font-bold text-gray-900">
                            {isRestricted ? 'Request New Supplier' : 'Add New Supplier'}
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                            {isRestricted ? 'Submit supplier details for approval and activation.' : 'Onboard a new vendor with complete profile details.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="absolute right-5 top-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 sm:right-6"
                        aria-label="Close supplier modal"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="grid min-h-0 gap-6 overflow-y-auto p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                        <div className="space-y-5">
                            <section className="rounded-xl border border-gray-200 bg-white p-4">
                                <div className="mb-4 flex items-center justify-between gap-2">
                                    <h3 className="text-base font-semibold text-gray-900">Company Information</h3>
                                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600">
                                        Required fields marked *
                                    </span>
                                </div>

                                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                Company Name <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => handleFieldChange('name', e.target.value)}
                                                    className={`h-11 w-full rounded-lg border bg-white pl-9 pr-4 text-sm text-gray-900 outline-none transition focus:ring-2 ${
                                                        errors.name
                                                            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                                                            : 'border-gray-200 focus:border-primary-500 focus:ring-primary-100'
                                                    }`}
                                                    placeholder="e.g. ABC Corporation"
                                                />
                                            </div>
                                            {errors.name && <p className="mt-1.5 text-xs text-red-600">{errors.name}</p>}
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                Category <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <Tag className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                <Select
                                                    value={formData.category}
                                                    onChange={(val) => handleFieldChange('category', val)}
                                                    options={categories.map((cat) => ({ value: cat, label: cat }))}
                                                    error={errors.category}
                                                    placeholder="Select category"
                                                    triggerClassName="h-11 pl-9"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                Address <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                                                <textarea
                                                    value={formData.address}
                                                    onChange={(e) => handleFieldChange('address', e.target.value)}
                                                    rows={3}
                                                    className={`w-full resize-none rounded-lg border bg-white pl-9 pr-4 pt-3 text-sm text-gray-900 outline-none transition focus:ring-2 ${
                                                        errors.address
                                                            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                                                            : 'border-gray-200 focus:border-primary-500 focus:ring-primary-100'
                                                    }`}
                                                    placeholder="123 Main St, City, State, ZIP"
                                                />
                                            </div>
                                            {errors.address && <p className="mt-1.5 text-xs text-red-600">{errors.address}</p>}
                                        </div>
                                    </div>

                                    <aside className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
                                        <ImageUpload
                                            value={formData.logoUrl}
                                            onChange={(url) => handleFieldChange('logoUrl', url)}
                                            label="Company Logo"
                                        />
                                    </aside>
                                </div>
                            </section>

                            <section className="rounded-xl border border-gray-200 bg-white p-4">
                                <h3 className="mb-4 text-base font-semibold text-gray-900">Primary Contact</h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Contact Name <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={formData.contactName}
                                                onChange={(e) => handleFieldChange('contactName', e.target.value)}
                                                className={`h-11 w-full rounded-lg border bg-white pl-9 pr-4 text-sm text-gray-900 outline-none transition focus:ring-2 ${
                                                    errors.contactName
                                                        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                                                        : 'border-gray-200 focus:border-primary-500 focus:ring-primary-100'
                                                }`}
                                                placeholder="John Doe"
                                            />
                                        </div>
                                        {errors.contactName && <p className="mt-1.5 text-xs text-red-600">{errors.contactName}</p>}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Contact Email <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="email"
                                                value={formData.contactEmail}
                                                onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                                                className={`h-11 w-full rounded-lg border bg-white pl-9 pr-4 text-sm text-gray-900 outline-none transition focus:ring-2 ${
                                                    errors.contactEmail
                                                        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                                                        : 'border-gray-200 focus:border-primary-500 focus:ring-primary-100'
                                                }`}
                                                placeholder="contact@company.com"
                                            />
                                        </div>
                                        {errors.contactEmail && <p className="mt-1.5 text-xs text-red-600">{errors.contactEmail}</p>}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Phone Number <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => handleFieldChange('phone', e.target.value)}
                                                className={`h-11 w-full rounded-lg border bg-white pl-9 pr-4 text-sm text-gray-900 outline-none transition focus:ring-2 ${
                                                    errors.phone
                                                        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                                                        : 'border-gray-200 focus:border-primary-500 focus:ring-primary-100'
                                                }`}
                                                placeholder="+1 (555) 000-0000"
                                            />
                                        </div>
                                        {errors.phone && <p className="mt-1.5 text-xs text-red-600">{errors.phone}</p>}
                                    </div>
                                </div>
                            </section>
                        </div>

                        <aside className="space-y-4 xl:sticky xl:top-0 xl:self-start">
                            <section className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Preview</h3>
                                <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
                                    <div className="flex items-center gap-3">
                                        {formData.logoUrl ? (
                                            <img src={formData.logoUrl} alt="Supplier logo preview" className="h-11 w-11 rounded-lg border border-gray-200 object-cover" />
                                        ) : (
                                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-700 text-sm font-semibold text-white">
                                                {supplierInitials}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-gray-900">{formData.name || 'Supplier Name'}</p>
                                            <p className="truncate text-xs text-gray-500">{selectedCategory}</p>
                                        </div>
                                    </div>
                                    <p className="mt-3 text-sm text-gray-700">{formData.contactName || 'Primary Contact'}</p>
                                    <p className="text-xs text-gray-500">{formData.contactEmail || 'contact@company.com'}</p>
                                </div>
                            </section>

                            <section className="rounded-xl border border-gray-200 bg-white p-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Readiness</h3>
                                <div className="mt-3 space-y-2 text-sm">
                                    <p className={`inline-flex items-center gap-2 ${readiness.companyName ? 'text-emerald-700' : 'text-gray-500'}`}>
                                        <CheckCircle2 className="h-4 w-4" />
                                        Company name
                                    </p>
                                    <p className={`inline-flex items-center gap-2 ${readiness.category ? 'text-emerald-700' : 'text-gray-500'}`}>
                                        <CheckCircle2 className="h-4 w-4" />
                                        Category selected
                                    </p>
                                    <p className={`inline-flex items-center gap-2 ${readiness.address ? 'text-emerald-700' : 'text-gray-500'}`}>
                                        <CheckCircle2 className="h-4 w-4" />
                                        Address
                                    </p>
                                    <p className={`inline-flex items-center gap-2 ${readiness.contactName ? 'text-emerald-700' : 'text-gray-500'}`}>
                                        <CheckCircle2 className="h-4 w-4" />
                                        Contact name
                                    </p>
                                    <p className={`inline-flex items-center gap-2 ${readiness.contactEmail ? 'text-emerald-700' : 'text-gray-500'}`}>
                                        <CheckCircle2 className="h-4 w-4" />
                                        Valid email
                                    </p>
                                    <p className={`inline-flex items-center gap-2 ${readiness.phone ? 'text-emerald-700' : 'text-gray-500'}`}>
                                        <CheckCircle2 className="h-4 w-4" />
                                        Phone number
                                    </p>
                                </div>
                            </section>

                            <p className="inline-flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                {isRestricted
                                    ? 'This submission will be routed for admin approval.'
                                    : 'You can edit supplier details later from the supplier profile.'}
                            </p>
                        </aside>
                    </div>

                    <footer className="flex-shrink-0 border-t border-gray-100 bg-white/95 px-5 py-4 sm:px-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleDismiss}
                                className="sm:min-w-[9rem]"
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-primary-700 hover:bg-primary-800 sm:min-w-[12rem]"
                                disabled={!canSubmit}
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
                    </footer>
                </form>
            </div>
        </div>,
        document.body
    );
}

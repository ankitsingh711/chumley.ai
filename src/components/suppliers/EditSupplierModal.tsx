import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Loader2,
    Building2,
    Tag,
    UserRound,
    Mail,
    Phone,
    MapPin,
    Clock3,
    Wallet,
    CheckCircle2,
    Info,
    ShieldCheck,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { suppliersApi } from '../../services/suppliers.service';
import { ImageUpload } from '../ui/ImageUpload';
import { Select } from '../ui/Select';
import { cn } from '../../lib/utils';
import type { Supplier, UpdateSupplierDetailsInput } from '../../types/api';

interface EditSupplierModalProps {
    supplier: Supplier;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (updatedSupplier: Supplier) => void;
}

type FormErrorField = 'name' | 'category' | 'contactEmail' | 'qualityScore' | 'communicationScore';
type FormErrors = Partial<Record<FormErrorField, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CATEGORY_OPTIONS = ['Software', 'Office Supplies', 'Hardware', 'Marketing', 'Shipping & Logistics', 'Other'];
const STATUS_OPTIONS = ['Preferred', 'Standard', 'Review Pending', 'Pending Approval', 'Rejected'];

const PAYMENT_TERMS_OPTIONS = [
    'Net 15',
    'Net 30',
    'Net 45',
    'Net 60',
    'Due on Receipt',
];

const PAYMENT_METHOD_OPTIONS = [
    'Wire Transfer',
    'ACH',
    'Check',
    'Credit Card',
    'Virtual Card',
];

const toInitials = (value: string) => value
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const buildInitialFormData = (supplier: Supplier): UpdateSupplierDetailsInput => ({
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
    logoUrl: supplier.logoUrl || '',
    deliveryDelayAverage: supplier.details?.deliveryDelayAverage ?? 0,
    qualityScore: supplier.details?.qualityScore ?? 100,
    communicationScore: supplier.details?.communicationScore ?? 100,
});

const getApiErrorMessage = (error: unknown): string => {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as { response?: { data?: { error?: unknown } } }).response;
        const responseError = response?.data?.error;

        if (typeof responseError === 'string') return responseError;

        if (Array.isArray(responseError)) {
            const firstIssue = responseError[0];
            if (typeof firstIssue === 'object' && firstIssue !== null && 'message' in firstIssue) {
                const message = (firstIssue as { message?: unknown }).message;
                if (typeof message === 'string' && message.trim()) return message;
            }
        }
    }

    return 'Failed to update supplier details. Please try again.';
};

export function EditSupplierModal({ supplier, isOpen, onClose, onSuccess }: EditSupplierModalProps) {
    const [formData, setFormData] = useState<UpdateSupplierDetailsInput>(() => buildInitialFormData(supplier));
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSaving, setIsSaving] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setFormData(buildInitialFormData(supplier));
        setErrors({});
        setSubmitError(null);
    }, [isOpen, supplier]);

    const handleDismiss = useCallback(() => {
        if (isSaving) return;
        onClose();
    }, [isSaving, onClose]);

    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        const previousPaddingRight = document.body.style.paddingRight;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.style.paddingRight = previousPaddingRight;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleDismiss();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, handleDismiss]);

    const setField = <K extends keyof UpdateSupplierDetailsInput>(field: K, value: UpdateSupplierDetailsInput[K]) => {
        setFormData((current) => ({ ...current, [field]: value }));
    };

    const clearError = (field: FormErrorField) => {
        setErrors((current) => {
            if (!current[field]) return current;
            return { ...current, [field]: undefined };
        });
    };

    const validateForm = (): boolean => {
        const nextErrors: FormErrors = {};

        const name = (formData.name || '').trim();
        const category = (formData.category || '').trim();
        const email = (formData.contactEmail || '').trim();
        const quality = formData.qualityScore ?? 0;
        const communication = formData.communicationScore ?? 0;

        if (name.length < 2) {
            nextErrors.name = 'Company name must be at least 2 characters.';
        }

        if (!category) {
            nextErrors.category = 'Please select a category.';
        }

        if (email && !EMAIL_REGEX.test(email)) {
            nextErrors.contactEmail = 'Enter a valid email address.';
        }

        if (quality < 0 || quality > 100) {
            nextErrors.qualityScore = 'Quality score must be between 0 and 100.';
        }

        if (communication < 0 || communication > 100) {
            nextErrors.communicationScore = 'Communication score must be between 0 and 100.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const normalizedCategoryOptions = useMemo(() => {
        const currentCategory = (formData.category || '').trim();
        if (!currentCategory || CATEGORY_OPTIONS.includes(currentCategory)) return CATEGORY_OPTIONS;
        return [currentCategory, ...CATEGORY_OPTIONS];
    }, [formData.category]);

    const normalizedStatusOptions = useMemo(() => {
        const currentStatus = (formData.status || '').trim();
        if (!currentStatus || STATUS_OPTIONS.includes(currentStatus)) return STATUS_OPTIONS;
        return [currentStatus, ...STATUS_OPTIONS];
    }, [formData.status]);

    const checkpoints = useMemo(() => {
        const name = (formData.name || '').trim();
        const category = (formData.category || '').trim();
        const email = (formData.contactEmail || '').trim();

        return [
            { label: 'Company name', complete: name.length >= 2 },
            { label: 'Category selected', complete: Boolean(category) },
            { label: 'Primary contact', complete: Boolean((formData.contactName || '').trim()) },
            { label: 'Valid contact email', complete: !email || EMAIL_REGEX.test(email) },
            {
                label: 'Address added',
                complete: Boolean((formData.address || '').trim()) && Boolean((formData.city || '').trim()) && Boolean((formData.country || '').trim()),
            },
            {
                label: 'Performance metrics',
                complete: (formData.qualityScore ?? -1) >= 0 && (formData.communicationScore ?? -1) >= 0,
            },
        ];
    }, [formData]);

    const completedCheckpointCount = checkpoints.filter((item) => item.complete).length;
    const canSubmit = !isSaving && completedCheckpointCount >= 2;

    const inputClassName = (hasError?: boolean) => cn(
        'h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:ring-4',
        hasError
            ? 'border-rose-300 focus:border-rose-300 focus:ring-rose-100'
            : 'border-slate-200 focus:border-primary-300 focus:ring-primary-100/70'
    );

    const iconInputClassName = (hasError?: boolean) => cn(inputClassName(hasError), 'pl-9');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!validateForm()) return;

        setSubmitError(null);
        setIsSaving(true);

        try {
            const updated = await suppliersApi.updateDetails(supplier.id, {
                ...formData,
                name: (formData.name || '').trim(),
                category: (formData.category || '').trim(),
                contactName: (formData.contactName || '').trim(),
                contactEmail: (formData.contactEmail || '').trim(),
                address: (formData.address || '').trim(),
                city: (formData.city || '').trim(),
                state: (formData.state || '').trim(),
                zipCode: (formData.zipCode || '').trim(),
                country: (formData.country || '').trim(),
                paymentTerms: (formData.paymentTerms || '').trim(),
                paymentMethod: (formData.paymentMethod || '').trim(),
                internalNotes: (formData.internalNotes || '').trim(),
                phone: (formData.phone || '').trim(),
            });

            onSuccess(updated);
            onClose();
        } catch (error: unknown) {
            console.error('Failed to update supplier:', error);
            setSubmitError(getApiErrorMessage(error));
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const supplierName = (formData.name || '').trim() || 'Supplier Name';
    const supplierCategory = (formData.category || '').trim() || 'Uncategorized';
    const initials = toInitials(supplierName || 'Supplier');

    return createPortal(
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
            onClick={handleDismiss}
        >
            <div
                className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_45px_110px_-50px_rgba(15,23,42,0.95)]"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="relative border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-primary-50/70 px-5 py-4 sm:px-6">
                    <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-primary-200/35 blur-3xl" />
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Supplier Profile</p>
                        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Edit Supplier</h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Update supplier details, payment preferences, and performance signals.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="absolute right-5 top-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                        aria-label="Close edit supplier modal"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                        <div className="space-y-4">
                            {submitError && (
                                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                    {submitError}
                                </div>
                            )}

                            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                                <div className="mb-4 flex items-center justify-between gap-2">
                                    <h3 className="text-base font-semibold text-slate-900">Company Information</h3>
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                                        Required: Name, Category
                                    </span>
                                </div>

                                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                                Company Name <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={formData.name || ''}
                                                    onChange={(event) => {
                                                        setField('name', event.target.value);
                                                        clearError('name');
                                                    }}
                                                    className={iconInputClassName(Boolean(errors.name))}
                                                    placeholder="e.g. Request for New Supplier"
                                                    required
                                                />
                                            </div>
                                            {errors.name && <p className="mt-1.5 text-xs text-rose-600">{errors.name}</p>}
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                                    Category <span className="text-rose-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <Tag className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    <Select
                                                        value={formData.category || ''}
                                                        onChange={(value) => {
                                                            setField('category', value);
                                                            clearError('category');
                                                        }}
                                                        options={normalizedCategoryOptions.map((option) => ({ value: option, label: option }))}
                                                        placeholder="Select category"
                                                        error={errors.category}
                                                        triggerClassName="h-11 rounded-xl pl-9"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                                                <div className="relative">
                                                    <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    <Select
                                                        value={formData.status || ''}
                                                        onChange={(value) => setField('status', value)}
                                                        options={normalizedStatusOptions.map((option) => ({ value: option, label: option }))}
                                                        placeholder="Select status"
                                                        triggerClassName="h-11 rounded-xl pl-9"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <aside className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                                        <ImageUpload
                                            value={formData.logoUrl || ''}
                                            onChange={(url: string) => setField('logoUrl', url)}
                                            label="Company Logo"
                                        />
                                    </aside>
                                </div>
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                                <h3 className="mb-4 text-base font-semibold text-slate-900">Primary Contact</h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Contact Name</label>
                                        <div className="relative">
                                            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                value={formData.contactName || ''}
                                                onChange={(event) => setField('contactName', event.target.value)}
                                                className={iconInputClassName()}
                                                placeholder="Supplier New"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Contact Email</label>
                                        <div className="relative">
                                            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="email"
                                                value={formData.contactEmail || ''}
                                                onChange={(event) => {
                                                    setField('contactEmail', event.target.value);
                                                    clearError('contactEmail');
                                                }}
                                                className={iconInputClassName(Boolean(errors.contactEmail))}
                                                placeholder="supplier@company.com"
                                            />
                                        </div>
                                        {errors.contactEmail && <p className="mt-1.5 text-xs text-rose-600">{errors.contactEmail}</p>}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                                        <div className="relative">
                                            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="tel"
                                                value={formData.phone || ''}
                                                onChange={(event) => setField('phone', event.target.value)}
                                                className={iconInputClassName()}
                                                placeholder="+1 (555) 000-0000"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                                <h3 className="mb-4 text-base font-semibold text-slate-900">Address Information</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Street Address</label>
                                        <div className="relative">
                                            <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                            <textarea
                                                rows={2}
                                                value={formData.address || ''}
                                                onChange={(event) => setField('address', event.target.value)}
                                                className={cn(inputClassName(), 'h-auto resize-none pl-9 pt-3')}
                                                placeholder="123 Main Street"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">City</label>
                                            <input
                                                type="text"
                                                value={formData.city || ''}
                                                onChange={(event) => setField('city', event.target.value)}
                                                className={inputClassName()}
                                                placeholder="Austin"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">State</label>
                                            <input
                                                type="text"
                                                value={formData.state || ''}
                                                onChange={(event) => setField('state', event.target.value)}
                                                className={inputClassName()}
                                                placeholder="TX"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">ZIP Code</label>
                                            <input
                                                type="text"
                                                value={formData.zipCode || ''}
                                                onChange={(event) => setField('zipCode', event.target.value)}
                                                className={inputClassName()}
                                                placeholder="78701"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">Country</label>
                                            <input
                                                type="text"
                                                value={formData.country || ''}
                                                onChange={(event) => setField('country', event.target.value)}
                                                className={inputClassName()}
                                                placeholder="USA"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                                <h3 className="mb-4 text-base font-semibold text-slate-900">Payment & Performance</h3>

                                <div className="grid gap-5 lg:grid-cols-2">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">Payment Terms</label>
                                            <div className="relative">
                                                <Clock3 className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <Select
                                                    value={formData.paymentTerms || ''}
                                                    onChange={(value) => setField('paymentTerms', value)}
                                                    options={PAYMENT_TERMS_OPTIONS.map((option) => ({ value: option, label: option }))}
                                                    placeholder="Select payment terms"
                                                    triggerClassName="h-11 rounded-xl pl-9"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">Payment Method</label>
                                            <div className="relative">
                                                <Wallet className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <Select
                                                    value={formData.paymentMethod || ''}
                                                    onChange={(value) => setField('paymentMethod', value)}
                                                    options={PAYMENT_METHOD_OPTIONS.map((option) => ({ value: option, label: option }))}
                                                    placeholder="Select payment method"
                                                    triggerClassName="h-11 rounded-xl pl-9"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">Delivery Delay (Days)</label>
                                            <input
                                                type="number"
                                                value={formData.deliveryDelayAverage ?? 0}
                                                onChange={(event) => {
                                                    const nextValue = Number.parseInt(event.target.value, 10);
                                                    setField('deliveryDelayAverage', Number.isNaN(nextValue) ? 0 : nextValue);
                                                }}
                                                className={inputClassName()}
                                            />
                                            <p className="mt-1 text-xs text-slate-500">Negative values indicate early delivery.</p>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-slate-700">Quality Score</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={formData.qualityScore ?? 0}
                                                    onChange={(event) => {
                                                        const nextValue = Number.parseInt(event.target.value, 10);
                                                        setField('qualityScore', Number.isNaN(nextValue) ? 0 : nextValue);
                                                        clearError('qualityScore');
                                                    }}
                                                    className={inputClassName(Boolean(errors.qualityScore))}
                                                />
                                                {errors.qualityScore && <p className="mt-1.5 text-xs text-rose-600">{errors.qualityScore}</p>}
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-slate-700">Communication Score</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={formData.communicationScore ?? 0}
                                                    onChange={(event) => {
                                                        const nextValue = Number.parseInt(event.target.value, 10);
                                                        setField('communicationScore', Number.isNaN(nextValue) ? 0 : nextValue);
                                                        clearError('communicationScore');
                                                    }}
                                                    className={inputClassName(Boolean(errors.communicationScore))}
                                                />
                                                {errors.communicationScore && <p className="mt-1.5 text-xs text-rose-600">{errors.communicationScore}</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                                <label className="mb-1 block text-sm font-medium text-slate-700">Internal Notes</label>
                                <textarea
                                    rows={4}
                                    value={formData.internalNotes || ''}
                                    onChange={(event) => setField('internalNotes', event.target.value)}
                                    className={cn(inputClassName(), 'h-auto resize-none py-3')}
                                    placeholder="Add context for approvals, escalation notes, and relationship details."
                                />
                            </section>
                        </div>

                        <aside className="space-y-4 xl:sticky xl:top-0 xl:self-start">
                            <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Profile Preview</h3>
                                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                                    <div className="flex items-center gap-3">
                                        {formData.logoUrl ? (
                                            <img
                                                src={formData.logoUrl}
                                                alt="Supplier logo preview"
                                                className="h-11 w-11 rounded-lg border border-slate-200 object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-700 text-sm font-semibold text-white">
                                                {initials || 'SP'}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-slate-900">{supplierName}</p>
                                            <p className="truncate text-xs text-slate-500">{supplierCategory}</p>
                                        </div>
                                    </div>
                                    <p className="mt-3 truncate text-sm text-slate-700">{formData.contactName || 'Primary contact not set'}</p>
                                    <p className="truncate text-xs text-slate-500">{formData.contactEmail || 'No contact email'}</p>
                                </div>
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-4">
                                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Completion</h3>
                                <p className="mt-2 text-sm text-slate-700">
                                    {completedCheckpointCount}/{checkpoints.length} quality checks completed
                                </p>
                                <div className="mt-3 space-y-2 text-sm">
                                    {checkpoints.map((checkpoint) => (
                                        <p
                                            key={checkpoint.label}
                                            className={cn(
                                                'inline-flex items-center gap-2',
                                                checkpoint.complete ? 'text-emerald-700' : 'text-slate-500'
                                            )}
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                            {checkpoint.label}
                                        </p>
                                    ))}
                                </div>
                            </section>

                            <p className="inline-flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                Changes update supplier records immediately and will reflect across requests, orders, and profile summaries.
                            </p>
                        </aside>
                    </div>

                    <footer className="flex-shrink-0 border-t border-slate-200 bg-white/95 px-5 py-4 sm:px-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleDismiss}
                                className="sm:min-w-[9rem]"
                                disabled={isSaving}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-primary-700 hover:bg-primary-800 sm:min-w-[12rem]"
                                disabled={!canSubmit}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving Changes...
                                    </>
                                ) : (
                                    'Save Changes'
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

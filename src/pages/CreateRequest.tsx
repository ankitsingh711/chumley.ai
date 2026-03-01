import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import {
    Plus,
    Trash2,
    ChevronRight,
    ClipboardList,
    Landmark,
    Layers3,
    Truck,
    CircleAlert,
    Info,
    ReceiptText,
    Hash,
    PoundSterling,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { requestsApi } from '../services/requests.service';
import { suppliersApi } from '../services/suppliers.service';
import { departmentsApi, type Department } from '../services/departments.service';
import type { Supplier } from '../types/api';
import { isPaginatedResponse } from '../types/pagination';
import { type CreateRequestInput, Branch, UserRole } from '../types/api';
import { useAuth } from '../hooks/useAuth';

import { type Category } from '../types/category';
import { categoryService } from '../services/category.service';
import { AddSupplierModal } from '../components/suppliers/AddSupplierModal';

interface ItemRow {
    description: string;
    quantity: number | '';
    unitPrice: number | '';
}

interface SupplierWithDepartments extends Supplier {
    departments?: Array<{ id: string }>;
}

const formatCurrency = (value: number) =>
    `£${Number(value || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CreateRequest() {
    const navigate = useNavigate();

    const { user } = useAuth();

    // Form State
    const [branch, setBranch] = useState<Branch>(Branch.CHESSINGTON);
    const [reason, setReason] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState(''); // Main Category
    const [selectedSubCategoryId, setSelectedSubCategoryId] = useState(''); // Sub Category
    const [items, setItems] = useState<ItemRow[]>([
        { description: '', quantity: '', unitPrice: '' }
    ]);
    const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

    // Data State
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchSuppliers = useCallback(async () => {
        try {
            const response = await suppliersApi.getAll();
            const data = isPaginatedResponse(response) ? response.data : response;
            setSuppliers(data);
        } catch (error) {
            console.error('Failed to fetch suppliers:', error);
        }
    }, []);

    const loadDepartments = useCallback(async () => {
        try {
            const data = await departmentsApi.getAll();
            setDepartments(data);

            // Auto-select department if user is restricted to a single one
            if (user?.role !== UserRole.SYSTEM_ADMIN && user?.departmentId) {
                // Verify the user's department is in the loaded list
                const userDept = data.find(d => d.id === user.departmentId);
                if (userDept) {
                    setSelectedDepartmentId(userDept.id);
                }
            }
        } catch (err) {
            console.error('Failed to load departments', err);
        }
    }, [user?.departmentId, user?.role]);

    useEffect(() => {
        void fetchSuppliers();
        void loadDepartments();
    }, [fetchSuppliers, loadDepartments]);

    useEffect(() => {
        if (branch && selectedDepartmentId) {
            categoryService.getCategoriesByBranchAndDepartment(branch, selectedDepartmentId)
                .then(data => setCategories(data))
                .catch(err => console.error('Failed to load categories', err));
        } else {
            setCategories([]);
        }
    }, [branch, selectedDepartmentId]);

    const isStaffCategory = (name: string) => /\bstaff\b/i.test(name);
    const parentCategories = categories.filter((category) => !category.parentId && !isStaffCategory(category.name));
    const subCategories = selectedCategoryId
        ? categories.filter((category) => category.parentId === selectedCategoryId && !isStaffCategory(category.name))
        : [];

    const availableDepartments = useMemo(
        () => departments.filter((department) => (
            user?.role === UserRole.SYSTEM_ADMIN || department.id === user?.departmentId
        )),
        [departments, user?.departmentId, user?.role],
    );

    const filteredSuppliers = useMemo(
        () => suppliers.filter((supplier) => {
            if (!selectedDepartmentId) return true;
            const supplierWithDepartments = supplier as SupplierWithDepartments;
            const supplierDepartments = supplierWithDepartments.departments;
            if (!supplierDepartments || supplierDepartments.length === 0) return true;
            return supplierDepartments.some((department) => department.id === selectedDepartmentId);
        }),
        [suppliers, selectedDepartmentId],
    );

    const selectedDepartment = departments.find((department) => department.id === selectedDepartmentId);
    const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedSupplierId);
    const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
    const selectedSubCategory = categories.find((category) => category.id === selectedSubCategoryId);

    const itemsWithTotals = items.map((item) => ({
        ...item,
        total: Number(item.quantity || 0) * Number(item.unitPrice || 0),
    }));
    const validLineItems = items.filter((item) =>
        item.description.trim() && Number(item.quantity) > 0 && Number(item.unitPrice) > 0
    );

    const addItem = () => {
        setItems([...items, { description: '', quantity: '', unitPrice: '' }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: keyof ItemRow, value: string | number) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        setItems(updated);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
    };

    const totalAmount = calculateTotal();
    const finalCategoryId = subCategories.length > 0 ? selectedSubCategoryId : selectedCategoryId;
    const selectedCategoryLabel = selectedSubCategory?.name || selectedCategory?.name || 'Not selected';
    const canSubmit = Boolean(
        validLineItems.length > 0
        && selectedSupplierId
        && selectedDepartmentId
        && finalCategoryId,
    );

    const handleSubmit = async () => {
        setError('');

        // Validation
        if (validLineItems.length === 0) {
            setError('Please add at least one valid item');
            return;
        }

        if (!selectedSupplierId) {
            setError('Please select a supplier');
            return;
        }

        if (!selectedDepartmentId) {
            setError('Please select a department');
            return;
        }

        if (!finalCategoryId) {
            setError(subCategories.length > 0 ? 'Please select a spending subcategory' : 'Please select a spending category');
            return;
        }

        setLoading(true);
        try {
            const data: CreateRequestInput = {
                reason: reason || undefined,
                supplierId: selectedSupplierId,
                budgetCategory: selectedDepartment?.name,
                categoryId: finalCategoryId || undefined,
                items: validLineItems.map((item) => ({
                    description: item.description,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice)
                })),
                branch,
            };

            await requestsApi.create(data);
            navigate('/requests');
        } catch (err: unknown) {
            const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
                || 'Failed to create request';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleSupplierAdded = (newSupplier: Supplier) => {
        // optimistically add to list or reload
        setSuppliers((prev) => [...prev, newSupplier]);
        setSelectedSupplierId(newSupplier.id);
        // loadSuppliers(); // optionally reload to get full data if needed
    };

    return (
        <div className="space-y-6 pb-20">
            <AddSupplierModal
                isOpen={showAddSupplierModal}
                onClose={() => setShowAddSupplierModal(false)}
                onSuccess={handleSupplierAdded}
                isRestricted={user?.role === UserRole.MEMBER}
            />

            <section className="relative overflow-hidden rounded-2xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/60 to-accent-50/70 p-6 shadow-sm">
                <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary-200/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-accent-200/50 blur-3xl" />

                <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-700">
                            <button
                                type="button"
                                className="transition hover:text-primary-800"
                                onClick={() => navigate('/requests')}
                            >
                                Requests
                            </button>
                            <ChevronRight className="h-3.5 w-3.5 text-primary-500" />
                            <span>New Purchase Request</span>
                        </div>
                        <h1 className="mt-2 text-3xl font-bold text-gray-900">Create Purchase Request</h1>
                        <p className="mt-2 max-w-2xl text-sm text-gray-600">
                            Build a complete request package with the right supplier, category, and line-item detail for fast approvals.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => navigate('/requests')} className="border-white/70 bg-white/90 backdrop-blur">
                            Cancel
                        </Button>
                        <Button
                            className="bg-primary-700 hover:bg-primary-800"
                            onClick={handleSubmit}
                            disabled={loading || !canSubmit}
                        >
                            {loading ? 'Submitting...' : 'Submit for Approval'}
                        </Button>
                    </div>
                </div>

                <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Active Line Items
                            <ClipboardList className="h-4 w-4 text-primary-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{validLineItems.length}</p>
                        <p className="mt-1 text-xs text-gray-500">Valid rows ready for submission</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Department
                            <Landmark className="h-4 w-4 text-primary-600" />
                        </div>
                        <p className="mt-2 text-lg font-semibold text-gray-900">{selectedDepartment?.name || 'Not selected'}</p>
                        <p className="mt-1 text-xs text-gray-500">Budget owner for this request</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Supplier
                            <Truck className="h-4 w-4 text-primary-600" />
                        </div>
                        <p className="mt-2 truncate text-lg font-semibold text-gray-900">{selectedSupplier?.name || 'Not selected'}</p>
                        <p className="mt-1 text-xs text-gray-500">Vendor for fulfilment</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Request Total
                            <ReceiptText className="h-4 w-4 text-emerald-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-emerald-700">{formatCurrency(totalAmount)}</p>
                        <p className="mt-1 text-xs text-gray-500">Estimated commercial value</p>
                    </div>
                </div>
            </section>

            {error && (
                <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <p className="inline-flex items-center gap-2 text-sm font-medium text-rose-700">
                        <CircleAlert className="h-4 w-4" />
                        {error}
                    </p>
                </section>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-gray-900">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-xs font-bold text-white">1</span>
                            General Information
                        </h3>

                        <div className="grid grid-cols-1 gap-5">
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Center / Base <span className="text-rose-500">*</span>
                                    </label>
                                    <Select
                                        value={branch}
                                        onChange={(value) => {
                                            setBranch(value as Branch);
                                            setSelectedCategoryId('');
                                            setSelectedSubCategoryId('');
                                        }}
                                        options={[{ value: Branch.CHESSINGTON, label: 'Chessington' }]}
                                        triggerClassName="h-11"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Department <span className="text-rose-500">*</span>
                                    </label>
                                    <Select
                                        value={selectedDepartmentId}
                                        onChange={(value) => {
                                            setSelectedDepartmentId(value);
                                            setSelectedCategoryId('');
                                            setSelectedSubCategoryId('');
                                        }}
                                        options={[
                                            ...(user?.role === UserRole.SYSTEM_ADMIN ? [{ value: '', label: 'Select department...' }] : []),
                                            ...availableDepartments.map((department) => ({ value: department.id, label: department.name })),
                                        ]}
                                        placeholder={user?.role === UserRole.SYSTEM_ADMIN ? 'Select department...' : undefined}
                                        disabled={user?.role !== UserRole.SYSTEM_ADMIN}
                                        error={departments.length === 0 ? 'Loading departments...' : undefined}
                                        triggerClassName="h-11"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Spending Category <span className="text-rose-500">*</span>
                                    </label>
                                    <Select
                                        value={selectedCategoryId}
                                        onChange={(value) => {
                                            setSelectedCategoryId(value);
                                            setSelectedSubCategoryId('');
                                        }}
                                        options={[
                                            { value: '', label: 'Select category...' },
                                            ...parentCategories.map((category) => ({ value: category.id, label: category.name })),
                                        ]}
                                        disabled={!selectedDepartmentId}
                                        placeholder={!selectedDepartmentId ? 'Select a department first' : 'Select category...'}
                                        triggerClassName="h-11"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Spending Subcategory {subCategories.length > 0 ? <span className="text-rose-500">*</span> : null}
                                    </label>
                                    <Select
                                        value={selectedSubCategoryId}
                                        onChange={setSelectedSubCategoryId}
                                        options={[
                                            { value: '', label: subCategories.length > 0 ? 'Select subcategory...' : 'No subcategory required' },
                                            ...subCategories.map((category) => ({ value: category.id, label: category.name })),
                                        ]}
                                        disabled={subCategories.length === 0}
                                        placeholder={subCategories.length === 0 ? 'No subcategory required' : 'Select subcategory...'}
                                        triggerClassName="h-11"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="mb-1.5 flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Supplier / Vendor <span className="text-rose-500">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddSupplierModal(true)}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 transition hover:text-primary-800"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        New Vendor
                                    </button>
                                </div>
                                <Select
                                    value={selectedSupplierId}
                                    onChange={setSelectedSupplierId}
                                    options={[
                                        { value: '', label: 'Select supplier...' },
                                        ...filteredSuppliers.map((supplier) => ({
                                            value: supplier.id,
                                            label: `${supplier.name} (${supplier.category})`,
                                        })),
                                    ]}
                                    placeholder={!selectedDepartmentId ? 'Select a department first' : 'Select supplier...'}
                                    disabled={!selectedDepartmentId}
                                    triggerClassName="h-11"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Reason for Purchase</label>
                                <textarea
                                    value={reason}
                                    onChange={(event) => setReason(event.target.value)}
                                    placeholder="Briefly explain the business need and expected impact..."
                                    className="min-h-[110px] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                                />
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="mb-6 flex items-center justify-between gap-3">
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-xs font-bold text-white">2</span>
                                Request Items
                            </h3>
                            <Button size="sm" variant="outline" onClick={addItem}>
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Add Line
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {itemsWithTotals.map((item, index) => (
                                <article
                                    key={index}
                                    className="group rounded-xl border border-gray-200 bg-gray-50/70 p-3 transition hover:border-primary-200 hover:bg-primary-50/20"
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Line {index + 1}</p>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                                            disabled={items.length === 1}
                                            title="Remove line"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_100px_140px_auto]">
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(event) => updateItem(index, 'description', event.target.value)}
                                            placeholder="Item description"
                                            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                                        />
                                        <div className="relative">
                                            <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(event) => updateItem(index, 'quantity', event.target.value === '' ? '' : parseInt(event.target.value, 10))}
                                                placeholder="Qty"
                                                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                            />
                                        </div>
                                        <div className="relative">
                                            <PoundSterling className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unitPrice}
                                                onChange={(event) => updateItem(index, 'unitPrice', event.target.value === '' ? '' : parseFloat(event.target.value))}
                                                placeholder="Unit price"
                                                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                            />
                                        </div>
                                        <div className="inline-flex h-10 min-w-[110px] items-center justify-end rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900">
                                            {formatCurrency(item.total)}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <p className="inline-flex items-start gap-2 text-sm text-blue-800">
                            <Info className="mt-0.5 h-4 w-4 shrink-0" />
                            For capital equipment over £5,000, include supporting quotes or sourcing notes in the justification.
                        </p>
                    </section>
                </div>

                <aside className="space-y-6">
                    <section className="sticky top-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900">Request Summary</h3>

                        <div className="mt-4 space-y-3 border-b border-gray-100 pb-4 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Line items</span>
                                <span className="font-medium text-gray-900">{items.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Valid rows</span>
                                <span className="font-medium text-gray-900">{validLineItems.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Department</span>
                                <span className="max-w-[10rem] truncate text-right font-medium text-gray-900">
                                    {selectedDepartment?.name || 'Not selected'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Supplier</span>
                                <span className="max-w-[10rem] truncate text-right font-medium text-gray-900">
                                    {selectedSupplier?.name || 'Not selected'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Category</span>
                                <span className="max-w-[10rem] truncate text-right font-medium text-gray-900">
                                    {selectedCategoryLabel}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-base font-semibold text-gray-900">Total</span>
                            <span className="text-2xl font-bold text-primary-700">{formatCurrency(totalAmount)}</span>
                        </div>

                        <div className="mt-5 space-y-2 text-sm">
                            <p className={`inline-flex items-center gap-2 ${selectedDepartmentId ? 'text-emerald-700' : 'text-gray-500'}`}>
                                <ClipboardList className="h-4 w-4" />
                                Department selected
                            </p>
                            <p className={`inline-flex items-center gap-2 ${selectedSupplierId ? 'text-emerald-700' : 'text-gray-500'}`}>
                                <Truck className="h-4 w-4" />
                                Supplier selected
                            </p>
                            <p className={`inline-flex items-center gap-2 ${finalCategoryId ? 'text-emerald-700' : 'text-gray-500'}`}>
                                <Layers3 className="h-4 w-4" />
                                Spending category selected
                            </p>
                            <p className={`inline-flex items-center gap-2 ${validLineItems.length > 0 ? 'text-emerald-700' : 'text-gray-500'}`}>
                                <ReceiptText className="h-4 w-4" />
                                At least one valid item
                            </p>
                        </div>

                        <Button
                            className="mt-5 w-full bg-primary-700 hover:bg-primary-800"
                            onClick={handleSubmit}
                            disabled={loading || !canSubmit}
                        >
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </Button>
                        <p className="mt-3 text-center text-xs text-gray-500">
                            Requires approval from {selectedDepartmentId ? 'Department Head' : 'Manager'}
                        </p>
                    </section>
                </aside>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Plus, Trash2 } from 'lucide-react';
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
    quantity: number;
    unitPrice: number;
}

export default function CreateRequest() {
    const navigate = useNavigate();

    const { user } = useAuth();
    const isMember = user?.role === UserRole.MEMBER;

    // Form State
    const [branch, setBranch] = useState<Branch>(Branch.CHESSINGTON);
    const [reason, setReason] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState(''); // Main Category
    const [selectedSubCategoryId, setSelectedSubCategoryId] = useState(''); // Sub Category
    const [items, setItems] = useState<ItemRow[]>([
        { description: '', quantity: 1, unitPrice: 0 }
    ]);
    const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

    // Data State
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSuppliers();
        loadDepartments();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const response = await suppliersApi.getAll();
            const data = isPaginatedResponse(response) ? response.data : response;
            setSuppliers(data);
        } catch (error) {
            console.error('Failed to fetch suppliers:', error);
        }
    };

    const loadDepartments = async () => {
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
    };

    useEffect(() => {
        if (branch && selectedDepartmentId) {
            categoryService.getCategoriesByBranchAndDepartment(branch, selectedDepartmentId)
                .then(data => setCategories(data))
                .catch(err => console.error('Failed to load categories', err));
        } else {
            setCategories([]);
        }
    }, [branch, selectedDepartmentId]);

    const parentCategories = categories.filter(c => !c.parentId);
    const subCategories = selectedCategoryId ? categories.filter(c => c.parentId === selectedCategoryId) : [];

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
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
        return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    };

    const handleSubmit = async () => {
        setError('');

        // Validation
        const validItems = items.filter(item => item.description && item.quantity > 0 && item.unitPrice > 0);
        if (validItems.length === 0) {
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

        const finalCategoryId = subCategories.length > 0 ? selectedSubCategoryId : selectedCategoryId;

        if (!finalCategoryId && !isMember) {
            setError(subCategories.length > 0 ? 'Please select a spending subcategory' : 'Please select a spending category');
            return;
        }

        setLoading(true);
        try {
            const data: CreateRequestInput = {
                reason: reason || undefined,
                supplierId: selectedSupplierId,
                budgetCategory: departments.find(d => d.id === selectedDepartmentId)?.name,
                categoryId: (subCategories.length > 0 ? selectedSubCategoryId : selectedCategoryId) || undefined,
                items: validItems,
                branch: branch,
            };

            await requestsApi.create(data);
            navigate('/requests');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create request');
        } finally {
            setLoading(false);
        }
    };

    const handleSupplierAdded = (newSupplier: any) => {
        // optimistically add to list or reload
        setSuppliers(prev => [...prev, newSupplier]);
        setSelectedSupplierId(newSupplier.id);
        // loadSuppliers(); // optionally reload to get full data if needed
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <AddSupplierModal
                isOpen={showAddSupplierModal}
                onClose={() => setShowAddSupplierModal(false)}
                onSuccess={handleSupplierAdded}
                isRestricted={user?.role !== UserRole.SYSTEM_ADMIN}
            />
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                            <span className="cursor-pointer hover:text-gray-900" onClick={() => navigate('/requests')}>Requests</span>
                            <span>›</span>
                            <span className="font-medium text-gray-900">New Purchase Request</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Create Purchase Request</h1>
                        <p className="text-sm text-gray-500">Specify details for internal review and vendor processing.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/requests')}>Cancel</Button>
                    <Button
                        className="bg-primary-700 hover:bg-primary-600"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Submitting...' : 'Submit for Approval'}
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* General Info */}
                    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-6">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] text-white font-bold">1</span>
                            General Information
                        </h3>

                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    Center / Base <span className="text-red-500">*</span>
                                </label>
                                <Select
                                    value={branch}
                                    onChange={(val) => {
                                        setBranch(val as Branch);
                                        setSelectedCategoryId('');
                                        setSelectedSubCategoryId('');
                                    }}
                                    options={[
                                        { value: Branch.CHESSINGTON, label: 'Chessington' },
                                        { value: Branch.ROYSTON, label: 'Royston' }
                                    ]}
                                    placeholder="Select Center..."
                                    className="w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    Department <span className="text-red-500">*</span>
                                </label>
                                <Select
                                    value={selectedDepartmentId}
                                    onChange={(val) => {
                                        setSelectedDepartmentId(val);
                                        setSelectedCategoryId('');
                                        setSelectedSubCategoryId('');
                                    }}
                                    options={[
                                        ...(user?.role === UserRole.SYSTEM_ADMIN ? [{ value: '', label: 'Select Department...' }] : []),
                                        ...departments
                                            .filter(dept => {
                                                if (user?.role === UserRole.SYSTEM_ADMIN) return true;
                                                return dept.id === user?.departmentId;
                                            })
                                            .map(dept => ({ value: dept.id, label: dept.name }))
                                    ]}
                                    placeholder={user?.role === UserRole.SYSTEM_ADMIN ? "Select Department..." : undefined}
                                    disabled={user?.role !== UserRole.SYSTEM_ADMIN}
                                    error={departments.length === 0 ? 'Loading departments...' : undefined}
                                />
                            </div>

                            <div className="space-y-4">
                                {!isMember && (
                                    <>
                                        <Select
                                            label="Spending Category"
                                            value={selectedCategoryId}
                                            onChange={(val) => {
                                                setSelectedCategoryId(val);
                                                setSelectedSubCategoryId('');
                                            }}
                                            options={[
                                                { value: '', label: 'Select category...' },
                                                ...parentCategories.map(c => ({ value: c.id, label: c.name }))
                                            ]}
                                            disabled={!selectedDepartmentId}
                                            placeholder={!selectedDepartmentId ? "Select a department first" : "Select a category..."}
                                            className="w-full"
                                        />


                                        {subCategories.length > 0 && (
                                            <div>
                                                <Select
                                                    label="Spending Subcategory"
                                                    value={selectedSubCategoryId}
                                                    onChange={setSelectedSubCategoryId}
                                                    options={[
                                                        { value: '', label: 'Select subcategory...' },
                                                        ...subCategories.map(c => ({ value: c.id, label: c.name }))
                                                    ]}
                                                    placeholder="Select a subcategory..."
                                                    className="w-full"
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-bold text-gray-700">
                                        Supplier / Vendor <span className="text-red-500">*</span>
                                    </label>

                                    <button
                                        onClick={() => setShowAddSupplierModal(true)}
                                        className="text-[10px] text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1"
                                    >
                                        <Plus className="h-3 w-3" /> New Vendor
                                    </button>
                                </div>
                                <Select
                                    value={selectedSupplierId}
                                    onChange={setSelectedSupplierId}
                                    options={[
                                        { value: '', label: 'Select a supplier...' },
                                        ...suppliers
                                            .filter(s => {
                                                // Filter logic:
                                                // 1. If no department selected, show none (or all? Plan says "Filter Vendors list based on selected Department")
                                                // 2. If department selected, show suppliers linked to that department OR global suppliers (no dept linked)
                                                // Note: Frontend Supplier type might need 'departments' property.
                                                // Let's assume suppliers loaded has 'departments' as per controller.
                                                if (!selectedDepartmentId) return true;
                                                const sAny = s as any;
                                                const supplierDepts = sAny.departments as { id: string }[];
                                                if (!supplierDepts || supplierDepts.length === 0) return true; // Global/Shared
                                                return supplierDepts.some(d => d.id === selectedDepartmentId);
                                            })
                                            .map(s => ({ value: s.id, label: `${s.name} (${s.category})` }))
                                    ]}
                                    placeholder={!selectedDepartmentId ? "Select a department first" : "Select a supplier..."}
                                    className="w-full"
                                    disabled={!selectedDepartmentId}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Reason for Purchase</label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Briefly explain the business need..."
                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary-500 min-h-[80px]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Request Items */}
                    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] text-white font-bold">2</span>
                                Request Items
                            </h3>
                            <Button size="sm" variant="ghost" className="text-primary-600" onClick={addItem}>
                                <Plus className="mr-1 h-3 w-3" /> Add Row
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={index} className="flex gap-3 items-start group">
                                    <div className="flex-1">
                                        {index === 0 && <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>}
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                                            placeholder="Item name or description"
                                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary-500"
                                        />
                                    </div>
                                    <div className="w-20">
                                        {index === 0 && <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>}
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary-500 text-center"
                                        />
                                    </div>
                                    <div className="w-32">
                                        {index === 0 && <label className="block text-xs font-medium text-gray-500 mb-1">Unit Price (£)</label>}
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.unitPrice}
                                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary-500 text-right"
                                        />
                                    </div>
                                    <div className="w-8 flex items-end justify-center pt-8">
                                        <button
                                            onClick={() => removeItem(index)}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remove item"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                            <p className="text-sm font-medium text-gray-600">Total: <span className="text-gray-900 text-lg ml-2">£{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
                        </div>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-4 border border-blue-100">
                        <h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Helpful Tip</h4>
                        <p className="text-xs text-blue-700 leading-relaxed">
                            For capital equipment over £5,000, please ensure you have attached the necessary 3 competitive quotes in the "Files" section (coming soon).
                        </p>
                    </div>
                </div>

                {/* Right Column: Order Summary */}
                <div className="space-y-6">
                    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm sticky top-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Request Summary</h3>

                        <div className="space-y-3 text-sm border-b border-gray-100 pb-4 mb-4">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Subtotal</span>
                                <span className="font-medium text-gray-900">£{calculateTotal().toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-6">
                            <span className="text-base font-bold text-gray-900">Total</span>
                            <span className="text-xl font-bold text-primary-600">£{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <Button className="w-full bg-primary-700 hover:bg-primary-600" onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </Button>
                        <p className="text-xs text-gray-500 text-center mt-3">
                            Requires approval from {selectedDepartmentId ? 'Department Head' : 'Manager'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}



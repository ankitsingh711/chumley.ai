import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Package, Plus, Edit2, Trash2, FolderTree, X, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { CatalogSkeleton } from '../components/skeletons/CatalogSkeleton';
import { categoryService } from '../services/category.service';
import { departmentsApi, type Department } from '../services/departments.service';
import type { Category } from '../types/category';

export default function Catalog() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDept, setSelectedDept] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit] = useState(9); // 9 items per page (3x3 grid)
    const [meta, setMeta] = useState({ total: 0, page: 1, limit: 9, totalPages: 0 });

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        departmentId: '',
        parentId: ''
    });

    // Delete State
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [page, selectedDept, search]); // Reload on these changes

    // Debounce search? Ideally yes, but for now simple effect dependency
    // Maybe add debounce later if needed.

    const loadData = async () => {
        try {
            setLoading(true);
            const [depts, result] = await Promise.all([
                departmentsApi.getAll(),
                categoryService.getAllCategories({
                    departmentId: selectedDept === 'all' ? undefined : selectedDept,
                    page,
                    limit,
                    search: search || undefined
                })
            ]);

            setCategories(result.data);
            setMeta(result.meta);
            setDepartments(depts);
        } catch (error) {
            console.error('Failed to load catalog:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (category?: Category) => {
        if (category) {
            setEditingId(category.id);
            setFormData({
                name: category.name,
                description: category.description || '',
                departmentId: category.departmentId,
                parentId: category.parentId || ''
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                description: '',
                departmentId: departments[0]?.id || '', // Default to first dept
                parentId: ''
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            if (editingId) {
                await categoryService.updateCategory(editingId, {
                    name: formData.name,
                    description: formData.description,
                    parentId: formData.parentId || undefined
                });
            } else {
                await categoryService.createCategory({
                    name: formData.name,
                    description: formData.description,
                    departmentId: formData.departmentId,
                    parentId: formData.parentId || undefined
                });
            }
            await loadData();
            setShowModal(false);
        } catch (error) {
            console.error('Failed to save category:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        try {
            await categoryService.deleteCategory(deletingId);
            setDeletingId(null);
            await loadData();
        } catch (error) {
            console.error('Failed to delete category:', error);
        }
    };

    // Filter logic is now server-side, so we just use `categories` directly
    const filteredCategories = categories;

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1); // Reset to page 1 on search
    };

    const handleDeptChange = (value: string) => {
        setSelectedDept(value);
        setPage(1); // Reset to page 1 on filter
    };




    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Catalog Management</h1>
                    <p className="text-sm text-gray-500">Organize products and services into purchasing categories.</p>
                </div>
                <Button onClick={() => handleOpenModal()}>
                    <Plus className="mr-2 h-4 w-4" /> Add Category
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search categories..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        value={search}
                        onChange={handleSearchChange}
                    />
                </div>
                <div className="w-full sm:w-64">
                    <Select
                        value={selectedDept}
                        onChange={handleDeptChange}
                        options={[
                            { value: 'all', label: 'All Departments' },
                            ...departments.map(d => ({ value: d.id, label: d.name }))
                        ]}
                    />
                </div>
            </div>

            {/* Categories List */}
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <CatalogSkeleton />
                    ) : filteredCategories.length === 0 ? (
                        <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-gray-900 font-medium">No categories found</h3>
                            <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
                        </div>
                    ) : (
                        filteredCategories.map((category) => {
                            const deptName = departments.find(d => d.id === category.departmentId)?.name || 'Unknown';
                            return (
                                <div key={category.id} className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-200 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                                                <Package className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{category.name}</h3>
                                                <p className="text-xs text-gray-500 bg-gray-100 inline-block px-2 py-0.5 rounded-full mt-1">
                                                    {deptName}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleOpenModal(category)}
                                                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(category.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {category.description && (
                                        <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                                            {category.description}
                                        </p>
                                    )}

                                    {/* Metadata footer */}
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                                        <span>ID: {category.id.slice(0, 8)}...</span>
                                        {category.parentId && (
                                            <span className="flex items-center gap-1">
                                                <FolderTree className="h-3 w-3" /> Sub-category
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Pagination Controls */}
                {!loading && meta.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                        <div className="text-sm text-gray-500">
                            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, meta.total)} of {meta.total} results
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                                disabled={page === meta.totalPages}
                                className="px-3"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit/Create Modal */}
            {showModal && createPortal(
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">
                                {editingId ? 'Edit Category' : 'New Category'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                    placeholder="e.g. Office Supplies"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
                                    placeholder="Brief description of this category..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Department <span className="text-red-500">*</span>
                                </label>
                                <Select
                                    value={formData.departmentId}
                                    onChange={(val) => setFormData({ ...formData, departmentId: val })}
                                    options={departments.map(d => ({ value: d.id, label: d.name }))}
                                    className="w-full"
                                    disabled={!!editingId} // Maybe disable shifting depts for existing cats to avoid confusion? Or allow it.
                                />
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex gap-3">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={saving} className="flex-1 bg-primary-600 hover:bg-primary-700">
                                    {saving ? 'Saving...' : 'Save Category'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {deletingId && createPortal(
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setDeletingId(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 text-center">
                            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600">
                                <Trash2 className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Category?</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                Are you sure you want to delete this category? This action cannot be undone.
                            </p>

                            <div className="flex gap-3 justify-center">
                                <Button
                                    variant="outline"
                                    onClick={() => setDeletingId(null)}
                                    className="w-32"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={confirmDelete}
                                    className="w-32 bg-red-600 hover:bg-red-700 text-white"
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

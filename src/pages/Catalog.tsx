import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Package,
    Plus,
    Edit2,
    Trash2,
    FolderTree,
    X,
    Search,
    Building2,
    Layers3,
    Grid3X3,
    List,
    CalendarClock,
    ArrowUpDown,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { CatalogSkeleton } from '../components/skeletons/CatalogSkeleton';
import { Pagination } from '../components/Pagination';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { categoryService } from '../services/category.service';
import { departmentsApi, type Department } from '../services/departments.service';
import type { Category } from '../types/category';

type ViewMode = 'grid' | 'list';
type QuickFilter = 'all' | 'top_level' | 'sub_categories';
type SortOption = 'recent' | 'name_asc' | 'name_desc';

const PAGE_LIMIT = 9;

const formatDate = (dateValue: string) =>
    new Date(dateValue).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

export default function Catalog() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [selectedDept, setSelectedDept] = useState<string>('all');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
    const [sortBy, setSortBy] = useState<SortOption>('recent');

    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ total: 0, page: 1, limit: PAGE_LIMIT, totalPages: 0 });

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [parentCandidates, setParentCandidates] = useState<Category[]>([]);
    const [loadingParentCandidates, setLoadingParentCandidates] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        departmentId: '',
        parentId: '',
    });

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setSearch(searchInput.trim());
        }, 300);

        return () => window.clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        void loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, selectedDept, search]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [depts, result] = await Promise.all([
                departmentsApi.getAll(),
                categoryService.getAllCategories({
                    departmentId: selectedDept === 'all' ? undefined : selectedDept,
                    page,
                    limit: PAGE_LIMIT,
                    search: search || undefined,
                }),
            ]);

            if (result.meta.totalPages > 0 && page > result.meta.totalPages) {
                setPage(result.meta.totalPages);
                return;
            }

            setCategories(result.data);
            setMeta(result.meta);
            setDepartments(depts);
        } catch (error) {
            console.error('Failed to load catalog:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadParentCandidates = async (departmentId: string, excludeId?: string) => {
        if (!departmentId) {
            setParentCandidates([]);
            return;
        }

        try {
            setLoadingParentCandidates(true);
            const result = await categoryService.getAllCategories({
                departmentId,
                page: 1,
                limit: 200,
            });
            setParentCandidates(result.data.filter((category) => category.id !== excludeId));
        } catch (error) {
            console.error('Failed to load parent candidates:', error);
            setParentCandidates([]);
        } finally {
            setLoadingParentCandidates(false);
        }
    };

    const handleOpenModal = (category?: Category) => {
        if (category) {
            setEditingId(category.id);
            setFormData({
                name: category.name,
                description: category.description || '',
                departmentId: category.departmentId,
                parentId: category.parentId || '',
            });
            void loadParentCandidates(category.departmentId, category.id);
        } else {
            const defaultDepartmentId = selectedDept !== 'all'
                ? selectedDept
                : departments[0]?.id || '';

            setEditingId(null);
            setFormData({
                name: '',
                description: '',
                departmentId: defaultDepartmentId,
                parentId: '',
            });
            if (defaultDepartmentId) {
                void loadParentCandidates(defaultDepartmentId);
            } else {
                setParentCandidates([]);
            }
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        if (saving) return;
        setShowModal(false);
        setEditingId(null);
        setParentCandidates([]);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            setSaving(true);
            if (editingId) {
                await categoryService.updateCategory(editingId, {
                    name: formData.name.trim(),
                    description: formData.description.trim() || undefined,
                    parentId: formData.parentId || undefined,
                });
            } else {
                await categoryService.createCategory({
                    name: formData.name.trim(),
                    description: formData.description.trim() || undefined,
                    departmentId: formData.departmentId,
                    parentId: formData.parentId || undefined,
                });
            }

            await loadData();
            handleCloseModal();
        } catch (error) {
            console.error('Failed to save category:', error);
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deletingId) return;

        try {
            setDeleting(true);
            await categoryService.deleteCategory(deletingId);
            setDeletingId(null);
            await loadData();
        } catch (error) {
            console.error('Failed to delete category:', error);
        } finally {
            setDeleting(false);
        }
    };

    const activeDepartmentLabel = selectedDept === 'all'
        ? 'All Departments'
        : departments.find((department) => department.id === selectedDept)?.name || 'Unknown Department';

    const visibleCategories = useMemo(() => {
        let list = [...categories];

        if (quickFilter === 'top_level') {
            list = list.filter((category) => !category.parentId);
        } else if (quickFilter === 'sub_categories') {
            list = list.filter((category) => Boolean(category.parentId));
        }

        list.sort((left, right) => {
            if (sortBy === 'name_asc') return left.name.localeCompare(right.name);
            if (sortBy === 'name_desc') return right.name.localeCompare(left.name);
            return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        });

        return list;
    }, [categories, quickFilter, sortBy]);

    const summary = useMemo(() => {
        const topLevelCount = categories.filter((category) => !category.parentId).length;
        const subCategoryCount = categories.filter((category) => Boolean(category.parentId)).length;
        const withDescriptionCount = categories.filter((category) => Boolean(category.description?.trim())).length;

        return {
            topLevelCount,
            subCategoryCount,
            withDescriptionCount,
        };
    }, [categories]);

    const quickFilterCounts = useMemo(() => {
        const allCount = categories.length;
        const topLevelCount = categories.filter((category) => !category.parentId).length;
        const subCategoryCount = categories.filter((category) => Boolean(category.parentId)).length;

        return {
            all: allCount,
            top_level: topLevelCount,
            sub_categories: subCategoryCount,
        };
    }, [categories]);

    const parentOptions = useMemo(() => {
        const options = parentCandidates
            .filter((category) => category.departmentId === formData.departmentId)
            .map((category) => ({
                value: category.id,
                label: category.name,
            }));

        return [{ value: '', label: 'No parent (Top-level category)' }, ...options];
    }, [formData.departmentId, parentCandidates]);

    return (
        <div className="space-y-6">
            <section className="relative rounded-2xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/70 to-accent-50/80 p-6 shadow-sm">
                <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary-200/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 left-8 h-52 w-52 rounded-full bg-accent-200/50 blur-3xl" />

                <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700">Procurement Taxonomy</p>
                        <h1 className="mt-2 text-3xl font-bold text-gray-900">Catalog Management</h1>
                        <p className="mt-2 max-w-2xl text-sm text-gray-600">
                            Build a clean purchasing taxonomy so requests route correctly, budgets stay controlled, and reporting stays accurate.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-10 items-center gap-1 rounded-lg border border-white/80 bg-white/90 px-3 text-sm font-medium text-gray-700 backdrop-blur">
                            <Building2 className="h-4 w-4 text-primary-700" />
                            {activeDepartmentLabel}
                        </span>
                        <Button onClick={() => handleOpenModal()} className="bg-primary-700 hover:bg-primary-800">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Category
                        </Button>
                    </div>
                </div>

                <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Total Catalog Size
                            <Layers3 className="h-4 w-4 text-primary-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{meta.total}</p>
                        <p className="mt-1 text-xs text-gray-500">Across current search and department</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Top-Level Categories
                            <FolderTree className="h-4 w-4 text-emerald-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-emerald-700">{summary.topLevelCount}</p>
                        <p className="mt-1 text-xs text-gray-500">Visible on this page</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Sub-Categories
                            <Package className="h-4 w-4 text-amber-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-amber-700">{summary.subCategoryCount}</p>
                        <p className="mt-1 text-xs text-gray-500">Nested classification nodes</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Described Categories
                            <Building2 className="h-4 w-4 text-primary-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{summary.withDescriptionCount}</p>
                        <p className="mt-1 text-xs text-gray-500">With documented purpose</p>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:p-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="relative w-full xl:max-w-md">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search category names and descriptions"
                                className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 text-sm text-gray-700 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                value={searchInput}
                                onChange={(event) => {
                                    setSearchInput(event.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="w-full sm:w-56">
                                <Select
                                    value={selectedDept}
                                    onChange={(value) => {
                                        setSelectedDept(value);
                                        setPage(1);
                                    }}
                                    options={[
                                        { value: 'all', label: 'All Departments' },
                                        ...departments.map((department) => ({
                                            value: department.id,
                                            label: department.name,
                                        })),
                                    ]}
                                    triggerClassName="h-11"
                                />
                            </div>

                            <div className="w-full sm:w-44">
                                <Select
                                    value={sortBy}
                                    onChange={(value) => setSortBy(value as SortOption)}
                                    options={[
                                        { value: 'recent', label: 'Recently updated' },
                                        { value: 'name_asc', label: 'Name A-Z' },
                                        { value: 'name_desc', label: 'Name Z-A' },
                                    ]}
                                    triggerClassName="h-11"
                                />
                            </div>

                            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-1">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`inline-flex h-9 w-9 items-center justify-center rounded ${
                                        viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700'
                                    }`}
                                    title="Grid view"
                                >
                                    <Grid3X3 className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={`inline-flex h-9 w-9 items-center justify-center rounded ${
                                        viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700'
                                    }`}
                                    title="List view"
                                >
                                    <List className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setQuickFilter('all')}
                            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                                quickFilter === 'all'
                                    ? 'border-primary-200 bg-primary-700 text-white'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700'
                            }`}
                        >
                            All ({quickFilterCounts.all})
                        </button>
                        <button
                            type="button"
                            onClick={() => setQuickFilter('top_level')}
                            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                                quickFilter === 'top_level'
                                    ? 'border-primary-200 bg-primary-700 text-white'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700'
                            }`}
                        >
                            Top-Level ({quickFilterCounts.top_level})
                        </button>
                        <button
                            type="button"
                            onClick={() => setQuickFilter('sub_categories')}
                            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                                quickFilter === 'sub_categories'
                                    ? 'border-primary-200 bg-primary-700 text-white'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700'
                            }`}
                        >
                            Sub-Categories ({quickFilterCounts.sub_categories})
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                        <span className="font-medium text-gray-700">
                            {visibleCategories.length} categories visible on this page
                        </span>
                        <span>
                            Scope: <span className="font-medium text-gray-900">{activeDepartmentLabel}</span> | Sort: <span className="font-medium text-gray-900">{sortBy.replace('_', ' ')}</span>
                        </span>
                    </div>
                </div>
            </section>

            {loading ? (
                <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    <CatalogSkeleton />
                </section>
            ) : visibleCategories.length === 0 ? (
                <section className="rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-14 text-center">
                    <Package className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-900">No categories found</h3>
                    <p className="mt-1 text-sm text-gray-500">Try changing filters or create a new category for this department.</p>
                    <div className="mt-5">
                        <Button onClick={() => handleOpenModal()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Category
                        </Button>
                    </div>
                </section>
            ) : viewMode === 'grid' ? (
                <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {visibleCategories.map((category) => {
                        const departmentName = departments.find((department) => department.id === category.departmentId)?.name || 'Unknown';
                        const isSubCategory = Boolean(category.parentId);

                        return (
                            <article
                                key={category.id}
                                className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${isSubCategory ? 'bg-amber-50 text-amber-600' : 'bg-primary-50 text-primary-600'}`}>
                                            {isSubCategory ? <FolderTree className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-gray-900">{category.name}</h3>
                                            <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                                                isSubCategory
                                                    ? 'border border-amber-200 bg-amber-50 text-amber-700'
                                                    : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                            }`}
                                            >
                                                {isSubCategory ? 'Sub-Category' : 'Top-Level'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenModal(category)}
                                            className="rounded-lg p-2 text-gray-400 hover:bg-primary-50 hover:text-primary-700"
                                            title="Edit category"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDeletingId(category.id)}
                                            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-700"
                                            title="Delete category"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <p className="mt-4 line-clamp-2 min-h-[2.75rem] text-sm text-gray-600">
                                    {category.description || 'No description provided for this category yet.'}
                                </p>

                                <div className="mt-5 space-y-3 border-t border-gray-100 pt-4 text-xs text-gray-500">
                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1">
                                            <Building2 className="h-3.5 w-3.5" />
                                            {departmentName}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <CalendarClock className="h-3.5 w-3.5" />
                                            Updated {formatDate(category.updatedAt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>ID: {category.id.slice(0, 8)}</span>
                                        {category.parentId && (
                                            <span className="inline-flex items-center gap-1 text-amber-700">
                                                <FolderTree className="h-3.5 w-3.5" />
                                                Linked
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </section>
            ) : (
                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Category</th>
                                    <th className="px-6 py-3 font-semibold">Department</th>
                                    <th className="px-6 py-3 font-semibold">Type</th>
                                    <th className="px-6 py-3 font-semibold">Updated</th>
                                    <th className="px-6 py-3 font-semibold">Parent</th>
                                    <th className="px-6 py-3 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {visibleCategories.map((category) => {
                                    const departmentName = departments.find((department) => department.id === category.departmentId)?.name || 'Unknown';
                                    const isSubCategory = Boolean(category.parentId);
                                    const parentName = category.parentId
                                        ? categories.find((item) => item.id === category.parentId)?.name || category.parentId.slice(0, 8)
                                        : '-';

                                    return (
                                        <tr key={category.id} className="transition hover:bg-primary-50/30">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-900">{category.name}</p>
                                                <p className="text-xs text-gray-500">{category.description || 'No description'}</p>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{departmentName}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                    isSubCategory
                                                        ? 'border border-amber-200 bg-amber-50 text-amber-700'
                                                        : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                                }`}
                                                >
                                                    {isSubCategory ? 'Sub-Category' : 'Top-Level'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{formatDate(category.updatedAt)}</td>
                                            <td className="px-6 py-4 text-gray-600">{parentName}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenModal(category)}
                                                        className="rounded-lg p-2 text-gray-400 hover:bg-primary-50 hover:text-primary-700"
                                                        title="Edit category"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeletingId(category.id)}
                                                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-700"
                                                        title="Delete category"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {!loading && meta.totalPages > 1 && (
                <Pagination
                    currentPage={page}
                    totalPages={meta.totalPages}
                    total={meta.total}
                    limit={PAGE_LIMIT}
                    onPageChange={setPage}
                />
            )}

            {showModal && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    onClick={handleCloseModal}
                >
                    <div
                        className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between border-b border-gray-100 bg-gradient-to-r from-white via-primary-50/40 to-white p-6">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                                    {editingId ? 'Update Category' : 'New Category'}
                                </p>
                                <h2 className="mt-1 text-xl font-bold text-gray-900">
                                    {editingId ? 'Edit Catalog Category' : 'Create Catalog Category'}
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Define category structure, ownership department, and parent hierarchy.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 p-6">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Category Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                    placeholder="e.g. SaaS Subscriptions"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                                    className="w-full resize-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                    placeholder="Describe what should be purchased under this category"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Department <span className="text-red-500">*</span>
                                    </label>
                                    <Select
                                        value={formData.departmentId}
                                        onChange={(value) => {
                                            setFormData((prev) => ({ ...prev, departmentId: value, parentId: '' }));
                                            void loadParentCandidates(value, editingId || undefined);
                                        }}
                                        options={departments.map((department) => ({
                                            value: department.id,
                                            label: department.name,
                                        }))}
                                        disabled={Boolean(editingId)}
                                        triggerClassName="h-11"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Parent Category</label>
                                    <Select
                                        value={formData.parentId}
                                        onChange={(value) => setFormData((prev) => ({ ...prev, parentId: value }))}
                                        options={parentOptions}
                                        disabled={!formData.departmentId || loadingParentCandidates}
                                        placeholder={loadingParentCandidates ? 'Loading categories...' : 'Select parent'}
                                        triggerClassName="h-11"
                                    />
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                                <span className="inline-flex items-center gap-1">
                                    <ArrowUpDown className="h-3.5 w-3.5" />
                                    Use top-level categories for broad spend areas and sub-categories for approval precision.
                                </span>
                            </div>

                            <div className="flex gap-3 border-t border-gray-100 pt-4">
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
                                    className="flex-1 bg-primary-700 hover:bg-primary-800"
                                    disabled={saving || !formData.name.trim() || !formData.departmentId}
                                >
                                    {saving ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            <ConfirmationModal
                isOpen={Boolean(deletingId)}
                onClose={() => {
                    if (deleting) return;
                    setDeletingId(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Category"
                message="Are you sure you want to delete this category? This action cannot be undone."
                confirmText={deleting ? 'Deleting...' : 'Delete'}
                cancelText="Cancel"
                variant="danger"
                isLoading={deleting}
            />
        </div>
    );
}

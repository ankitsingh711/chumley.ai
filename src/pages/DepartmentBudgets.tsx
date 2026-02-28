import { useEffect, useMemo, useRef, useState } from 'react';
import {
    TrendingUp,
    DollarSign,
    PieChart,
    Edit2,
    X,
    ChevronDown,
    AlertTriangle,
    Calendar,
    BarChart3,
    ShieldCheck,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { Button } from '../components/ui/Button';
import { DepartmentBudgetsSkeleton } from '../components/skeletons/DepartmentBudgetsSkeleton';
import { DatePicker } from '../components/ui/DatePicker';
import { departmentsApi, type Department } from '../services/departments.service';
import { cn } from '../lib/utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/api';
import { getCategoryBreakdown, getCategorySpendTotals, getLatestMonthRange } from '../data/financialDataHelpers';

interface DepartmentBudget extends Department {
    budget: number;
    spent: number;
    memberCount: number;
    utilization: number;
    remaining: number;
}

const BAR_COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#14b8a6', '#ec4899', '#84cc16', '#6366f1'];

const formatCurrency = (value: number) =>
    `£${Number(value || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

const formatRangeLabel = (range: { start?: string; end?: string }) => {
    if (!range.start && !range.end) return 'All Time';
    const startLabel = range.start ? new Date(range.start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Beginning';
    const endLabel = range.end ? new Date(range.end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today';
    return `${startLabel} - ${endLabel}`;
};

const getUtilizationStyles = (utilization: number) => {
    if (utilization > 100) {
        return {
            badge: 'border border-red-200 bg-red-50 text-red-700',
            bar: 'bg-red-500',
            text: 'text-red-700',
        };
    }

    if (utilization >= 85) {
        return {
            badge: 'border border-amber-200 bg-amber-50 text-amber-700',
            bar: 'bg-amber-500',
            text: 'text-amber-700',
        };
    }

    return {
        badge: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
        bar: 'bg-emerald-500',
        text: 'text-emerald-700',
    };
};

export default function DepartmentBudgets() {
    const { user: currentUser } = useAuth();

    const [baseDepartments, setBaseDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [activeDateRange, setActiveDateRange] = useState<{ start?: string; end?: string }>(getLatestMonthRange);

    const [expandedDept, setExpandedDept] = useState<{ id: string; rangeKey: string } | null>(null);
    const [breakdownData, setBreakdownData] = useState<Record<string, { category: string; amount: number }[]>>({});

    const [editingDept, setEditingDept] = useState<DepartmentBudget | null>(null);
    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    const datePickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                const departments = await departmentsApi.getAll();
                setBaseDepartments(departments);
            } catch (error) {
                console.error('Failed to load department budgets:', error);
            } finally {
                setLoading(false);
            }
        };

        void loadInitialData();
    }, []);

    useEffect(() => {
        if (!showDatePicker) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setShowDatePicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDatePicker]);

    useEffect(() => {
        if (!editingDept) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleCloseEditModal();
            }
        };

        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingDept, saving]);

    const dateRangeKey = `${activeDateRange.start || 'all'}|${activeDateRange.end || 'all'}`;

    const departments = useMemo<DepartmentBudget[]>(() => {
        const selectedRange = activeDateRange.start || activeDateRange.end ? activeDateRange : undefined;
        const spendMap = getCategorySpendTotals(selectedRange);

        const withBudget = baseDepartments.map((department) => {
            const budget = Number(department.budget) > 0 ? Number(department.budget) : 0;
            const spent = spendMap[department.name] || 0;

            const usersFallback = (department as Department & { users?: unknown[] }).users;
            const memberCount = typeof department.metrics?.userCount === 'number'
                ? department.metrics.userCount
                : Array.isArray(usersFallback) ? usersFallback.length : 0;

            const utilization = budget > 0 ? Math.round((spent / budget) * 100) : 0;
            const remaining = budget - spent;

            return {
                ...department,
                budget,
                spent,
                memberCount,
                utilization,
                remaining,
            };
        });

        return withBudget.sort((a, b) => b.spent - a.spent);
    }, [baseDepartments, activeDateRange]);

    const stats = useMemo(() => {
        const totalBudget = departments.reduce((sum, department) => sum + department.budget, 0);
        const totalSpent = departments.reduce((sum, department) => sum + department.spent, 0);
        const utilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
        const remaining = totalBudget - totalSpent;

        const overBudget = departments.filter((department) => department.utilization > 100).length;
        const nearLimit = departments.filter((department) => department.utilization >= 85 && department.utilization <= 100).length;

        return {
            totalBudget,
            totalSpent,
            utilization,
            remaining,
            overBudget,
            nearLimit,
        };
    }, [departments]);

    const chartData = useMemo(
        () => departments.map((department) => ({
            name: department.name,
            utilization: Math.min(department.utilization, 100),
            spent: department.spent,
            budget: department.budget,
        })),
        [departments],
    );

    const canEditBudget = (department: DepartmentBudget): boolean => {
        if (!currentUser) return false;

        if (currentUser.role === UserRole.SYSTEM_ADMIN) {
            return true;
        }

        if (currentUser.role === UserRole.SENIOR_MANAGER) {
            const userDepartmentId = typeof currentUser.department === 'string'
                ? currentUser.department
                : currentUser.department?.id;
            return userDepartmentId === department.id;
        }

        return false;
    };

    const applyDateRange = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);

        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        setDateRange({ start: '', end: '' });
        setActiveDateRange({ start: startStr, end: endStr });
        setShowDatePicker(false);
        setExpandedDept(null);
    };

    const applyCustomDateRange = () => {
        if (!dateRange.start || !dateRange.end) return;

        setActiveDateRange({ start: dateRange.start, end: dateRange.end });
        setShowDatePicker(false);
        setExpandedDept(null);
    };

    const clearDateRange = () => {
        setDateRange({ start: '', end: '' });
        setActiveDateRange({});
        setShowDatePicker(false);
        setExpandedDept(null);
    };

    const handleEditClick = (department: DepartmentBudget) => {
        setEditingDept(department);
        setEditValue(department.budget.toString());
        setValidationError(null);
        setSaveError(null);
    };

    const handleCloseEditModal = (force = false) => {
        if (saving && !force) return;
        setEditingDept(null);
        setEditValue('');
        setValidationError(null);
        setSaveError(null);
    };

    const handleSaveBudget = async () => {
        if (!editingDept) return;

        const normalizedValue = editValue.replace(/,/g, '').trim();
        const newBudget = Number(normalizedValue);

        if (!normalizedValue || Number.isNaN(newBudget) || !Number.isFinite(newBudget)) {
            setValidationError('Enter a valid annual budget amount.');
            return;
        }

        if (newBudget < 0) {
            setValidationError('Budget cannot be negative.');
            return;
        }

        if (newBudget > 999999999999.99) {
            setValidationError('Budget exceeds allowed limit.');
            return;
        }

        setValidationError(null);
        setSaveError(null);
        setSaving(true);

        try {
            await departmentsApi.update(editingDept.id, { budget: newBudget });

            setBaseDepartments((prev) => prev.map((department) => (
                department.id === editingDept.id
                    ? { ...department, budget: newBudget }
                    : department
            )));

            handleCloseEditModal(true);
        } catch (error: unknown) {
            console.error('Failed to update budget:', error);
            const apiError = (error as { response?: { data?: { error?: unknown } } })?.response?.data?.error;

            if (typeof apiError === 'string') {
                setSaveError(apiError);
            } else if (Array.isArray(apiError) && typeof apiError[0] === 'object' && apiError[0] !== null && 'message' in apiError[0]) {
                const message = (apiError[0] as { message?: unknown }).message;
                setSaveError(typeof message === 'string' ? message : 'Failed to save budget. Please try again.');
            } else {
                setSaveError('Failed to save budget. Please try again.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleExpand = (department: DepartmentBudget) => {
        if (expandedDept?.id === department.id && expandedDept.rangeKey === dateRangeKey) {
            setExpandedDept(null);
            return;
        }

        setExpandedDept({ id: department.id, rangeKey: dateRangeKey });

        const cacheKey = `${dateRangeKey}|${department.id}`;

        if (!breakdownData[cacheKey]) {
            const selectedRange = activeDateRange.start || activeDateRange.end ? activeDateRange : undefined;
            const data = getCategoryBreakdown(department.name, selectedRange);
            setBreakdownData((prev) => ({ ...prev, [cacheKey]: data }));
        }
    };

    const draftBudget = Number(editValue.replace(/,/g, '').trim());
    const previewBudget = Number.isFinite(draftBudget) ? draftBudget : 0;
    const spentAmount = editingDept?.spent ?? 0;
    const projectedRemaining = previewBudget - spentAmount;
    const projectedUtilization = previewBudget > 0 ? Math.round((spentAmount / previewBudget) * 100) : 0;

    if (loading) {
        return <DepartmentBudgetsSkeleton />;
    }

    return (
        <div className="space-y-6">
            <section className="relative rounded-2xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/60 to-accent-50/70 p-6 shadow-sm">
                <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary-200/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-accent-200/50 blur-3xl" />

                <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex items-start gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700">Finance Control</p>
                            <h1 className="mt-2 text-3xl font-bold text-gray-900">Departmental Budget Tracking</h1>
                            <p className="mt-2 max-w-2xl text-sm text-gray-600">
                                Manage allocation, monitor utilization, and prevent overspend across all departments.
                            </p>
                            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 px-3 py-1 text-xs font-medium text-primary-700">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatRangeLabel(activeDateRange)}
                            </div>
                        </div>
                    </div>

                    <div ref={datePickerRef} className="relative flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setShowDatePicker((prev) => !prev)} className="border-white/70 bg-white/90 backdrop-blur">
                            <Calendar className="mr-2 h-4 w-4" /> Date Range
                        </Button>

                        {showDatePicker && (
                            <div className="absolute right-0 top-full z-[120] mt-2 w-[22rem] rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-900">Filter by Date</h3>
                                    <button onClick={() => setShowDatePicker(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => applyDateRange(7)} className="rounded-lg border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:border-primary-200 hover:bg-primary-50">Last 7 days</button>
                                    <button onClick={() => applyDateRange(30)} className="rounded-lg border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:border-primary-200 hover:bg-primary-50">Last 30 days</button>
                                    <button onClick={() => applyDateRange(90)} className="rounded-lg border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:border-primary-200 hover:bg-primary-50">Last 90 days</button>
                                    <button onClick={() => applyDateRange(365)} className="rounded-lg border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:border-primary-200 hover:bg-primary-50">Year to date</button>
                                </div>

                                <div className="mt-4 border-t border-gray-100 pt-4">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Custom Range</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <DatePicker
                                            value={dateRange.start}
                                            onChange={(value) => setDateRange((prev) => ({ ...prev, start: value }))}
                                            placeholder="Start"
                                            className="w-full text-sm"
                                        />
                                        <DatePicker
                                            value={dateRange.end}
                                            onChange={(value) => setDateRange((prev) => ({ ...prev, end: value }))}
                                            placeholder="End"
                                            className="w-full text-sm"
                                        />
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        <Button size="sm" variant="outline" onClick={clearDateRange}>Clear</Button>
                                        <Button size="sm" onClick={applyCustomDateRange} disabled={!dateRange.start || !dateRange.end}>Apply</Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Total Budget
                            <DollarSign className="h-4 w-4 text-primary-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(stats.totalBudget)}</p>
                        <p className="mt-1 text-xs text-gray-500">Annual allocation</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Total Spent
                            <TrendingUp className="h-4 w-4 text-amber-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-amber-700">{formatCurrency(stats.totalSpent)}</p>
                        <p className="mt-1 text-xs text-gray-500">Across selected range</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Remaining Budget
                            <PieChart className="h-4 w-4 text-emerald-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-emerald-700">{formatCurrency(stats.remaining)}</p>
                        <p className="mt-1 text-xs text-gray-500">Available to spend</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Portfolio Utilization
                            <ShieldCheck className="h-4 w-4 text-primary-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{stats.utilization}%</p>
                        <p className="mt-1 text-xs text-gray-500">{stats.overBudget} over budget, {stats.nearLimit} near limit</p>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <section className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Department Breakdown</h3>
                            <p className="text-sm text-gray-500">Click a department to inspect category-level spend composition.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {departments.map((department) => {
                            const styles = getUtilizationStyles(department.utilization);
                            const isExpanded = expandedDept?.id === department.id && expandedDept.rangeKey === dateRangeKey;
                            const cacheKey = `${dateRangeKey}|${department.id}`;
                            const breakdown = breakdownData[cacheKey] || [];
                            const breakdownTotal = breakdown.reduce((sum, item) => sum + item.amount, 0);
                            const progress = Math.min(Math.max(department.utilization, 0), 100);

                            return (
                                <article key={department.id} className="rounded-xl border border-gray-200 bg-gray-50/40 p-4">
                                    <button
                                        type="button"
                                        onClick={() => handleExpand(department)}
                                        className="flex w-full items-start justify-between gap-3 text-left"
                                    >
                                        <div className="flex items-center gap-2">
                                            <ChevronDown className={cn('mt-0.5 h-4 w-4 text-gray-400 transition-transform', isExpanded && 'rotate-180')} />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-gray-900">{department.name}</p>
                                                    <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                                        {department.memberCount} members
                                                    </span>
                                                    {canEditBudget(department) && (
                                                        <button
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleEditClick(department);
                                                            }}
                                                            className="inline-flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 transition hover:border-primary-200 hover:text-primary-700"
                                                            title="Edit Budget"
                                                        >
                                                            <Edit2 className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Spent {formatCurrency(department.spent)} of {formatCurrency(department.budget)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles.badge}`}>
                                                {department.utilization}%
                                            </span>
                                            <p className={cn('mt-1 text-xs font-medium', styles.text)}>
                                                {department.remaining >= 0 ? `${formatCurrency(department.remaining)} available` : `${formatCurrency(Math.abs(department.remaining))} over`}
                                            </p>
                                        </div>
                                    </button>

                                    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                                        <div className={cn('h-full rounded-full transition-all duration-500', styles.bar)} style={{ width: `${progress}%` }} />
                                    </div>

                                    {isExpanded && (
                                        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
                                            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Category Breakdown</h4>

                                            {breakdown.length > 0 ? (
                                                <div className="mt-3 space-y-2">
                                                    {breakdown.map((item) => {
                                                        const width = breakdownTotal > 0 ? Math.round((item.amount / breakdownTotal) * 100) : 0;
                                                        return (
                                                            <div key={`${department.id}-${item.category}`}>
                                                                <div className="mb-1 flex items-center justify-between text-xs">
                                                                    <span className="text-gray-600">{item.category}</span>
                                                                    <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                                                                </div>
                                                                <div className="h-1.5 w-full rounded-full bg-gray-100">
                                                                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.max(width, 4)}%` }} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    <div className="mt-2 border-t border-gray-100 pt-2 text-xs font-semibold text-gray-700">
                                                        Total: {formatCurrency(breakdownTotal)}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="mt-2 text-xs italic text-gray-500">No category breakdown available for this range.</p>
                                            )}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Budget Utilization</h3>
                                <p className="text-sm text-gray-500">Department utilization percentage (capped at 100%).</p>
                            </div>
                            <BarChart3 className="h-5 w-5 text-primary-600" />
                        </div>

                        <div className="h-[320px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 10, top: 4, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#f3f4f6" />
                                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(value) => `${value}%`} axisLine={false} tickLine={false} />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={95} tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        formatter={(value: number | string | undefined, name: string | undefined, payload) => {
                                            const item = payload?.payload as { spent?: number; budget?: number } | undefined;
                                            if (name === 'utilization') {
                                                return [`${Number(value || 0).toFixed(0)}%`, 'Utilization'];
                                            }
                                            return [
                                                `${formatCurrency(Number(item?.spent || 0))} / ${formatCurrency(Number(item?.budget || 0))}`,
                                                name || 'Value',
                                            ];
                                        }}
                                        contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="utilization" radius={[0, 5, 5, 0]} barSize={16}>
                                        {chartData.map((_, index) => (
                                            <Cell key={`budget-cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Risk Summary</h3>
                        <div className="mt-4 space-y-2 text-sm">
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                                Over budget departments: <span className="font-semibold">{stats.overBudget}</span>
                            </div>
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                                Near limit departments: <span className="font-semibold">{stats.nearLimit}</span>
                            </div>
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                                Healthy departments: <span className="font-semibold">{Math.max(departments.length - stats.overBudget - stats.nearLimit, 0)}</span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {editingDept && createPortal(
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
                    onClick={() => handleCloseEditModal()}
                >
                    <div
                        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 px-6 py-5 text-white">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-blue-100/80">Department Budget</p>
                                    <h3 className="mt-1 text-2xl font-semibold leading-tight">Set Budget for {editingDept.name}</h3>
                                    <p className="mt-1 text-sm text-blue-100/90">Update the annual cap and instantly recalculate remaining budget.</p>
                                </div>
                                <button
                                    onClick={() => handleCloseEditModal()}
                                    disabled={saving}
                                    className="rounded-full p-2 text-blue-100 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-60"
                                    aria-label="Close budget modal"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-5 px-6 py-6">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Current Budget</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(editingDept.budget)}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Spent</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(spentAmount)}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Projected Remaining</p>
                                    <p className={cn('mt-1 text-lg font-semibold', projectedRemaining < 0 ? 'text-red-600' : 'text-emerald-600')}>
                                        {formatCurrency(projectedRemaining)}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="annual-budget-input" className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Annual Budget Limit (£)
                                </label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">£</span>
                                    <input
                                        id="annual-budget-input"
                                        type="text"
                                        inputMode="decimal"
                                        className={cn(
                                            'w-full rounded-xl border px-10 py-3 text-base font-medium text-slate-900 outline-none transition-all',
                                            'focus:ring-4 focus:ring-blue-500/10',
                                            validationError ? 'border-red-300 focus:border-red-400' : 'border-slate-300 focus:border-blue-500',
                                        )}
                                        value={editValue}
                                        onChange={(event) => {
                                            setEditValue(event.target.value);
                                            if (validationError) setValidationError(null);
                                            if (saveError) setSaveError(null);
                                        }}
                                        placeholder="250000"
                                        autoFocus
                                    />
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                    <span>Utilization Preview: {projectedUtilization}%</span>
                                    <span>Use plain numbers, e.g. `350000`</span>
                                </div>
                            </div>

                            {(validationError || saveError) && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                        <p>{validationError || saveError}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                            <Button
                                variant="outline"
                                onClick={() => handleCloseEditModal()}
                                disabled={saving}
                                className="h-10 px-5 font-semibold"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveBudget}
                                disabled={saving}
                                className="h-10 bg-blue-600 px-6 font-semibold shadow-sm shadow-blue-200 hover:bg-blue-700"
                            >
                                {saving ? 'Saving Budget...' : 'Save Budget'}
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}

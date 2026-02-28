import { useEffect, useState } from 'react';
import { ArrowLeft, TrendingUp, DollarSign, PieChart, Edit2, X, ChevronDown, AlertTriangle, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/dashboard/StatCard';
import { DepartmentBudgetsSkeleton } from '../components/skeletons/DepartmentBudgetsSkeleton';
import { DatePicker } from '../components/ui/DatePicker';
import { departmentsApi, type Department } from '../services/departments.service';
import { cn } from '../lib/utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/api';
import { getCategoryBreakdown, getCategorySpendTotals, getLatestMonthRange } from '../data/financialDataHelpers';

interface DepartmentBudget extends Department {
    spent: number;
    metrics: {
        pendingCount: number;
        userCount: number;
    };
}

const COLORS = [
    '#eab308', // yellow
    '#22c55e', // green
    '#ef4444', // red
    '#10b981', // emerald
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#a855f7', // purple
    '#ec4899', // pink
    '#f97316', // orange
    '#5080CE', // teal
];

export default function DepartmentBudgets() {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [baseDepartments, setBaseDepartments] = useState<Department[]>([]);
    const [departments, setDepartments] = useState<DepartmentBudget[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [activeDateRange, setActiveDateRange] = useState<{ start?: string; end?: string }>(getLatestMonthRange);
    const [totalStats, setTotalStats] = useState({
        totalBudget: 0,
        totalSpent: 0,
        utilization: 0
    });
    const [expandedDept, setExpandedDept] = useState<string | null>(null);
    const [breakdownData, setBreakdownData] = useState<Record<string, { category: string; amount: number }[]>>({});

    // Editing State
    const [editingDept, setEditingDept] = useState<DepartmentBudget | null>(null);
    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Check if current user can edit a department's budget
    const canEditBudget = (dept: DepartmentBudget): boolean => {
        if (!currentUser) return false;

        // System Admin can edit all budgets
        if (currentUser.role === UserRole.SYSTEM_ADMIN) {
            return true;
        }

        // Senior Manager can edit their own department's budget
        if (currentUser.role === UserRole.SENIOR_MANAGER) {
            const userDeptId = typeof currentUser.department === 'string'
                ? currentUser.department
                : currentUser.department?.id;
            return userDeptId === dept.id;
        }

        // Other roles cannot edit budgets
        return false;
    };

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                const depts = await departmentsApi.getAll();
                setBaseDepartments(depts);
            } catch (error) {
                console.error('Failed to load department budgets:', error);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        if (!baseDepartments.length) return;

        const selectedRange = activeDateRange.start || activeDateRange.end ? activeDateRange : undefined;

        // Get spending data for current timeframe
        const departmentSpendMap = getCategorySpendTotals(selectedRange);

        const processedDepts = baseDepartments.map((dept) => {
            // Use actual budget from DB or default to 0
            const budget = dept.budget && Number(dept.budget) > 0 ? Number(dept.budget) : 0;

            // Use real spending data based on timeframe
            const spent = departmentSpendMap[dept.name] || 0;

            return {
                ...dept,
                budget, // Store as number for calculation
                spent,
                metrics: {
                    pendingCount: 0,
                    userCount: (dept as any).metrics?.userCount || (dept as any).users?.length || 0
                }
            };
        });

        // Sort by spent descending
        processedDepts.sort((a, b) => b.spent - a.spent);

        setDepartments(processedDepts);

        const totalLimit = processedDepts.reduce((sum, d) => sum + (d.budget || 0), 0);
        const totalSpent = processedDepts.reduce((sum, d) => sum + d.spent, 0);

        setTotalStats({
            totalBudget: totalLimit,
            totalSpent,
            utilization: totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0
        });
    }, [baseDepartments, activeDateRange]);

    useEffect(() => {
        setExpandedDept(null);
        setBreakdownData({});
    }, [activeDateRange?.start, activeDateRange?.end]);

    const applyDateRange = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        setDateRange({ start: '', end: '' });
        setActiveDateRange({ start: startStr, end: endStr });
        setShowDatePicker(false);
    };

    const applyCustomDateRange = () => {
        if (!dateRange.start || !dateRange.end) return;
        setActiveDateRange({ start: dateRange.start, end: dateRange.end });
        setShowDatePicker(false);
    };

    const clearDateRange = () => {
        setDateRange({ start: '', end: '' });
        setActiveDateRange({});
        setShowDatePicker(false);
    };

    const handleEditClick = (dept: DepartmentBudget) => {
        setEditingDept(dept);
        setEditValue(dept.budget?.toString() || '0');
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

            // Update baseDepartments so the effect re-runs
            setBaseDepartments(prev => prev.map(d =>
                d.id === editingDept.id ? { ...d, budget: newBudget } : d
            ));

            handleCloseEditModal(true);
        } catch (error: any) {
            console.error('Failed to update budget:', error);
            const apiError = error?.response?.data?.error;
            if (typeof apiError === 'string') {
                setSaveError(apiError);
            } else if (Array.isArray(apiError) && typeof apiError[0]?.message === 'string') {
                setSaveError(apiError[0].message);
            } else {
                setSaveError('Failed to save budget. Please try again.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleExpand = (dept: DepartmentBudget) => {
        if (expandedDept === dept.id) {
            setExpandedDept(null);
            return;
        }

        setExpandedDept(dept.id);
        if (!breakdownData[dept.id]) {
            const selectedRange = activeDateRange.start || activeDateRange.end ? activeDateRange : undefined;
            const data = getCategoryBreakdown(dept.name, selectedRange);
            setBreakdownData(prev => ({ ...prev, [dept.id]: data }));
        }
    };

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
    }, [editingDept, saving]);

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Departmental Budget Tracking</h1>
                        <p className="text-sm text-gray-500">Overview of budget allocation and consumption across all departments</p>
                        {(activeDateRange.start || activeDateRange.end) && (
                            <p className="text-sm text-gray-500 mt-1">
                                Filtered: {activeDateRange.start ? new Date(activeDateRange.start).toLocaleDateString() : 'Beginning'} - {activeDateRange.end ? new Date(activeDateRange.end).toLocaleDateString() : 'Today'}
                                <button onClick={clearDateRange} className="ml-2 text-primary-600 hover:text-primary-700 font-medium">Clear</button>
                            </p>
                        )}
                    </div>
                </div>

                <div className="relative">
                    <Button variant="outline" onClick={() => setShowDatePicker(!showDatePicker)}>
                        <Calendar className="mr-2 h-4 w-4" /> Date Range
                    </Button>

                    {showDatePicker && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-30">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900">Select Date Range</h3>
                                <button onClick={() => setShowDatePicker(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="space-y-2 mb-4">
                                <button onClick={() => applyDateRange(7)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">Last 7 days</button>
                                <button onClick={() => applyDateRange(30)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">Last 30 days</button>
                                <button onClick={() => applyDateRange(90)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">Last 90 days</button>
                                <button onClick={() => applyDateRange(365)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">This Year</button>
                            </div>

                            <div className="border-t pt-4">
                                <p className="text-xs text-gray-500 mb-2">Custom Range</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <DatePicker
                                        value={dateRange.start}
                                        onChange={(val) => setDateRange({ ...dateRange, start: val })}
                                        placeholder="Start Date"
                                        className="text-sm w-full"
                                    />
                                    <DatePicker
                                        value={dateRange.end}
                                        onChange={(val) => setDateRange({ ...dateRange, end: val })}
                                        placeholder="End Date"
                                        className="text-sm w-full"
                                    />
                                </div>
                                <Button
                                    onClick={applyCustomDateRange}
                                    size="sm"
                                    className="w-full mt-2"
                                    disabled={!dateRange.start || !dateRange.end}
                                >
                                    Apply Custom Range
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* High Level Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Budget Allocated"
                    value={`£${totalStats.totalBudget.toLocaleString()}`}
                    color="blue"
                    icon={DollarSign}
                    trend={{ value: 'Annual Cap', isPositive: true, label: 'fixed' }}
                />
                <StatCard
                    title="Total Spent YTD"
                    value={`£${totalStats.totalSpent.toLocaleString()}`}
                    color="orange"
                    icon={TrendingUp}
                    trend={{ value: `${totalStats.utilization}%`, isPositive: true, label: 'utilized' }}
                />
                <StatCard
                    title="Remaining Budget"
                    value={`£${(totalStats.totalBudget - totalStats.totalSpent).toLocaleString()}`}
                    color="primary"
                    icon={PieChart}
                    trend={{ value: `${100 - totalStats.utilization}%`, isPositive: true, label: 'available' }}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Department List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-6">Department Breakdown</h3>
                        <div className="space-y-8">
                            {departments.map((dept, index) => {
                                const currentBudget = dept.budget || 0;
                                const percentage = currentBudget > 0 ? Math.round((dept.spent / currentBudget) * 100) : 0;
                                const remaining = currentBudget - dept.spent;
                                const color = COLORS[index % COLORS.length];
                                const isExpanded = expandedDept === dept.id;
                                const breakdown = breakdownData[dept.id] || [];

                                return (
                                    <div key={dept.id} className="relative group">
                                        <div className="mb-2 flex items-end justify-between cursor-pointer" onClick={() => handleExpand(dept)}>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", isExpanded && "rotate-180")} />
                                                    <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                                                    <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 font-medium">
                                                        {dept.metrics.userCount} Members
                                                    </span>
                                                    {canEditBudget(dept) && (
                                                        <button
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleEditClick(dept);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 transition-opacity"
                                                            title="Edit Budget"
                                                        >
                                                            <Edit2 className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center justify-end gap-2 mb-1">
                                                    <span className="text-xs font-medium text-gray-500">
                                                        £{dept.spent.toLocaleString()} / £{currentBudget.toLocaleString()}
                                                    </span>
                                                    <span className={cn("text-lg font-bold", percentage > 90 ? "text-red-600" : "text-gray-900")}>
                                                        {percentage}%
                                                    </span>
                                                </div>
                                                <p className="text-xs text-primary-600 font-medium">
                                                    £{remaining.toLocaleString()} Available
                                                </p>
                                            </div>
                                        </div>

                                        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                                            <div
                                                className="h-full rounded-full transition-all duration-500 ease-out"
                                                style={{
                                                    width: `${Math.min(percentage, 100)}%`,
                                                    backgroundColor: color
                                                }}
                                            />
                                        </div>

                                        {isExpanded && (
                                            <div className="mt-4 rounded-lg bg-gray-50 px-4 py-4 text-sm animate-in slide-in-from-top-2 duration-200">
                                                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Category Breakdown</h4>

                                                {breakdown.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {breakdown.map((item, idx) => (
                                                            <div key={idx} className="flex items-center justify-between text-xs">
                                                                <span className="text-gray-600">{item.category}</span>
                                                                <span className="font-medium text-gray-900">£{item.amount.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                        <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 text-xs font-semibold">
                                                            <span>Total</span>
                                                            <span>£{breakdown.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs italic text-gray-400">No detailed spend data available.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Utilization Chart */}
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-6">Budget Utilization</h3>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={departments} layout="vertical" margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    width={100}
                                    tick={{ fontSize: 11, fill: '#6b7280' }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="spent" name="Spent" radius={[0, 4, 4, 0]} barSize={20}>
                                    {departments.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Edit Budget Modal */}
            {editingDept && createPortal(
                <div
                    className="fixed inset-0 z-[120] bg-slate-950/50 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in duration-200"
                    onClick={() => handleCloseEditModal()}
                >
                    <div
                        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
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
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Current Budget</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">£{(editingDept.budget || 0).toLocaleString()}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Spent</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">£{spentAmount.toLocaleString()}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Projected Remaining</p>
                                    <p className={cn(
                                        "mt-1 text-lg font-semibold",
                                        projectedRemaining < 0 ? "text-red-600" : "text-emerald-600"
                                    )}>
                                        £{projectedRemaining.toLocaleString()}
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
                                            "w-full rounded-xl border px-10 py-3 text-base font-medium text-slate-900 outline-none transition-all",
                                            "focus:ring-4 focus:ring-blue-500/10",
                                            validationError ? "border-red-300 focus:border-red-400" : "border-slate-300 focus:border-blue-500"
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
                                className="h-10 px-6 bg-blue-600 hover:bg-blue-700 font-semibold shadow-sm shadow-blue-200"
                            >
                                {saving ? 'Saving Budget...' : 'Save Budget'}
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

import { useEffect, useState, Fragment } from 'react';
import { ArrowLeft, TrendingUp, DollarSign, PieChart, Edit2, X, ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/dashboard/StatCard';
import { DepartmentBudgetsSkeleton } from '../components/skeletons/DepartmentBudgetsSkeleton';
import { departmentsApi, type Department } from '../services/departments.service';
import { cn } from '../lib/utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/api';
import { getCategorySpendTotals } from '../data/financialDataHelpers';

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
    const [budgetTimeframe, setBudgetTimeframe] = useState<number | string | undefined>(2025);
    const [totalStats, setTotalStats] = useState({
        totalBudget: 0,
        totalSpent: 0,
        utilization: 0
    });

    // Editing State
    const [editingDept, setEditingDept] = useState<DepartmentBudget | null>(null);
    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState(false);

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

        // Get spending data for current timeframe
        const departmentSpendMap = getCategorySpendTotals(budgetTimeframe);

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
    }, [baseDepartments, budgetTimeframe]);

    const handleEditClick = (dept: DepartmentBudget) => {
        setEditingDept(dept);
        setEditValue(dept.budget?.toString() || '0');
    };

    const handleSaveBudget = async () => {
        if (!editingDept) return;

        setSaving(true);
        try {
            const newBudget = parseFloat(editValue);
            if (isNaN(newBudget) || newBudget < 0) return; // Simple validation

            await departmentsApi.update(editingDept.id, { budget: newBudget });

            // Update baseDepartments so the effect re-runs
            setBaseDepartments(prev => prev.map(d =>
                d.id === editingDept.id ? { ...d, budget: newBudget } : d
            ));

            setEditingDept(null);
        } catch (error) {
            console.error('Failed to update budget:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <DepartmentBudgetsSkeleton />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" className="p-2" onClick={() => navigate('/')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Departmental Budget Tracking</h1>
                        <p className="text-sm text-gray-500">Overview of budget allocation and consumption across all departments</p>
                    </div>
                </div>

                <Menu as="div" className="relative inline-block text-left">
                    <Menu.Button
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-white rounded-xl hover:bg-slate-50 focus:outline-none transition-all duration-200 border border-slate-200 shadow-sm ui-open:border-blue-500 ui-open:ring-4 ui-open:ring-blue-500/10"
                    >
                        <span className="font-semibold text-slate-700">
                            {budgetTimeframe === 2025 ? '2025' :
                                budgetTimeframe === 2024 ? '2024' :
                                    typeof budgetTimeframe === 'string' ? budgetTimeframe.replace('-', ' ') :
                                        'All Time'}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 ui-open:rotate-180 ui-open:text-blue-500" />
                    </Menu.Button>

                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                    >
                        <Menu.Items className="absolute right-0 mt-2 w-52 z-20 origin-top-right bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden focus:outline-none max-h-[350px] overflow-y-auto ring-1 ring-black/5">
                            <div className="flex flex-col py-1.5">
                                {/* Yearly Section */}
                                <div className="px-4 pt-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Yearly</div>
                                <div className="px-1.5 space-y-0.5">
                                    {[
                                        { label: '2025', value: 2025 },
                                        { label: '2024', value: 2024 }
                                    ].map((option) => (
                                        <Menu.Item key={option.label}>
                                            {({ active }: { active: boolean }) => (
                                                <button
                                                    onClick={() => setBudgetTimeframe(option.value)}
                                                    className={cn(
                                                        "w-full text-left px-2.5 py-2 text-sm flex items-center rounded-lg transition-all duration-200 group",
                                                        budgetTimeframe === option.value
                                                            ? "bg-blue-50 text-blue-700 font-semibold"
                                                            : active
                                                                ? "bg-slate-50 text-slate-900 font-medium"
                                                                : "text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900"
                                                    )}
                                                >
                                                    <span className="w-7 flex-shrink-0 flex items-center justify-start">
                                                        {budgetTimeframe === option.value && (
                                                            <Check className="h-4 w-4 text-blue-600" strokeWidth={2.5} />
                                                        )}
                                                    </span>
                                                    <span>{option.label}</span>
                                                </button>
                                            )}
                                        </Menu.Item>
                                    ))}
                                </div>

                                <div className="h-px bg-slate-100 w-full my-2" />

                                {/* Monthly Section */}
                                <div className="px-4 pt-1 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly (2025)</div>
                                <div className="px-1.5 space-y-0.5">
                                    {['Dec-25', 'Nov-25', 'Oct-25', 'Sep-25', 'Aug-25', 'Jul-25', 'Jun-25', 'May-25', 'Apr-25', 'Mar-25', 'Feb-25', 'Jan-25'].map((month) => (
                                        <Menu.Item key={month}>
                                            {({ active }: { active: boolean }) => (
                                                <button
                                                    onClick={() => setBudgetTimeframe(month)}
                                                    className={cn(
                                                        "w-full text-left px-2.5 py-2 text-sm flex items-center rounded-lg transition-all duration-200 group",
                                                        budgetTimeframe === month
                                                            ? "bg-blue-50 text-blue-700 font-semibold"
                                                            : active
                                                                ? "bg-slate-50 text-slate-900 font-medium"
                                                                : "text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900"
                                                    )}
                                                >
                                                    <span className="w-7 flex-shrink-0 flex items-center justify-start">
                                                        {budgetTimeframe === month && (
                                                            <Check className="h-4 w-4 text-blue-600" strokeWidth={2.5} />
                                                        )}
                                                    </span>
                                                    <span>{month.replace('-', ' ')}</span>
                                                </button>
                                            )}
                                        </Menu.Item>
                                    ))}
                                </div>

                                <div className="h-px bg-slate-100 w-full my-2" />

                                {/* All Time Section */}
                                <div className="px-1.5 pb-1">
                                    <Menu.Item>
                                        {({ active }: { active: boolean }) => (
                                            <button
                                                onClick={() => setBudgetTimeframe(undefined)}
                                                className={cn(
                                                    "w-full text-left px-2.5 py-2.5 text-sm flex items-center rounded-lg transition-all duration-200 group",
                                                    budgetTimeframe === undefined
                                                        ? "bg-blue-50 text-blue-700 font-semibold"
                                                        : active
                                                            ? "bg-slate-50 text-slate-900 font-medium"
                                                            : "text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900"
                                                )}
                                            >
                                                <span className="w-7 flex-shrink-0 flex items-center justify-start">
                                                    {budgetTimeframe === undefined && (
                                                        <Check className="h-4 w-4 text-blue-600" strokeWidth={2.5} />
                                                    )}
                                                </span>
                                                <span>All Time</span>
                                            </button>
                                        )}
                                    </Menu.Item>
                                </div>
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
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

                                return (
                                    <div key={dept.id} className="relative group">
                                        <div className="mb-2 flex items-end justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                                                    <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 font-medium">
                                                        {dept.metrics.userCount} Members
                                                    </span>
                                                    {canEditBudget(dept) && (
                                                        <button
                                                            onClick={() => handleEditClick(dept)}
                                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 transition-opacity"
                                                            title="Edit Budget"
                                                        >
                                                            <Edit2 className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">{dept.description || 'General Operations'}</p>
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
            {editingDept && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setEditingDept(null)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Set Budget: {editingDept.name}</h3>
                            <button onClick={() => setEditingDept(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Annual Budget Limit (£)</label>
                                <input
                                    type="number"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    min="0"
                                    step="1000"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <Button variant="ghost" onClick={() => setEditingDept(null)}>Cancel</Button>
                                <Button onClick={handleSaveBudget} disabled={saving} className="bg-primary-700 hover:bg-primary-600">
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

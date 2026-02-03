import { useEffect, useState } from 'react';
import { ArrowLeft, TrendingUp, DollarSign, PieChart, Edit2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/dashboard/StatCard';
import { departmentsApi, type Department } from '../services/departments.service';
import { reportsApi } from '../services/reports.service';
import { cn } from '../lib/utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

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
    const [departments, setDepartments] = useState<DepartmentBudget[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalStats, setTotalStats] = useState({
        totalBudget: 0,
        totalSpent: 0,
        utilization: 0
    });

    // Editing State
    const [editingDept, setEditingDept] = useState<DepartmentBudget | null>(null);
    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [depts] = await Promise.all([
                departmentsApi.getAll(),
                reportsApi.getMonthlySpend()
            ]);

            const processedDepts = depts.map((dept) => {
                // Use actual budget from DB or default to 0
                const budget = dept.budget && Number(dept.budget) > 0 ? Number(dept.budget) : 0;

                // Use real spending data from backend if available, otherwise 0
                const spent = (dept as any).metrics?.totalSpent || 0;

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

            setDepartments(processedDepts);

            const totalLimit = processedDepts.reduce((sum, d) => sum + (d.budget || 0), 0);
            const totalSpent = processedDepts.reduce((sum, d) => sum + d.spent, 0);

            setTotalStats({
                totalBudget: totalLimit,
                totalSpent,
                utilization: totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0
            });

        } catch (error) {
            console.error('Failed to load department budgets:', error);
        } finally {
            setLoading(false);
        }
    };

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

            // Update local state
            const updatedDepts = departments.map(d =>
                d.id === editingDept.id ? { ...d, budget: newBudget } : d
            );
            setDepartments(updatedDepts);

            // Recalculate totals
            const totalLimit = updatedDepts.reduce((sum, d) => sum + (d.budget || 0), 0);
            const totalSpent = updatedDepts.reduce((sum, d) => sum + d.spent, 0);
            setTotalStats({
                totalBudget: totalLimit,
                totalSpent,
                utilization: totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0
            });

            setEditingDept(null);
        } catch (error) {
            console.error('Failed to update budget:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" className="p-2" onClick={() => navigate('/')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Departmental Budget Tracking</h1>
                    <p className="text-sm text-gray-500">Overview of budget allocation and consumption across all departments</p>
                </div>
            </div>

            {/* High Level Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Budget Allocated"
                    value={`$${totalStats.totalBudget.toLocaleString()}`}
                    color="blue"
                    icon={DollarSign}
                    trend={{ value: 'Annual Cap', isPositive: true, label: 'fixed' }}
                />
                <StatCard
                    title="Total Spent YTD"
                    value={`$${totalStats.totalSpent.toLocaleString()}`}
                    color="orange"
                    icon={TrendingUp}
                    trend={{ value: `${totalStats.utilization}%`, isPositive: true, label: 'utilized' }}
                />
                <StatCard
                    title="Remaining Budget"
                    value={`$${(totalStats.totalBudget - totalStats.totalSpent).toLocaleString()}`}
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
                                                    <button
                                                        onClick={() => handleEditClick(dept)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 transition-opacity"
                                                        title="Edit Budget"
                                                    >
                                                        <Edit2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">{dept.description || 'General Operations'}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center justify-end gap-2 mb-1">
                                                    <span className="text-xs font-medium text-gray-500">
                                                        ${dept.spent.toLocaleString()} / ${currentBudget.toLocaleString()}
                                                    </span>
                                                    <span className={cn("text-lg font-bold", percentage > 90 ? "text-red-600" : "text-gray-900")}>
                                                        {percentage}%
                                                    </span>
                                                </div>
                                                <p className="text-xs text-primary-600 font-medium">
                                                    ${remaining.toLocaleString()} Available
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Annual Budget Limit ($)</label>
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

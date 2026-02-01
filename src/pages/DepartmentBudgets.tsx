import { useEffect, useState } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/dashboard/StatCard';
import { departmentsApi, type Department } from '../services/departments.service';
import { reportsApi } from '../services/reports.service';
import { cn } from '../lib/utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface DepartmentBudget extends Department {
    spent: number;
    limit: number;
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
    '#14b8a6', // teal
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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [depts] = await Promise.all([
                departmentsApi.getAll(),
                reportsApi.getMonthlySpend() // We might need a better endpoint for current totals, but this serves for trend
            ]);

            // Mocking spending data for now as we don't have a direct "spend by department" endpoint in the provided context
            // In a real scenario, we'd fetch this from the backend.
            // Using the logic from BudgetTracker where mock data might be passed or calculated.

            // For now, let's auto-generate some realistic looking data based on the seeded depts
            // or try to use what we have.

            // We'll mock the specific spend aggregation here since `reportsApi.getKPIs` gives totals but not per-dept breakdown list
            // without fetching all requests.

            const processedDepts = depts.map((dept) => {
                // Default budget limit since it's not in the DB yet
                const limit = 50000;

                // Use real spending data from backend if available, otherwise 0
                const spent = (dept as any).metrics?.totalSpent || 0;

                return {
                    ...dept,
                    spent,
                    limit,
                    metrics: {
                        pendingCount: 0,
                        userCount: (dept as any).metrics?.userCount || (dept as any).users?.length || 0
                    }
                };
            });

            setDepartments(processedDepts);

            const totalLimit = processedDepts.reduce((sum, d) => sum + d.limit, 0);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
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
                    color="teal"
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
                                const percentage = Math.round((dept.spent / dept.limit) * 100);
                                const remaining = dept.limit - dept.spent;
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
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">{dept.description || 'General Operations'}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center justify-end gap-2 mb-1">
                                                    <span className="text-xs font-medium text-gray-500">
                                                        ${dept.spent.toLocaleString()} / ${dept.limit.toLocaleString()}
                                                    </span>
                                                    <span className={cn("text-lg font-bold", percentage > 90 ? "text-red-600" : "text-gray-900")}>
                                                        {percentage}%
                                                    </span>
                                                </div>
                                                <p className="text-xs text-teal-600 font-medium">
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
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Budget Insights</h4>
                        <ul className="text-xs text-gray-500 space-y-2">
                            <li className="flex items-start gap-2">
                                <TrendingDown className="h-3 w-3 text-green-500 mt-0.5" />
                                <span>Overall spending is on track at {totalStats.utilization}% utilization.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <TrendingUp className="h-3 w-3 text-orange-500 mt-0.5" />
                                <span>Technology department has the highest request volume.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

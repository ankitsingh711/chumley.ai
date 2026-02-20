import { memo, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import type { Department } from '../../services/departments.service';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/api';
import { ChevronDown, Check } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
// TODO: Uncomment to use API data instead of hardcoded data
// import { reportsApi } from '../../services/reports.service';
import { getCategoryBreakdown } from '../../data/financialDataHelpers';

interface BudgetTrackerProps {
    departmentSpend?: Record<string, number>;
    departments?: Department[];
    timeframe?: number | string | undefined;
    onTimeframeChange?: (timeframe: number | string | undefined) => void;
}

const COLORS = [
    'bg-yellow-500',
    'bg-green-500',
    'bg-red-500',
    'bg-emerald-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-primary-500',
];


export const BudgetTracker = memo(function BudgetTracker({
    departmentSpend = {},
    departments = [],
    timeframe,
    onTimeframeChange
}: BudgetTrackerProps) {
    const navigate = useNavigate();
    const { user } = useAuth();
    // Default limit for illustration since we don't have it in DB yet
    const DEFAULT_LIMIT = 50000;

    // State for expanded department
    const [expandedDept, setExpandedDept] = useState<string | null>(null);
    const [breakdownData, setBreakdownData] = useState<Record<string, { category: string; amount: number }[]>>({});

    // Create a map of department spend for easy lookup
    const spendMap = departmentSpend;

    // Memoize sortedDepartments to avoid recalculation on every render
    const sortedDepartments = useMemo(() => {
        // Combine seeded departments with any extra spend categories (fallback)
        // We prioritize the seeded departments list to show correct names and descriptions
        const trackedDepartments = departments.map((dept, index) => {
            // Use embedded metrics from backend if available (new standard), otherwise fallback to props map
            const spendFromMetrics = (dept as any).metrics?.totalSpent;
            const spendFromMap = spendMap[dept.name] || 0;

            return {
                id: dept.id,
                name: dept.name,
                category: dept.description || 'General Budget', // Use description as the subtitle
                limit: DEFAULT_LIMIT, // Placeholder until limits are in DB
                color: COLORS[index % COLORS.length],
                spent: spendFromMetrics !== undefined ? spendFromMetrics : spendFromMap
            };
        });

        // If there is spend for a category NOT in the departments list (e.g. old data or unassigned), add it
        Object.entries(spendMap).forEach(([name, amount]) => {
            if (!trackedDepartments.find(d => d.name === name)) {
                trackedDepartments.push({
                    id: `unassigned-${name}`,
                    name,
                    category: 'Unassigned / Other',
                    limit: DEFAULT_LIMIT,
                    color: 'bg-gray-400',
                    spent: amount
                });
            }
        });

        return trackedDepartments.sort((a, b) => b.spent - a.spent);
    }, [departments, spendMap]);

    // TODO: Uncomment below to use API breakdown data instead of hardcoded data
    // const handleExpand = async (deptId: string) => {
    //     if (expandedDept === deptId) { setExpandedDept(null); return; }
    //     setExpandedDept(deptId);
    //     if (!breakdownData[deptId] && !deptId.startsWith('unassigned-')) {
    //         try {
    //             const data = await reportsApi.getDepartmentSpendBreakdown(deptId);
    //             setBreakdownData(prev => ({ ...prev, [deptId]: data }));
    //         } catch (error) {
    //             console.error(`Failed to fetch breakdown for department ${deptId}`, error);
    //         }
    //     }
    // };

    // Using hardcoded breakdown data
    const handleExpand = (deptId: string) => {
        if (expandedDept === deptId) {
            setExpandedDept(null);
            return;
        }

        setExpandedDept(deptId);

        if (!breakdownData[deptId]) {
            const dept = sortedDepartments.find(d => d.id === deptId);
            const deptName = dept?.name || deptId.replace('unassigned-', '');
            // Pass the timeframe from props to filter the breakdown correctly
            const data = getCategoryBreakdown(deptName, timeframe);
            setBreakdownData(prev => ({ ...prev, [deptId]: data }));
        }
    };

    // When timeframe changes, we should clear cached breakdown data
    // so it refetches cleanly when re-expanding
    useMemo(() => {
        setBreakdownData({});
        setExpandedDept(null);
    }, [timeframe]);

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="font-semibold text-gray-900">Departmental Budget Tracking</h3>
                <div className="flex items-center gap-2">
                    {onTimeframeChange && (
                        <Menu as="div" className="relative inline-block text-left">
                            <Menu.Button
                                className="flex items-center gap-2 px-4 py-2 text-sm bg-white rounded-xl hover:bg-slate-50 focus:outline-none transition-all duration-200 border border-slate-200 shadow-sm ui-open:border-blue-500 ui-open:ring-4 ui-open:ring-blue-500/10"
                            >
                                <span className="font-semibold text-slate-700">
                                    {timeframe === 2025 ? '2025' :
                                        timeframe === 2024 ? '2024' :
                                            typeof timeframe === 'string' ? timeframe.replace('-', ' ') :
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
                                                            onClick={() => onTimeframeChange(option.value)}
                                                            className={cn(
                                                                "w-full text-left px-2.5 py-2 text-sm flex items-center rounded-lg transition-all duration-200 group",
                                                                timeframe === option.value
                                                                    ? "bg-blue-50 text-blue-700 font-semibold"
                                                                    : active
                                                                        ? "bg-slate-50 text-slate-900 font-medium"
                                                                        : "text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900"
                                                            )}
                                                        >
                                                            <span className="w-7 flex-shrink-0 flex items-center justify-start">
                                                                {timeframe === option.value && (
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
                                                            onClick={() => onTimeframeChange(month)}
                                                            className={cn(
                                                                "w-full text-left px-2.5 py-2 text-sm flex items-center rounded-lg transition-all duration-200 group",
                                                                timeframe === month
                                                                    ? "bg-blue-50 text-blue-700 font-semibold"
                                                                    : active
                                                                        ? "bg-slate-50 text-slate-900 font-medium"
                                                                        : "text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900"
                                                            )}
                                                        >
                                                            <span className="w-7 flex-shrink-0 flex items-center justify-start">
                                                                {timeframe === month && (
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
                                                        onClick={() => onTimeframeChange(undefined)}
                                                        className={cn(
                                                            "w-full text-left px-2.5 py-2.5 text-sm flex items-center rounded-lg transition-all duration-200 group",
                                                            timeframe === undefined
                                                                ? "bg-blue-50 text-blue-700 font-semibold"
                                                                : active
                                                                    ? "bg-slate-50 text-slate-900 font-medium"
                                                                    : "text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900"
                                                        )}
                                                    >
                                                        <span className="w-7 flex-shrink-0 flex items-center justify-start">
                                                            {timeframe === undefined && (
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
                    )}
                    {user?.role === UserRole.SYSTEM_ADMIN && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-primary-600 hover:text-primary-700 whitespace-nowrap"
                            onClick={() => navigate('/budgets')}
                        >
                            View All
                        </Button>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                {sortedDepartments.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No department data available.</p>
                ) : (
                    sortedDepartments.map((dept) => {
                        const percentage = Math.round((dept.spent / dept.limit) * 100);
                        const remaining = dept.limit - dept.spent;
                        const isExpanded = expandedDept === dept.id;
                        const breakdown = breakdownData[dept.id] || [];

                        return (
                            <div key={dept.id} className="group">
                                <div
                                    className="mb-2 flex items-end justify-between cursor-pointer"
                                    onClick={() => handleExpand(dept.id)}
                                >
                                    <div className="flex items-center gap-2">
                                        <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", isExpanded && "rotate-180")} />
                                        <div>
                                            <p className="font-medium text-gray-900">{dept.name}</p>
                                            <p className="text-xs text-gray-500">{dept.category}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn("text-sm font-bold", percentage > 90 ? "text-red-600" : "text-gray-900")}>
                                            {percentage}%
                                        </p>
                                        <p className="text-xs text-gray-400">REMAINING: £{remaining.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 mb-2">
                                    <div
                                        className={cn("h-full rounded-full transition-all duration-500", dept.color)}
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                </div>

                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>Spent: £{dept.spent.toLocaleString()}</span>
                                    <span>Limit: £{dept.limit.toLocaleString()}</span>
                                </div>

                                {/* Breakdown Dropdown */}
                                {isExpanded && (
                                    <div className="mt-4 pl-6 pr-2 py-3 bg-gray-50 rounded-md text-sm animate-in slide-in-from-top-2 duration-200">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Category Breakdown</h4>

                                        {breakdown.length > 0 ? (
                                            <div className="space-y-2">
                                                {breakdown.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-xs">
                                                        <span className="text-gray-600">{item.category}</span>
                                                        <span className="font-medium text-gray-900">£{item.amount.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between items-center text-xs font-semibold">
                                                    <span>Total</span>
                                                    <span>£{breakdown.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 italic">No detailed spend data available.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
});

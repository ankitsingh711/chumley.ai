import { memo, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import type { Department } from '../../services/departments.service';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/api';
import { ChevronDown, Check } from 'lucide-react';
// TODO: Uncomment to use API data instead of hardcoded data
// import { reportsApi } from '../../services/reports.service';
import { getCategoryBreakdown } from '../../data/financialDataHelpers';

interface BudgetTrackerProps {
    departmentSpend?: Record<string, number>;
    departments?: Department[];
    year?: number | undefined;
    onYearChange?: (year: number | undefined) => void;
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
    year,
    onYearChange
}: BudgetTrackerProps) {
    const navigate = useNavigate();
    const { user } = useAuth();
    // Default limit for illustration since we don't have it in DB yet
    const DEFAULT_LIMIT = 50000;

    // State for expanded department
    const [expandedDept, setExpandedDept] = useState<string | null>(null);
    const [breakdownData, setBreakdownData] = useState<Record<string, { category: string; amount: number }[]>>({});
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
            // Pass the year from props to filter the breakdown correctly
            const data = getCategoryBreakdown(deptName, year);
            setBreakdownData(prev => ({ ...prev, [deptId]: data }));
        }
    };

    // When timeframe changes, we should clear cached breakdown data
    // so it refetches cleanly when re-expanding
    useMemo(() => {
        setBreakdownData({});
        setExpandedDept(null);
    }, [year]);

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="font-semibold text-gray-900">Departmental Budget Tracking</h3>
                <div className="flex items-center gap-2">
                    {onYearChange && (
                        <div className="relative">
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                            >
                                <span className="font-medium text-gray-700">
                                    {year === 2025 ? '2025' : year === 2024 ? '2024' : 'All Time'}
                                </span>
                                <ChevronDown className={cn("h-4 w-4 text-gray-500 transition-transform", isDropdownOpen && "rotate-180")} />
                            </button>

                            {isDropdownOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setIsDropdownOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-40 z-20 bg-[#404040] rounded-xl shadow-lg border border-gray-600 overflow-hidden text-white animate-in slide-in-from-top-2 duration-200">
                                        <div className="py-1">
                                            {[
                                                { label: '2025', value: 2025 },
                                                { label: '2024', value: 2024 },
                                                { label: 'All Time', value: undefined }
                                            ].map((option) => (
                                                <button
                                                    key={option.label}
                                                    onClick={() => {
                                                        onYearChange(option.value);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={cn(
                                                        "w-full text-left px-4 py-2 text-sm flex items-center transition-colors font-medium",
                                                        year === option.value
                                                            ? "bg-[#5b96f7] text-white"
                                                            : "hover:bg-white/10"
                                                    )}
                                                >
                                                    <span className="w-5 relative flex items-center justify-center">
                                                        {year === option.value && (
                                                            <Check className="h-4 w-4" strokeWidth={3} />
                                                        )}
                                                    </span>
                                                    <span>{option.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
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

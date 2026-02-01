import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import type { Department } from '../../services/departments.service';

interface BudgetTrackerProps {
    departmentSpend?: Record<string, number>;
    departments?: Department[];
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
    'bg-teal-500',
];

export function BudgetTracker({ departmentSpend = {}, departments = [] }: BudgetTrackerProps) {
    const navigate = useNavigate();
    // Default limit for illustration since we don't have it in DB yet
    const DEFAULT_LIMIT = 50000;

    // Create a map of department spend for easy lookup
    const spendMap = departmentSpend;

    // Combine seeded departments with any extra spend categories (fallback)
    // We prioritize the seeded departments list to show correct names and descriptions
    const trackedDepartments = departments.map((dept, index) => {
        // Use embedded metrics from backend if available (new standard), otherwise fallback to props map
        const spendFromMetrics = (dept as any).metrics?.totalSpent;
        const spendFromMap = spendMap[dept.name] || 0;

        return {
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
                name,
                category: 'Unassigned / Other',
                limit: DEFAULT_LIMIT,
                color: 'bg-gray-400',
                spent: amount
            });
        }
    });

    const sortedDepartments = trackedDepartments.sort((a, b) => b.spent - a.spent);

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Departmental Budget Tracking</h3>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-teal-700 hover:text-teal-800"
                    onClick={() => navigate('/budgets')}
                >
                    View All
                </Button>
            </div>

            <div className="space-y-6">
                {sortedDepartments.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No department data available.</p>
                ) : (
                    sortedDepartments.map((dept) => {
                        const percentage = Math.round((dept.spent / dept.limit) * 100);
                        const remaining = dept.limit - dept.spent;

                        return (
                            <div key={dept.name}>
                                <div className="mb-2 flex items-end justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">{dept.name}</p>
                                        <p className="text-xs text-gray-500">{dept.category}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn("text-sm font-bold", percentage > 90 ? "text-red-600" : "text-gray-900")}>
                                            {percentage}%
                                        </p>
                                        <p className="text-xs text-gray-400">REMAINING: ${remaining.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                    <div
                                        className={cn("h-full rounded-full transition-all duration-500", dept.color)}
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                </div>

                                <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                                    <span>Spent: ${dept.spent.toLocaleString()}</span>
                                    <span>Limit: ${dept.limit.toLocaleString()}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

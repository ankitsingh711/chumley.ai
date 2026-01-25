import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';



interface BudgetTrackerProps {
    departmentSpend?: Record<string, number>;
}

// Mock limits/categories for now, but spend will be real
const departmentConfig: Record<string, { category: string; limit: number; color: string }> = {
    'IT Department': { category: 'Infrastructure & SaaS Subscriptions', limit: 100000, color: 'bg-yellow-500' },
    'Marketing & Growth': { category: 'Paid Media & Agency Fees', limit: 120000, color: 'bg-green-500' },
    'Human Resources': { category: 'Training & Recruitment', limit: 15000, color: 'bg-red-500' },
    'Operations': { category: 'Logistics & Supply Chain', limit: 80000, color: 'bg-emerald-500' },
};

export function BudgetTracker({ departmentSpend = {} }: BudgetTrackerProps) {
    // Merge config with real data. If a department exists in config, update its spend.
    // If we have spend for a department not in config, we could add it dynamically or ignore.
    // For this UI, we'll stick to the configured departments but show 0 if no spend.
    const departments = Object.entries(departmentConfig).map(([name, config]) => ({
        name,
        ...config,
        spent: departmentSpend[name] || 0
    }));

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Departmental Budget Tracking</h3>
                <Button variant="ghost" size="sm" className="h-8 text-teal-700 hover:text-teal-800">
                    View All
                </Button>
            </div>

            <div className="space-y-6">
                {departments.map((dept) => {
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
                })}
            </div>
        </div>
    );
}

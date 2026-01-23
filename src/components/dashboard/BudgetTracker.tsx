import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

interface BudgetDepartment {
    name: string;
    category: string;
    spent: number;
    limit: number;
    color: string; // Tailwind color class backbone e.g. "yellow" -> bg-yellow-500
}

const departments: BudgetDepartment[] = [
    { name: 'IT Department', category: 'Infrastructure & SaaS Subscriptions', spent: 85000, limit: 100000, color: 'bg-yellow-500' },
    { name: 'Marketing & Growth', category: 'Paid Media & Agency Fees', spent: 42000, limit: 120000, color: 'bg-green-500' },
    { name: 'Human Resources', category: 'Training & Recruitment', spent: 14500, limit: 15000, color: 'bg-red-500' },
    { name: 'Operations', category: 'Logistics & Supply Chain', spent: 60000, limit: 80000, color: 'bg-emerald-500' },
];

export function BudgetTracker() {
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
                                    style={{ width: `${percentage}%` }}
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

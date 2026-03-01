import { memo, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import type { Department } from '../../services/departments.service';
import { reportsApi } from '../../services/reports.service';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/api';

interface BudgetTrackerProps {
    departmentSpend?: Record<string, number>;
    departments?: Department[];
    dateRange?: { start?: string; end?: string };
}

interface DepartmentSpendBreakdownItem {
    category: string;
    amount: number;
}

interface TrackedDepartment {
    id: string;
    name: string;
    limit: number;
    spent: number;
}

const getProgressStyles = (percentage: number) => {
    if (percentage >= 100) {
        return {
            bar: 'bg-red-500',
            badge: 'border border-red-200 bg-red-50 text-red-700',
            icon: 'text-red-600',
        };
    }

    if (percentage >= 85) {
        return {
            bar: 'bg-amber-500',
            badge: 'border border-amber-200 bg-amber-50 text-amber-700',
            icon: 'text-amber-600',
        };
    }

    return {
        bar: 'bg-emerald-500',
        badge: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
        icon: 'text-emerald-600',
    };
};

export const BudgetTracker = memo(function BudgetTracker({
    departmentSpend = {},
    departments = [],
    dateRange,
}: BudgetTrackerProps) {
    const navigate = useNavigate();
    const { user } = useAuth();

    const dateRangeKey = `${dateRange?.start || 'all'}|${dateRange?.end || 'all'}`;
    const [expandedDept, setExpandedDept] = useState<{ id: string; rangeKey: string } | null>(null);
    const [breakdownData, setBreakdownData] = useState<Record<string, DepartmentSpendBreakdownItem[]>>({});

    const sortedDepartments = useMemo<TrackedDepartment[]>(() => {
        const base = departments.map((department) => {
            const spendFromMetrics = department.metrics?.totalSpent;
            const hasSpendFromMap = Object.prototype.hasOwnProperty.call(departmentSpend, department.name);
            const spendFromMap = hasSpendFromMap ? departmentSpend[department.name] || 0 : undefined;
            const budgetLimit = Number(department.budget);

            return {
                id: department.id,
                name: department.name,
                limit: Number.isFinite(budgetLimit) && budgetLimit > 0 ? budgetLimit : 0,
                spent: typeof spendFromMap === 'number'
                    ? spendFromMap
                    : (typeof spendFromMetrics === 'number' ? spendFromMetrics : 0),
            };
        });

        Object.entries(departmentSpend).forEach(([name, amount]) => {
            if (!base.find((department) => department.name === name)) {
                base.push({
                    id: `unassigned-${name}`,
                    name,
                    limit: 0,
                    spent: amount,
                });
            }
        });

        return base.sort((a, b) => b.spent - a.spent);
    }, [departments, departmentSpend]);

    const handleExpand = async (departmentId: string) => {
        if (expandedDept?.id === departmentId && expandedDept.rangeKey === dateRangeKey) {
            setExpandedDept(null);
            return;
        }

        setExpandedDept({ id: departmentId, rangeKey: dateRangeKey });

        const cacheKey = `${dateRangeKey}|${departmentId}`;

        if (!breakdownData[cacheKey]) {
            if (departmentId.startsWith('unassigned-')) {
                setBreakdownData((prev) => ({ ...prev, [cacheKey]: [] }));
                return;
            }

            const selectedRange = dateRange?.start || dateRange?.end ? dateRange : undefined;

            try {
                const data = await reportsApi.getDepartmentSpendBreakdown(
                    departmentId,
                    selectedRange?.start,
                    selectedRange?.end
                );
                setBreakdownData((prev) => ({ ...prev, [cacheKey]: data }));
            } catch (error) {
                console.error(`Failed to load spend breakdown for department ${departmentId}:`, error);
                setBreakdownData((prev) => ({ ...prev, [cacheKey]: [] }));
            }
        }
    };

    const overLimitCount = sortedDepartments.filter((department) => department.spent > department.limit).length;

    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Department Budget Tracking</h3>
                    <p className="mt-1 text-sm text-gray-500">Spend vs monthly limits with category-level breakdown.</p>
                </div>
                <div className="flex items-center gap-2">
                    {overLimitCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {overLimitCount} over budget
                        </span>
                    )}
                    {user?.role === UserRole.SYSTEM_ADMIN && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => navigate('/budgets')}
                        >
                            View Budgets
                        </Button>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                {sortedDepartments.length === 0 ? (
                    <p className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">No department spend data available.</p>
                ) : (
                    sortedDepartments.map((department) => {
                        const percentageRaw = department.limit > 0 ? (department.spent / department.limit) * 100 : 0;
                        const percentage = Math.round(percentageRaw);
                        const progressWidth = Math.min(Math.max(percentageRaw, 0), 100);
                        const remaining = department.limit - department.spent;
                        const isExpanded = expandedDept?.id === department.id && expandedDept.rangeKey === dateRangeKey;
                        const breakdown = breakdownData[`${dateRangeKey}|${department.id}`] || [];
                        const breakdownTotal = breakdown.reduce((sum, item) => sum + item.amount, 0);
                        const styles = getProgressStyles(percentage);

                        return (
                            <article key={department.id} className="rounded-xl border border-gray-200 bg-gray-50/40 p-4">
                                <button
                                    type="button"
                                    onClick={() => void handleExpand(department.id)}
                                    className="flex w-full items-start justify-between gap-3 text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        <ChevronDown className={cn('mt-0.5 h-4 w-4 text-gray-400 transition-transform', isExpanded && 'rotate-180')} />
                                        <div>
                                            <p className="font-medium text-gray-900">{department.name}</p>
                                            <p className="mt-0.5 text-xs text-gray-500">
                                                Spent {formatCurrency(department.spent)} of {formatCurrency(department.limit)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles.badge}`}>
                                            {percentage}%
                                        </span>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {remaining >= 0 ? 'Remaining' : 'Over by'} {formatCurrency(Math.abs(remaining))}
                                        </p>
                                    </div>
                                </button>

                                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                                    <div
                                        className={cn('h-full rounded-full transition-all duration-500', styles.bar)}
                                        style={{ width: `${progressWidth}%` }}
                                    />
                                </div>

                                {isExpanded && (
                                    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Category Breakdown</p>

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
                                                <div className="mt-3 border-t border-gray-100 pt-2 text-xs font-semibold text-gray-700">
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
                    })
                )}
            </div>
        </section>
    );
});

function formatCurrency(value: number) {
    return `£${Number(value || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

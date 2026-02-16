import { memo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
    title: string;
    value: string;
    trend?: {
        value: string;
        isPositive: boolean;
        label?: string; // e.g. "vs last month"
    };
    icon?: LucideIcon;
    color?: 'primary' | 'blue' | 'yellow' | 'green' | 'orange' | 'purple';
}

export const StatCard = memo(function StatCard({ title, value, trend, icon: Icon, color = 'primary' }: StatCardProps) {
    const colorStyles: Record<string, string> = {
        primary: 'bg-primary-50 text-primary-700',
        blue: 'bg-blue-50 text-blue-700',
        yellow: 'bg-yellow-50 text-yellow-700',
        green: 'bg-green-50 text-green-700',
        orange: 'bg-orange-50 text-orange-700',
        purple: 'bg-purple-50 text-purple-700',
    };

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <h3 className="mt-2 text-2xl font-bold text-gray-900">{value}</h3>

                    {trend && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className={cn(
                                "font-medium",
                                trend.isPositive ? "text-green-600" : "text-red-600"
                            )}>
                                {trend.isPositive ? '+' : ''}{trend.value}
                            </span>
                            <span className="text-gray-400">{trend.label || 'vs last month'}</span>
                        </div>
                    )}
                </div>

                {Icon && (
                    <div className={cn("rounded-lg p-2", colorStyles[color])}>
                        <Icon className="h-5 w-5" />
                    </div>
                )}
            </div>
        </div>
    );
});

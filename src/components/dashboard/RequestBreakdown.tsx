import { memo, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';

interface RequestBreakdownProps {
    metrics?: {
        pendingRequests: number;
        approvedRequests: number;
        rejectedRequests: number;
        totalRequests: number;
    };
}

export const RequestBreakdown = memo(function RequestBreakdown({ metrics }: RequestBreakdownProps) {
    const chartData = useMemo(() => [
        { name: 'In Review', value: metrics?.pendingRequests || 0, color: '#3b82f6' },
        { name: 'Approved', value: metrics?.approvedRequests || 0, color: '#10b981' },
        { name: 'Rejected', value: metrics?.rejectedRequests || 0, color: '#ef4444' },
    ], [metrics]);

    const total = metrics?.totalRequests || 0;

    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Request Breakdown</h3>
                    <p className="mt-1 text-sm text-gray-500">Distribution of requests by final decision.</p>
                </div>
                <span className="whitespace-nowrap rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                    {total} total
                </span>
            </div>

            <div className="relative h-52">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={86}
                            paddingAngle={4}
                            dataKey="value"
                            strokeWidth={0}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} />
                            ))}
                            <Label value={total.toString()} position="center" className="fill-gray-900 text-2xl font-bold" />
                            <Label value="Requests" position="center" dy={20} className="fill-gray-400 text-xs font-medium" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-3 space-y-2">
                {chartData.map((item) => {
                    const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                        <div key={item.name} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                            <div className="mb-1 flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-gray-700">{item.name}</span>
                                </div>
                                <span className="font-semibold text-gray-900">{percentage}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-gray-200">
                                <div
                                    className="h-full rounded-full"
                                    style={{ width: `${Math.max(percentage, item.value > 0 ? 6 : 0)}%`, backgroundColor: item.color }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
});

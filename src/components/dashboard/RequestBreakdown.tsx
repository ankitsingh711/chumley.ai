import { memo, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';

interface RequestBreakdownProps {
    metrics?: {
        pendingRequests: number;
        approvedRequests: number;
        rejectedRequests: number;
        totalRequests: number;
    }
}

export const RequestBreakdown = memo(function RequestBreakdown({ metrics }: RequestBreakdownProps) {
    const data = useMemo(() => [
        { name: 'In Progress', value: metrics?.pendingRequests || 0, color: '#5080CE' }, // Teal-500
        { name: 'Approved', value: metrics?.approvedRequests || 0, color: '#10b981' }, // Emerald-500
        { name: 'Rejected', value: metrics?.rejectedRequests || 0, color: '#ef4444' }, // Red-500
    ], [metrics]);

    const total = metrics?.totalRequests || 0;

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col">
            <h3 className="mb-4 font-semibold text-gray-900">REQUEST BREAKDOWN</h3>

            <div className="relative h-48 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            strokeWidth={0}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            <Label
                                value={total.toString()}
                                position="center"
                                className="fill-gray-900 text-2xl font-bold"
                            />
                            <Label
                                value="TOTAL"
                                position="center"
                                dy={20}
                                className="fill-gray-400 text-xs font-medium"
                            />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 space-y-3">
                {data.map((item) => {
                    const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-gray-600">{item.name}</span>
                            </div>
                            <span className="font-medium text-gray-900">{percentage}%</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

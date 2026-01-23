import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';

const data = [
    { name: 'In Progress', value: 60, color: '#14b8a6' }, // Teal-500
    { name: 'Approved', value: 25, color: '#10b981' }, // Emerald-500
    { name: 'Rejected', value: 15, color: '#ef4444' }, // Red-500
];

export function RequestBreakdown() {
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
                                value="142"
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
                {data.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-gray-600">{item.name}</span>
                        </div>
                        <span className="font-medium text-gray-900">{item.value}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

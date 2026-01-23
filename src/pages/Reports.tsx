import { Download, Calendar, Filter } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/dashboard/StatCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const spendData = [
    { month: 'JAN', amount: 85000 },
    { month: 'FEB', amount: 92000 },
    { month: 'MAR', amount: 124000 }, // Spike
    { month: 'APR', amount: 98000 },
    { month: 'MAY', amount: 105000 },
    { month: 'JUN', amount: 110000 },
];

const breakdownData = [
    { name: 'Approved', value: 156, color: '#10b981' },
    { name: 'Pending', value: 39, color: '#f59e0b' },
    { name: 'Denied', value: 25, color: '#ef4444' },
];

export default function Reports() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
                <div className="relative w-64">
                    <input type="text" placeholder="Search data points..." className="w-full rounded-md border border-gray-200 bg-white py-2 px-4 text-sm outline-none focus:border-teal-500" />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Calendar className="mr-2 h-4 w-4" /> Date Range</Button>
                    <Button className="bg-teal-700"><Download className="mr-2 h-4 w-4" /> Export Data</Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Spend YTD" value="$1,240,500" trend={{ value: '+12.4%', isPositive: true }} color="teal" />
                <StatCard title="Active Requests" value="42" trend={{ value: '-5%', isPositive: false }} color="orange" />
                <StatCard title="Avg. Processing Time" value="4.2 Days" trend={{ value: '-0.5%', isPositive: true }} color="purple" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Spend Trends - Area Chart */}
                <div className="lg:col-span-2 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-semibold text-gray-900">Monthly Spend Trends</h3>
                            <p className="text-xs text-gray-500">Spend visualization for the last 6 months</p>
                        </div>
                        <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">Last 6 Months</div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={spendData}>
                                <defs>
                                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                <Tooltip />
                                <Area type="monotone" dataKey="amount" stroke="#14b8a6" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Breakdown - Donut or similar */}
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-6">Request Breakdown</h3>
                    <div className="h-48 w-full flex items-center justify-center relative">
                        {/* Simplified SVG Ring implementation for speed vs importing PieChart again if simplest */}
                        {/* Let's reuse the component logic effectively or just custom SVG to match image perfectly if needed 
                    The image shows a ring with 156 total in center.
                */}
                        <svg viewBox="0 0 100 100" className="h-40 w-40 -rotate-90">
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="10" strokeDasharray="180 251" strokeLinecap="round" /> {/* Approx 70% */}
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="10" strokeDasharray="50 251" strokeDashoffset="-180" strokeLinecap="round" />
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="10" strokeDasharray="21 251" strokeDashoffset="-230" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-gray-900">156</span>
                            <span className="text-xs text-gray-400">TOTAL</span>
                        </div>
                    </div>

                    <div className="space-y-3 mt-4">
                        {breakdownData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                                    <span className="text-gray-600">{item.name}</span>
                                </div>
                                <span className="font-medium text-gray-900">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Transactions & Requests</h3>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm"><Filter className="h-3 w-3 mr-1" /> Filter</Button>
                        <Button variant="ghost" size="sm">Date Range</Button>
                    </div>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-6 py-3">Reference ID</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Requester</th>
                            <th className="px-6 py-3">Vendor</th>
                            <th className="px-6 py-3">Amount</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        <tr>
                            <td className="px-6 py-3 text-teal-600 font-medium">#PR-8821</td>
                            <td className="px-6 py-3 text-gray-500">Jun 12, 2024</td>
                            <td className="px-6 py-3">Jane Doe</td>
                            <td className="px-6 py-3">TechSolutions Inc.</td>
                            <td className="px-6 py-3 font-medium">$12,450.00</td>
                            <td className="px-6 py-3"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">APPROVED</span></td>
                            <td className="px-6 py-3 text-gray-400">⋮</td>
                        </tr>
                        <tr>
                            <td className="px-6 py-3 text-teal-600 font-medium">#PR-8822</td>
                            <td className="px-6 py-3 text-gray-500">Jun 14, 2024</td>
                            <td className="px-6 py-3">Robert Miller</td>
                            <td className="px-6 py-3">Office Supply Co.</td>
                            <td className="px-6 py-3 font-medium">$1,200.00</td>
                            <td className="px-6 py-3"><span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">PENDING</span></td>
                            <td className="px-6 py-3 text-gray-400">⋮</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

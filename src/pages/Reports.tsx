import { useEffect, useState } from 'react';
import { pdfService } from '../services/pdf.service';
import { Download, Calendar, Filter, X, Check, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { DatePicker } from '../components/ui/DatePicker';
import { StatCard } from '../components/dashboard/StatCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { reportsApi } from '../services/reports.service';
import { requestsApi } from '../services/requests.service';
import { ReportsSkeleton } from '../components/skeletons/ReportsSkeleton';
import type { KPIMetrics, MonthlySpendData, PurchaseRequest } from '../types/api';
import { RequestStatus } from '../types/api';
import { isPaginatedResponse } from '../types/pagination';

export default function Reports() {
    const [metrics, setMetrics] = useState<KPIMetrics | null>(null);
    const [spendData, setSpendData] = useState<MonthlySpendData[]>([]);
    const [allRequests, setAllRequests] = useState<PurchaseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [activeDateRange, setActiveDateRange] = useState<{ start?: string, end?: string }>({});
    const [transactionFilter, setTransactionFilter] = useState('ALL');
    const [showTransactionFilter, setShowTransactionFilter] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async (startDate?: string, endDate?: string) => {
        try {
            setLoading(true);
            const [kpiData, monthlyData, requestsResponse] = await Promise.all([
                reportsApi.getKPIs(startDate, endDate),
                reportsApi.getMonthlySpend(startDate, endDate),
                requestsApi.getAll(),
            ]);
            setMetrics(kpiData);
            setSpendData(monthlyData);
            const requestsData: PurchaseRequest[] = isPaginatedResponse(requestsResponse) ? requestsResponse.data : requestsResponse;
            setAllRequests(requestsData);
        } catch (error) {
            console.error('Failed to load reports data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportData = async () => {
        try {
            const response = await requestsApi.getAll();
            const allRequests: PurchaseRequest[] = isPaginatedResponse(response) ? response.data : response;

            // Create CSV content
            const headers = ['ID', 'Date', 'Requester', 'Department', 'Amount', 'Status'];
            const rows = allRequests.map((req: PurchaseRequest) => [
                req.id.slice(0, 8),
                new Date(req.createdAt).toLocaleDateString(),
                req.requester?.name || 'Unknown',
                req.requester?.department || 'N/A',
                req.totalAmount,
                req.status.replace(/_/g, ' ')
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map((row: any[]) => row.join(','))
            ].join('\n');

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `procurement_report_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export data');
        }
    };

    const handleExportPDF = async () => {
        try {
            const response = await requestsApi.getAll();
            const allRequests: PurchaseRequest[] = isPaginatedResponse(response) ? response.data : response;
            const headers = ['ID', 'Date', 'Requester', 'Department', 'Amount', 'Status'];
            const rows = allRequests.map((req: PurchaseRequest) => [
                req.id.slice(0, 8),
                new Date(req.createdAt).toLocaleDateString(),
                req.requester?.name || 'Unknown',
                req.requester?.department || 'N/A',
                `£${Number(req.totalAmount).toLocaleString()}`,
                req.status.replace(/_/g, ' ')
            ]);

            pdfService.exportToPDF(
                'Procurement Reports',
                headers,
                rows,
                'procurement_report'
            );
        } catch (error) {
            console.error('PDF Export failed:', error);
            alert('Failed to export PDF');
        }
    };

    const applyDateRange = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);

        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        setDateRange({ start: startStr, end: endStr });
        setActiveDateRange({ start: startStr, end: endStr });
        setShowDatePicker(false);
        loadData(startStr, endStr);
    };

    const applyCustomDateRange = () => {
        if (dateRange.start && dateRange.end) {
            setActiveDateRange({ start: dateRange.start, end: dateRange.end });
            setShowDatePicker(false);
            loadData(dateRange.start, dateRange.end);
        }
    };

    const clearDateRange = () => {
        setDateRange({ start: '', end: '' });
        setActiveDateRange({});
        setShowDatePicker(false);
        loadData();
    };

    if (loading) {
        return <ReportsSkeleton />;
    }

    const breakdownData = [
        { name: 'Approved', value: metrics?.approvedRequests || 0, color: '#10b981' },
        { name: 'Pending', value: metrics?.pendingRequests || 0, color: '#f59e0b' },
        { name: 'Rejected', value: metrics?.rejectedRequests || 0, color: '#ef4444' },
    ];

    const totalRequests = metrics?.totalRequests || 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
                    {(activeDateRange.start || activeDateRange.end) && (
                        <p className="text-sm text-gray-500 mt-1">
                            Filtered: {activeDateRange.start ? new Date(activeDateRange.start).toLocaleDateString() : 'Beginning'} - {activeDateRange.end ? new Date(activeDateRange.end).toLocaleDateString() : 'Today'}
                            <button onClick={clearDateRange} className="ml-2 text-primary-600 hover:text-primary-700 font-medium">Clear</button>
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Button variant="outline" onClick={() => setShowDatePicker(!showDatePicker)}>
                            <Calendar className="mr-2 h-4 w-4" /> Date Range
                        </Button>

                        {showDatePicker && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-900">Select Date Range</h3>
                                    <button onClick={() => setShowDatePicker(false)} className="text-gray-400 hover:text-gray-600">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <button onClick={() => applyDateRange(7)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">Last 7 days</button>
                                    <button onClick={() => applyDateRange(30)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">Last 30 days</button>
                                    <button onClick={() => applyDateRange(90)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">Last 90 days</button>
                                    <button onClick={() => applyDateRange(365)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">This Year</button>
                                </div>

                                <div className="border-t pt-4">
                                    <p className="text-xs text-gray-500 mb-2">Custom Range</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <DatePicker
                                            value={dateRange.start}
                                            onChange={(val) => setDateRange({ ...dateRange, start: val })}
                                            placeholder="Start Date"
                                            className="text-sm w-full"
                                        />
                                        <DatePicker
                                            value={dateRange.end}
                                            onChange={(val) => setDateRange({ ...dateRange, end: val })}
                                            placeholder="End Date"
                                            className="text-sm w-full"
                                        />
                                    </div>
                                    <Button
                                        onClick={applyCustomDateRange}
                                        size="sm"
                                        className="w-full mt-2"
                                        disabled={!dateRange.start || !dateRange.end}
                                    >
                                        Apply Custom Range
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                    <Button className="bg-primary-700" onClick={handleExportData}>
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                    <Button className="bg-primary-700" onClick={handleExportPDF}>
                        <FileText className="mr-2 h-4 w-4" /> Export PDF
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Spend YTD"
                    value={`£${(metrics?.totalSpend ?? 0).toLocaleString()}`}
                    trend={{ value: '+12.4%', isPositive: true, label: 'vs last year' }}
                    color="primary"
                />
                <StatCard
                    title="Active Requests"
                    value={metrics?.pendingRequests.toString() || '0'}
                    trend={{ value: `${metrics?.totalRequests || 0} total`, isPositive: true, label: 'this period' }}
                    color="orange"
                />
                <StatCard
                    title="Avg. Processing Time"
                    value={`${metrics?.avgProcessingTime?.toFixed(1) || '0'} Days`}
                    trend={{ value: '-0.5%', isPositive: true, label: 'vs last month' }}
                    color="purple"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Spend Trends - Area Chart */}
                <div className="lg:col-span-2 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-semibold text-gray-900">Monthly Spend Trends</h3>
                            <p className="text-xs text-gray-500">Spend visualization for recent months</p>
                        </div>
                        <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">Last {spendData.length} Months</div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={spendData}>
                                <defs>
                                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#5080CE" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#5080CE" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                <Tooltip />
                                <Area type="monotone" dataKey="spend" stroke="#5080CE" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Breakdown - Donut */}
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-6">Request Breakdown</h3>
                    <div className="h-48 w-full flex items-center justify-center relative">
                        <svg viewBox="0 0 100 100" className="h-40 w-40 -rotate-90">
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="10" strokeDasharray={`${(breakdownData[0].value / totalRequests) * 251} 251`} strokeLinecap="round" />
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="10" strokeDasharray={`${(breakdownData[1].value / totalRequests) * 251} 251`} strokeDashoffset={`-${(breakdownData[0].value / totalRequests) * 251}`} strokeLinecap="round" />
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="10" strokeDasharray={`${(breakdownData[2].value / totalRequests) * 251} 251`} strokeDashoffset={`-${((breakdownData[0].value + breakdownData[1].value) / totalRequests) * 251}`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-gray-900">{totalRequests}</span>
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
                    <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
                    <div className="flex gap-2 relative">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowTransactionFilter(!showTransactionFilter)}
                            className={transactionFilter !== 'ALL' ? 'bg-gray-100 text-primary-600' : ''}
                        >
                            <Filter className="h-3 w-3 mr-1" />
                            {transactionFilter === 'ALL' ? 'Filter' : transactionFilter.replace(/_/g, ' ')}
                        </Button>

                        {showTransactionFilter && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                {['ALL', ...Object.values(RequestStatus)].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => {
                                            setTransactionFilter(status);
                                            setShowTransactionFilter(false);
                                        }}
                                        className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center justify-between"
                                    >
                                        <span className={status === transactionFilter ? 'font-medium text-primary-600' : 'text-gray-700'}>
                                            {status === 'ALL' ? 'All Transactions' : status.replace(/_/g, ' ')}
                                        </span>
                                        {status === transactionFilter && <Check className="h-3 w-3 text-primary-600" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-6 py-3">Reference ID</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Requester</th>
                            <th className="px-6 py-3">Amount</th>
                            <th className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {allRequests
                            .filter(req => transactionFilter === 'ALL' || req.status === transactionFilter)
                            .slice(0, 10)
                            .map(req => (
                                <tr key={req.id}>
                                    <td className="px-6 py-3 text-primary-600 font-medium">#{req.id.slice(0, 8)}</td>
                                    <td className="px-6 py-3 text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-3">{req.requester?.name || 'Unknown'}</td>
                                    <td className="px-6 py-3 font-medium">£{Number(req.totalAmount).toLocaleString()}</td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                            req.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                                req.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {req.status.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

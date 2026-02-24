import { useEffect, useState, useMemo } from 'react';
import { Wallet, FileClock, ShoppingBag, TrendingUp, Calendar, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/dashboard/StatCard';
import { BudgetTracker } from '../components/dashboard/BudgetTracker';
import { RequestBreakdown } from '../components/dashboard/RequestBreakdown';
import { Button } from '../components/ui/Button';
import { DatePicker } from '../components/ui/DatePicker';
import { DashboardSkeleton } from '../components/skeletons/DashboardSkeleton';
import { reportsApi } from '../services/reports.service';
import { requestsApi } from '../services/requests.service';
import { departmentsApi, type Department } from '../services/departments.service';
import type { KPIMetrics, PurchaseRequest } from '../types/api';
import { isPaginatedResponse } from '../types/pagination';
import { getDateAndTime } from '../utils/dateFormat';
import { getCategorySpendTotals, getTotalSpend, getLatestMonthRange } from '../data/financialDataHelpers';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/api';

export default function Dashboard() {
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState<KPIMetrics | null>(null);
    const [recentRequests, setRecentRequests] = useState<PurchaseRequest[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [activeDateRange, setActiveDateRange] = useState<{ start?: string; end?: string }>(getLatestMonthRange);

    // Determine the department filter for restricted roles
    const userRole = user?.role;
    const isRestrictedRole = userRole === UserRole.MANAGER || userRole === UserRole.SENIOR_MANAGER;
    // Extract the department name (either string or object)
    const departmentName = typeof user?.department === 'string'
        ? user.department
        : user?.department?.name;

    const departmentFilter = isRestrictedRole && departmentName ? departmentName : undefined;


    // Filter departments array for BudgetTracker so it doesn't show others as £0
    const filteredDepartments = useMemo(() => {
        if (departmentFilter) {
            return departments.filter(d => d.name.toLowerCase() === departmentFilter.toLowerCase());
        }
        return departments;
    }, [departments, departmentFilter]);

    const loadDashboard = async (startDate?: string, endDate?: string) => {
        try {
            setLoading(true);
            const [kpiData, departmentsData] = await Promise.all([
                reportsApi.getKPIs(startDate, endDate),
                departmentsApi.getAll(),
            ]);

            // Calculate hardcoded financial data for the given date range
            const dateRangeOpt = (startDate || endDate) ? { start: startDate, end: endDate } : undefined;
            const hardcodedDepartmentSpend = getCategorySpendTotals(dateRangeOpt, departmentFilter);
            const hardcodedTotalSpend = getTotalSpend(dateRangeOpt, departmentFilter);

            // Using hardcoded financial data for department spend
            setMetrics(prev => ({
                ...(prev || kpiData),
                ...kpiData,
                departmentSpend: hardcodedDepartmentSpend,
                totalSpend: hardcodedTotalSpend,
            }));
            setDepartments(departmentsData);

            const response = await requestsApi.getAll();
            const allRequests = isPaginatedResponse(response) ? response.data : response;
            setRecentRequests(allRequests.slice(0, 5));
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const { start, end } = getLatestMonthRange();
        loadDashboard(start, end);
    }, []);

    const applyDateRange = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        // Reset the custom date range inputs when a preset is selected
        setDateRange({ start: '', end: '' });
        setActiveDateRange({ start: startStr, end: endStr });
        setShowDatePicker(false);
        loadDashboard(startStr, endStr);
    };

    const applyCustomDateRange = () => {
        if (dateRange.start && dateRange.end) {
            setActiveDateRange({ start: dateRange.start, end: dateRange.end });
            setShowDatePicker(false);
            loadDashboard(dateRange.start, dateRange.end);
        }
    };

    const clearDateRange = () => {
        setDateRange({ start: '', end: '' });
        setActiveDateRange({});
        setShowDatePicker(false);
        loadDashboard();
    };


    if (loading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Dashboard Header with Date Range */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    {(activeDateRange.start || activeDateRange.end) && (
                        <p className="text-sm text-gray-500 mt-1">
                            Filtered: {activeDateRange.start ? new Date(activeDateRange.start).toLocaleDateString() : 'Beginning'} - {activeDateRange.end ? new Date(activeDateRange.end).toLocaleDateString() : 'Today'}
                            <button onClick={clearDateRange} className="ml-2 text-primary-600 hover:text-primary-700 font-medium">Clear</button>
                        </p>
                    )}
                </div>
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
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="Total Spend"
                    value={`£${metrics?.totalSpend.toLocaleString() || '0'}`}
                    trend={{ value: '12.4%', isPositive: true, label: 'vs last month' }}
                    icon={Wallet}
                    color="blue"
                />
                <StatCard
                    title="Pending Approvals"
                    value={(metrics?.pendingRequests ?? 0).toString()}
                    trend={{ value: 'Active', isPositive: true, label: `${metrics?.totalRequests || 0} total requests` }}
                    icon={FileClock}
                    color="yellow"
                />
                <StatCard
                    title="Active POs"
                    value={(metrics?.totalOrders ?? 0).toString()}
                    trend={{ value: '2.1%', isPositive: true, label: 'vs last month' }}
                    icon={ShoppingBag}
                    color="green"
                />
                <StatCard
                    title="Approved Requests"
                    value={(metrics?.approvedRequests ?? 0).toString()}
                    trend={{ value: `${metrics?.rejectedRequests || 0} rejected`, isPositive: false, label: 'this month' }}
                    icon={TrendingUp}
                    color="purple"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Budget Tracking (2 cols wide) */}
                <div className="lg:col-span-2">
                    <BudgetTracker
                        departmentSpend={metrics?.departmentSpend}
                        departments={filteredDepartments}
                        dateRange={activeDateRange}
                    />
                </div>

                {/* Right Column: Breakdown & Sourcing */}
                <div className="space-y-6">
                    <RequestBreakdown metrics={metrics || undefined} />
                </div>
            </div>

            {/* Bottom Section: Recent Purchase Requests */}
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Recent Purchase Requests</h3>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate('/requests')}>View All</Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requester</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {recentRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                                        No recent requests found
                                    </td>
                                </tr>
                            ) : (
                                recentRequests.map((request) => (
                                    <tr key={request.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/requests`)}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            #{request.id.slice(0, 8)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {request.requester?.name || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            £{Number(request.totalAmount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${request.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                    request.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                {request.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {(() => {
                                                const { date, time } = getDateAndTime(request.createdAt);
                                                return (
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900">{date}</span>
                                                        <span className="text-xs text-gray-500">{time}</span>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 pb-safe">
                    {user?.role !== UserRole.SYSTEM_ADMIN && (
                        <Button variant="primary" className="w-full sm:w-auto" onClick={() => navigate('/requests/new')}>
                            + New Request
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

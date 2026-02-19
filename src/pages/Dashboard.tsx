import { useEffect, useState } from 'react';
import { Wallet, FileClock, ShoppingBag, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/dashboard/StatCard';
import { BudgetTracker } from '../components/dashboard/BudgetTracker';
import { RequestBreakdown } from '../components/dashboard/RequestBreakdown';
import { Button } from '../components/ui/Button';
import { DashboardSkeleton } from '../components/skeletons/DashboardSkeleton';
import { reportsApi } from '../services/reports.service';
import { requestsApi } from '../services/requests.service';
import { departmentsApi, type Department } from '../services/departments.service';
import type { KPIMetrics, PurchaseRequest } from '../types/api';
import { isPaginatedResponse } from '../types/pagination';
import { getDateAndTime } from '../utils/dateFormat';
import { getCategorySpendTotals, getTotalSpend } from '../data/financialDataHelpers';

export default function Dashboard() {
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState<KPIMetrics | null>(null);
    const [recentRequests, setRecentRequests] = useState<PurchaseRequest[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);

    // Hardcoded financial data for department spend (2025)
    const hardcodedDepartmentSpend = getCategorySpendTotals(2025);
    const hardcodedTotalSpend = getTotalSpend(2025);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [kpiData, departmentsData] = await Promise.all([
                    reportsApi.getKPIs(),
                    departmentsApi.getAll(),
                ]);

                // TODO: Uncomment below to use API data instead of hardcoded data
                // setMetrics(kpiData);

                // Using hardcoded financial data for department spend
                setMetrics({
                    ...kpiData,
                    departmentSpend: hardcodedDepartmentSpend,
                    totalSpend: hardcodedTotalSpend,
                });
                setDepartments(departmentsData);

                const response = await requestsApi.getAll();
                const allRequests = isPaginatedResponse(response) ? response.data : response;
                setRecentRequests(allRequests.slice(0, 5)); // Show only 5 most recent
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="space-y-6">
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
                        departments={departments}
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
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <Button variant="primary" className="w-full sm:w-auto" onClick={() => navigate('/requests/new')}>
                        + New Request
                    </Button>
                </div>
            </div>
        </div>
    );
}

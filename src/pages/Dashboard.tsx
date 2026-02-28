import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Wallet,
    FileClock,
    ShoppingBag,
    TrendingUp,
    Calendar,
    X,
    Filter,
    ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BudgetTracker } from '../components/dashboard/BudgetTracker';
import { RequestBreakdown } from '../components/dashboard/RequestBreakdown';
import { StrategicSourcing } from '../components/dashboard/StrategicSourcing';
import { Button } from '../components/ui/Button';
import { DatePicker } from '../components/ui/DatePicker';
import { DashboardSkeleton } from '../components/skeletons/DashboardSkeleton';
import { reportsApi } from '../services/reports.service';
import { requestsApi } from '../services/requests.service';
import { departmentsApi, type Department } from '../services/departments.service';
import type { KPIMetrics, PurchaseRequest } from '../types/api';
import { isPaginatedResponse } from '../types/pagination';
import { getDateAndTime } from '../utils/dateFormat';
import { getCategorySpendTotals, getLatestMonthRange, getTotalSpend } from '../data/financialDataHelpers';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/api';

const formatCurrency = (value: number) =>
    `£${Number(value || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

const formatRangeLabel = (range: { start?: string; end?: string }) => {
    if (!range.start && !range.end) return 'All Time';

    const startLabel = range.start ? new Date(range.start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Beginning';
    const endLabel = range.end ? new Date(range.end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today';

    return `${startLabel} - ${endLabel}`;
};

const getStatusClasses = (status: string) => {
    switch (status) {
        case 'APPROVED':
            return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
        case 'PENDING':
            return 'border border-amber-200 bg-amber-50 text-amber-700';
        case 'REJECTED':
            return 'border border-rose-200 bg-rose-50 text-rose-700';
        case 'IN_PROGRESS':
            return 'border border-sky-200 bg-sky-50 text-sky-700';
        default:
            return 'border border-gray-200 bg-gray-100 text-gray-700';
    }
};

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [metrics, setMetrics] = useState<KPIMetrics | null>(null);
    const [recentRequests, setRecentRequests] = useState<PurchaseRequest[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [activeDateRange, setActiveDateRange] = useState<{ start?: string; end?: string }>(getLatestMonthRange);
    const datePickerRef = useRef<HTMLDivElement>(null);

    const userRole = user?.role;
    const isRestrictedRole = userRole === UserRole.MANAGER || userRole === UserRole.SENIOR_MANAGER;

    const departmentName = typeof user?.department === 'string'
        ? user.department
        : user?.department?.name;

    const departmentFilter = isRestrictedRole && departmentName ? departmentName : undefined;

    const filteredDepartments = useMemo(() => {
        if (departmentFilter) {
            return departments.filter((department) => department.name.toLowerCase() === departmentFilter.toLowerCase());
        }
        return departments;
    }, [departments, departmentFilter]);

    const loadDashboard = useCallback(async (startDate?: string, endDate?: string) => {
        try {
            setLoading(true);

            const [kpiData, departmentsData] = await Promise.all([
                reportsApi.getKPIs(startDate, endDate),
                departmentsApi.getAll(),
            ]);

            const dateRangeOpt = (startDate || endDate) ? { start: startDate, end: endDate } : undefined;
            const hardcodedDepartmentSpend = getCategorySpendTotals(dateRangeOpt, departmentFilter);
            const hardcodedTotalSpend = getTotalSpend(dateRangeOpt, departmentFilter);

            setMetrics({
                ...kpiData,
                departmentSpend: hardcodedDepartmentSpend,
                totalSpend: hardcodedTotalSpend,
            });
            setDepartments(departmentsData);

            const response = await requestsApi.getAll();
            const allRequests = isPaginatedResponse(response) ? response.data : response;
            setRecentRequests(allRequests.slice(0, 6));
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }, [departmentFilter]);

    useEffect(() => {
        const { start, end } = getLatestMonthRange();
        setActiveDateRange({ start, end });
        void loadDashboard(start, end);
    }, [loadDashboard]);

    useEffect(() => {
        if (!showDatePicker) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setShowDatePicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDatePicker]);

    const applyRollingDateRange = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);

        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        setDateRange({ start: '', end: '' });
        setActiveDateRange({ start: startStr, end: endStr });
        setShowDatePicker(false);
        void loadDashboard(startStr, endStr);
    };

    const applyYearToDate = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);

        const startStr = start.toISOString().split('T')[0];
        const endStr = now.toISOString().split('T')[0];

        setDateRange({ start: '', end: '' });
        setActiveDateRange({ start: startStr, end: endStr });
        setShowDatePicker(false);
        void loadDashboard(startStr, endStr);
    };

    const applyCustomDateRange = () => {
        if (!dateRange.start || !dateRange.end) return;

        setActiveDateRange({ start: dateRange.start, end: dateRange.end });
        setShowDatePicker(false);
        void loadDashboard(dateRange.start, dateRange.end);
    };

    const clearDateRange = () => {
        setDateRange({ start: '', end: '' });
        setActiveDateRange({});
        setShowDatePicker(false);
        void loadDashboard();
    };

    const kpi = useMemo(() => {
        const totalRequests = metrics?.totalRequests ?? 0;
        const approvedRequests = metrics?.approvedRequests ?? 0;
        const approvalRate = totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0;

        return {
            totalSpend: metrics?.totalSpend ?? 0,
            pendingRequests: metrics?.pendingRequests ?? 0,
            totalOrders: metrics?.totalOrders ?? 0,
            approvedRequests,
            rejectedRequests: metrics?.rejectedRequests ?? 0,
            totalRequests,
            approvalRate,
        };
    }, [metrics]);

    const headerCards = [
        {
            title: 'Total Spend',
            value: formatCurrency(kpi.totalSpend),
            caption: `${kpi.totalOrders} orders in selected range`,
            icon: Wallet,
            iconClass: 'bg-primary-100 text-primary-700',
            valueClass: 'text-gray-900',
        },
        {
            title: 'Pending Approvals',
            value: kpi.pendingRequests.toString(),
            caption: `${kpi.totalRequests} total requests`,
            icon: FileClock,
            iconClass: 'bg-amber-100 text-amber-700',
            valueClass: 'text-amber-700',
        },
        {
            title: 'Active POs',
            value: kpi.totalOrders.toString(),
            caption: 'Purchase orders created',
            icon: ShoppingBag,
            iconClass: 'bg-emerald-100 text-emerald-700',
            valueClass: 'text-emerald-700',
        },
        {
            title: 'Approval Rate',
            value: `${kpi.approvalRate}%`,
            caption: `${kpi.rejectedRequests} rejected`,
            icon: TrendingUp,
            iconClass: 'bg-violet-100 text-violet-700',
            valueClass: 'text-violet-700',
        },
    ];

    if (loading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="space-y-6">
            <section className="relative rounded-2xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/60 to-accent-50/70 p-6 shadow-sm">
                <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary-200/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-accent-200/50 blur-3xl" />

                <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700">Executive Overview</p>
                        <h1 className="mt-2 text-3xl font-bold text-gray-900">Dashboard</h1>
                        <p className="mt-2 max-w-2xl text-sm text-gray-600">
                            Monitor spend, approvals, and operational flow across procurement in one real-time workspace.
                        </p>
                        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 px-3 py-1 text-xs font-medium text-primary-700">
                            <Filter className="h-3.5 w-3.5" />
                            {formatRangeLabel(activeDateRange)}
                        </div>
                    </div>

                    <div ref={datePickerRef} className="relative flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setShowDatePicker((prev) => !prev)} className="border-white/70 bg-white/90 backdrop-blur">
                            <Calendar className="mr-2 h-4 w-4" /> Date Range
                        </Button>
                        <Button variant="outline" onClick={() => navigate('/reports')} className="border-white/70 bg-white/90 backdrop-blur">
                            Reports <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        {user?.role !== UserRole.SYSTEM_ADMIN && (
                            <Button onClick={() => navigate('/requests/new')} className="bg-primary-700 hover:bg-primary-800">
                                + New Request
                            </Button>
                        )}

                        {showDatePicker && (
                            <div className="absolute right-0 top-full z-[120] mt-2 w-[22rem] rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-900">Filter by Date</h3>
                                    <button onClick={() => setShowDatePicker(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => applyRollingDateRange(7)} className="rounded-lg border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:border-primary-200 hover:bg-primary-50">Last 7 days</button>
                                    <button onClick={() => applyRollingDateRange(30)} className="rounded-lg border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:border-primary-200 hover:bg-primary-50">Last 30 days</button>
                                    <button onClick={() => applyRollingDateRange(90)} className="rounded-lg border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:border-primary-200 hover:bg-primary-50">Last 90 days</button>
                                    <button onClick={applyYearToDate} className="rounded-lg border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:border-primary-200 hover:bg-primary-50">Year to date</button>
                                </div>

                                <div className="mt-4 border-t border-gray-100 pt-4">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Custom Range</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <DatePicker
                                            value={dateRange.start}
                                            onChange={(value) => setDateRange((prev) => ({ ...prev, start: value }))}
                                            placeholder="Start"
                                            className="w-full text-sm"
                                        />
                                        <DatePicker
                                            value={dateRange.end}
                                            onChange={(value) => setDateRange((prev) => ({ ...prev, end: value }))}
                                            placeholder="End"
                                            className="w-full text-sm"
                                        />
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        <Button size="sm" variant="outline" onClick={clearDateRange}>Clear</Button>
                                        <Button size="sm" onClick={applyCustomDateRange} disabled={!dateRange.start || !dateRange.end}>Apply</Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {headerCards.map((card) => (
                        <article key={card.title} className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{card.title}</p>
                                    <p className={`mt-2 text-2xl font-bold ${card.valueClass}`}>{card.value}</p>
                                    <p className="mt-1 text-xs text-gray-500">{card.caption}</p>
                                </div>
                                <div className={`rounded-lg p-2 ${card.iconClass}`}>
                                    <card.icon className="h-5 w-5" />
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2">
                    <BudgetTracker
                        departmentSpend={metrics?.departmentSpend}
                        departments={filteredDepartments}
                        dateRange={activeDateRange}
                    />
                </div>

                <div className="space-y-6">
                    <RequestBreakdown metrics={metrics || undefined} />
                    <StrategicSourcing />
                </div>
            </div>

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Recent Purchase Requests</h3>
                        <p className="text-sm text-gray-500">Most recent requisitions requiring visibility or action.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate('/requests')}>View All Requests</Button>
                </div>

                {recentRequests.length === 0 ? (
                    <div className="px-6 py-14 text-center">
                        <p className="text-sm text-gray-500">No recent requests found.</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden lg:block">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[900px] text-left text-sm">
                                    <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Request</th>
                                            <th className="px-6 py-3 font-semibold">Requester</th>
                                            <th className="px-6 py-3 font-semibold">Amount</th>
                                            <th className="px-6 py-3 font-semibold">Status</th>
                                            <th className="px-6 py-3 font-semibold">Submitted</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {recentRequests.map((request) => {
                                            const { date, time } = getDateAndTime(request.createdAt);
                                            return (
                                                <tr
                                                    key={request.id}
                                                    className="cursor-pointer bg-white transition hover:bg-primary-50/30"
                                                    onClick={() => navigate(`/requests/${request.id}`)}
                                                >
                                                    <td className="px-6 py-4">
                                                        <p className="font-semibold text-primary-700">#{request.id.slice(0, 8)}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-medium text-gray-900">{request.requester?.name || 'Unknown'}</p>
                                                        <p className="text-xs text-gray-500">{request.requester?.email || 'No email'}</p>
                                                    </td>
                                                    <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(Number(request.totalAmount))}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(request.status)}`}>
                                                            {request.status.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-medium text-gray-900">{date}</p>
                                                        <p className="text-xs text-gray-500">{time}</p>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="space-y-3 p-4 lg:hidden">
                            {recentRequests.map((request) => {
                                const { date, time } = getDateAndTime(request.createdAt);
                                return (
                                    <article
                                        key={request.id}
                                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                                        onClick={() => navigate(`/requests/${request.id}`)}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm font-semibold text-primary-700">#{request.id.slice(0, 8)}</p>
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(request.status)}`}>
                                                {request.status.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm font-medium text-gray-900">{request.requester?.name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500">{request.requester?.email || 'No email'}</p>
                                        <div className="mt-3 flex items-end justify-between">
                                            <p className="text-base font-semibold text-gray-900">{formatCurrency(Number(request.totalAmount))}</p>
                                            <p className="text-xs text-gray-500">{date} {time}</p>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

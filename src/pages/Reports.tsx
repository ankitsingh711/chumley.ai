import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { pdfService } from '../services/pdf.service';
import {
    Download,
    Calendar,
    Filter,
    Check,
    ChevronDown,
    FileText,
    BarChart3,
    Wallet,
    Clock3,
    ShieldCheck,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { DateRangeFilterPopover } from '../components/filters/DateRangeFilterPopover';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { reportsApi } from '../services/reports.service';
import { requestsApi } from '../services/requests.service';
import { ReportsSkeleton } from '../components/skeletons/ReportsSkeleton';
import type { KPIMetrics, MonthlySpendData, PurchaseRequest, RequestStatus as RequestStatusType } from '../types/api';
import { RequestStatus } from '../types/api';
import { isPaginatedResponse } from '../types/pagination';
import { formatDateTime, getDateAndTime } from '../utils/dateFormat';
import { normalizeDepartmentName } from '../utils/departments';

type TransactionFilter = 'ALL' | RequestStatusType;

const CANONICAL_DEPARTMENTS = [
    'Tech',
    'Marketing',
    'Support',
    'Finance',
    'HR&Recruitments',
    'Sector Group',
    'Trade Group',
    'Fleet&Assets',
] as const;

type CanonicalDepartment = (typeof CANONICAL_DEPARTMENTS)[number];

const MONTHLY_DEPARTMENT_BUDGETS: Record<CanonicalDepartment, number> = {
    Tech: 135000,
    Marketing: 350000,
    Support: 300000,
    Finance: 40000,
    'HR&Recruitments': 10000,
    'Sector Group': 100000,
    'Trade Group': 100000,
    'Fleet&Assets': 200000,
};

const DEPARTMENT_COLORS: Record<string, string> = {
    Tech: '#38bdf8',
    Marketing: '#f97316',
    Support: '#f43f5e',
    Finance: '#84cc16',
    'HR&Recruitments': '#22c55e',
    'Sector Group': '#eab308',
    'Trade Group': '#34d399',
    'Fleet&Assets': '#a855f7',
    Unassigned: '#cbd5e1',
};

const FALLBACK_COLORS = ['#6366f1', '#f43f5e', '#06b6d4', '#10b981', '#f59e0b', '#d946ef'];
const DEPARTMENT_PRIORITY: Record<string, number> = {
    Marketing: 1,
    'Trade Group': 2,
    'Sector Group': 3,
    Support: 4,
    'HR&Recruitments': 5,
    'Fleet&Assets': 6,
    Finance: 7,
    Tech: 8,
};

const formatCurrency = (value: number) =>
    `£${Number(value || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

const formatCurrencyDetailed = (value: number) =>
    `£${Number(value || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatCurrencyAxisTick = (value: number) => {
    if (!value) return '£0';
    if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `£${Math.round(value / 1000)}k`;
    return `£${Math.round(value)}`;
};

const formatMonthTick = (value: string) => {
    const [month, year] = value.split(' ');
    if (!month || !year || year.length < 4) return value;
    return `${month} ${year.slice(-2)}`;
};

const formatDepartmentLabel = (department: string) => department;

const isCanonicalDepartment = (value: string): value is CanonicalDepartment =>
    (CANONICAL_DEPARTMENTS as readonly string[]).includes(value);

const getRequestDepartmentLabel = (request: PurchaseRequest) => {
    const rawDepartment = typeof request.requester?.department === 'string'
        ? request.requester.department
        : request.requester?.department?.name;

    return normalizeDepartmentName(rawDepartment) || rawDepartment || 'N/A';
};

const formatRangeLabel = (start?: string, end?: string) => {
    if (!start && !end) return 'All Time';
    const startLabel = start ? new Date(start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Beginning';
    const endLabel = end ? new Date(end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today';
    return `${startLabel} - ${endLabel}`;
};

const getStatusClasses = (status: RequestStatusType) => {
    switch (status) {
        case RequestStatus.APPROVED:
            return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
        case RequestStatus.PENDING:
            return 'border border-amber-200 bg-amber-50 text-amber-700';
        case RequestStatus.IN_PROGRESS:
            return 'border border-sky-200 bg-sky-50 text-sky-700';
        case RequestStatus.REJECTED:
            return 'border border-rose-200 bg-rose-50 text-rose-700';
        default:
            return 'border border-gray-200 bg-gray-100 text-gray-700';
    }
};

export default function Reports() {
    const [metrics, setMetrics] = useState<KPIMetrics | null>(null);
    const [spendData, setSpendData] = useState<MonthlySpendData[]>([]);
    const [allRequests, setAllRequests] = useState<PurchaseRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const defaultEnd = new Date();
    const defaultStart = new Date();
    defaultStart.setMonth(defaultStart.getMonth() - 5);
    const defaultStartStr = defaultStart.toISOString().split('T')[0];
    const defaultEndStr = defaultEnd.toISOString().split('T')[0];

    const [dateRange, setDateRange] = useState({ start: defaultStartStr, end: defaultEndStr });
    const [activeDateRange, setActiveDateRange] = useState<{ start?: string; end?: string }>({ start: defaultStartStr, end: defaultEndStr });

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('ALL');
    const [showTransactionFilter, setShowTransactionFilter] = useState(false);

    const dateFilterAnchorRef = useRef<HTMLDivElement>(null);
    const transactionFilterRef = useRef<HTMLDivElement>(null);
    const transactionFilterButtonRef = useRef<HTMLButtonElement>(null);
    const transactionFilterMenuRef = useRef<HTMLDivElement>(null);
    const [transactionFilterPosition, setTransactionFilterPosition] = useState({
        top: 0,
        left: 0,
        width: 0,
    });

    const updateTransactionFilterPosition = () => {
        const trigger = transactionFilterButtonRef.current;
        if (!trigger) return;

        const MENU_WIDTH = 320;
        const VIEWPORT_PADDING = 12;
        const ESTIMATED_MENU_HEIGHT = 336;
        const GAP = 10;

        const rect = trigger.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const resolvedWidth = Math.max(rect.width, MENU_WIDTH);

        const left = Math.max(
            VIEWPORT_PADDING,
            Math.min(rect.right - resolvedWidth, viewportWidth - VIEWPORT_PADDING - resolvedWidth),
        );

        const openUpward = rect.bottom + GAP + ESTIMATED_MENU_HEIGHT > viewportHeight - VIEWPORT_PADDING
            && rect.top - GAP - ESTIMATED_MENU_HEIGHT > VIEWPORT_PADDING;
        const top = openUpward
            ? rect.top - GAP - ESTIMATED_MENU_HEIGHT
            : rect.bottom + GAP;

        setTransactionFilterPosition({
            top: Math.max(VIEWPORT_PADDING, top),
            left,
            width: resolvedWidth,
        });
    };

    useEffect(() => {
        void loadData(defaultStartStr, defaultEndStr);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!showTransactionFilter) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedInsideTrigger = transactionFilterRef.current?.contains(target);
            const clickedInsideMenu = transactionFilterMenuRef.current?.contains(target);
            if (!clickedInsideTrigger && !clickedInsideMenu) {
                setShowTransactionFilter(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showTransactionFilter]);

    useEffect(() => {
        if (!showTransactionFilter) return;

        updateTransactionFilterPosition();

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowTransactionFilter(false);
            }
        };

        const handlePositionSync = () => updateTransactionFilterPosition();

        document.addEventListener('keydown', handleEscape);
        window.addEventListener('resize', handlePositionSync);
        window.addEventListener('scroll', handlePositionSync, true);

        return () => {
            document.removeEventListener('keydown', handleEscape);
            window.removeEventListener('resize', handlePositionSync);
            window.removeEventListener('scroll', handlePositionSync, true);
        };
    }, [showTransactionFilter]);

    const loadData = async (startDate?: string, endDate?: string) => {
        try {
            setLoading(true);
            const [kpiData, monthlyData, requestsResponse] = await Promise.all([
                reportsApi.getKPIs(startDate, endDate),
                reportsApi.getMonthlySpend(startDate, endDate),
                requestsApi.getAll(),
            ]);

            const requestsData: PurchaseRequest[] = isPaginatedResponse(requestsResponse)
                ? requestsResponse.data
                : requestsResponse;

            setMetrics(kpiData);
            setSpendData(monthlyData);
            setAllRequests(requestsData);
        } catch (error) {
            console.error('Failed to load reports data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRollingRange = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);

        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
        };
    };

    const getYearToDateRange = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);

        return {
            start: start.toISOString().split('T')[0],
            end: now.toISOString().split('T')[0],
        };
    };

    const applyDateRange = (range: { start: string; end: string }) => {
        setDateRange(range);
        setActiveDateRange(range);
        setShowDatePicker(false);
        void loadData(range.start, range.end);
    };

    const clearDateRange = () => {
        setDateRange({ start: defaultStartStr, end: defaultEndStr });
        setActiveDateRange({ start: defaultStartStr, end: defaultEndStr });
        setShowDatePicker(false);
        void loadData(defaultStartStr, defaultEndStr);
    };

    const dateRangePresets = [
        { id: 'last_7', label: 'Last 7 days', helperText: 'Rolling week', range: getRollingRange(7) },
        { id: 'last_30', label: 'Last 30 days', helperText: 'Rolling month', range: getRollingRange(30) },
        { id: 'last_90', label: 'Last 90 days', helperText: 'Rolling quarter', range: getRollingRange(90) },
        { id: 'last_6_months', label: 'Last 6 months', helperText: 'Rolling 180 days', range: getRollingRange(180) },
        { id: 'ytd', label: 'Year to date', helperText: 'Since Jan 1', range: getYearToDateRange() },
    ];

    const departments = useMemo<CanonicalDepartment[]>(() => [...CANONICAL_DEPARTMENTS], []);

    const sortedDepartments = useMemo(() => {
        return [...departments].sort((a, b) => {
            const priorityA = DEPARTMENT_PRIORITY[a] ?? 999;
            const priorityB = DEPARTMENT_PRIORITY[b] ?? 999;
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            return a.localeCompare(b);
        });
    }, [departments]);

    const budgetChartData = useMemo(() => {
        return spendData.map((entry) => ({
            month: entry.month,
            spend: Number(entry.spend || 0),
            ...MONTHLY_DEPARTMENT_BUDGETS,
        }));
    }, [spendData]);

    const monthlyBudgetTotal = useMemo(
        () => sortedDepartments.reduce((sum, department) => sum + MONTHLY_DEPARTMENT_BUDGETS[department], 0),
        [sortedDepartments],
    );

    const yAxisMax = useMemo(() => {
        const maxSpend = spendData.reduce((currentMax, row) => Math.max(currentMax, Number(row.spend || 0)), 0);
        const maxValue = Math.max(maxSpend, monthlyBudgetTotal, 1000000);
        return Math.ceil(maxValue / 100000) * 100000;
    }, [monthlyBudgetTotal, spendData]);

    const yAxisTicks = useMemo(() => {
        const raw = [0, yAxisMax * 0.25, yAxisMax * 0.5, yAxisMax]
            .map((value) => Math.round(value / 10000) * 10000);
        return Array.from(new Set(raw)).sort((a, b) => a - b);
    }, [yAxisMax]);

    const renderMonthlySpendTooltip = ({
        active,
        payload,
        label,
    }: {
        active?: boolean;
        payload?: ReadonlyArray<{
            name?: string;
            value?: string | number;
            color?: string;
            dataKey?: string | number;
        }>;
        label?: string | number;
    }) => {
        if (!active || !payload || payload.length === 0) {
            return null;
        }

        const spendSeries = payload.find((entry) => entry.dataKey === 'spend');
        const totalSpend = Number(spendSeries?.value || 0);

        const rows = payload
            .filter((entry) => {
                if (!entry.dataKey || entry.dataKey === 'spend') return false;
                return isCanonicalDepartment(String(entry.dataKey));
            })
            .map((entry) => ({
                key: String(entry.dataKey),
                label: formatDepartmentLabel(String(entry.dataKey)),
                value: Number(entry.value || 0),
                color: entry.color || DEPARTMENT_COLORS[String(entry.dataKey)] || '#64748b',
            }))
            .filter((entry) => entry.value > 0)
            .sort((a, b) => {
                const rankA = DEPARTMENT_PRIORITY[a.key] ?? 999;
                const rankB = DEPARTMENT_PRIORITY[b.key] ?? 999;
                if (rankA !== rankB) return rankA - rankB;
                return b.value - a.value;
            });

        const totalBudget = rows.reduce((sum, row) => sum + row.value, 0);

        return (
            <div className="min-w-[260px] rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.65)] backdrop-blur">
                <p className="text-sm font-semibold text-slate-500">{formatMonthTick(String(label ?? ''))}</p>
                <p className="mt-2 text-lg font-bold text-slate-700">
                    Spend: {formatCurrencyDetailed(totalSpend)}
                </p>
                <p className="mt-2 border-t border-slate-200 pt-2 text-xl font-bold text-slate-900">
                    Total Budget: {formatCurrencyDetailed(totalBudget)}
                </p>
                <div className="mt-3 space-y-1.5">
                    {rows.map((entry) => (
                        <div key={entry.key} className="flex items-center justify-between gap-4 text-base font-semibold">
                            <span style={{ color: entry.color }}>{entry.label}:</span>
                            <span style={{ color: entry.color }}>{formatCurrencyDetailed(entry.value)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const filteredTransactions = useMemo(() => {
        return allRequests
            .filter((request) => transactionFilter === 'ALL' || request.status === transactionFilter)
            .slice(0, 10);
    }, [allRequests, transactionFilter]);

    const transactionFilterOptions = useMemo(
        () => (['ALL', ...Object.values(RequestStatus)] as TransactionFilter[]),
        []
    );

    const transactionFilterCounts = useMemo(() => {
        const counts: Record<string, number> = { ALL: allRequests.length };
        Object.values(RequestStatus).forEach((status) => {
            counts[status] = 0;
        });
        allRequests.forEach((request) => {
            counts[request.status] = (counts[request.status] ?? 0) + 1;
        });
        return counts;
    }, [allRequests]);

    const getTransactionFilterLabel = (status: TransactionFilter) =>
        status === 'ALL' ? 'All Transactions' : status.replace(/_/g, ' ');

    const getTransactionFilterMeta = (status: TransactionFilter) => {
        if (status === 'ALL') {
            return {
                dotClassName: 'bg-slate-500',
                badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
                description: 'Include every request status in results',
            };
        }

        switch (status) {
            case RequestStatus.APPROVED:
                return {
                    dotClassName: 'bg-emerald-500',
                    badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
                    description: 'Requests approved for purchasing',
                };
            case RequestStatus.PENDING:
                return {
                    dotClassName: 'bg-amber-500',
                    badgeClassName: 'border-amber-200 bg-amber-50 text-amber-700',
                    description: 'Awaiting manager or admin review',
                };
            case RequestStatus.IN_PROGRESS:
                return {
                    dotClassName: 'bg-sky-500',
                    badgeClassName: 'border-sky-200 bg-sky-50 text-sky-700',
                    description: 'Currently in processing pipeline',
                };
            case RequestStatus.REJECTED:
                return {
                    dotClassName: 'bg-rose-500',
                    badgeClassName: 'border-rose-200 bg-rose-50 text-rose-700',
                    description: 'Declined requests and exceptions',
                };
            default:
                return {
                    dotClassName: 'bg-slate-500',
                    badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
                    description: 'Filtered status',
                };
        }
    };

    const kpi = useMemo(() => {
        const totalRequests = metrics?.totalRequests ?? 0;
        const approvedRequests = metrics?.approvedRequests ?? 0;
        const rejectedRequests = metrics?.rejectedRequests ?? 0;
        const pendingRequests = metrics?.pendingRequests ?? 0;
        const approvalRate = totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0;

        return {
            totalSpend: metrics?.totalSpend ?? 0,
            totalRequests,
            approvedRequests,
            rejectedRequests,
            pendingRequests,
            totalOrders: metrics?.totalOrders ?? 0,
            avgProcessingTime: metrics?.avgProcessingTime ?? 0,
            approvalRate,
        };
    }, [metrics]);

    const breakdownData = useMemo(() => {
        return [
            { name: 'Approved', value: kpi.approvedRequests, color: '#10b981' },
            { name: 'Pending', value: kpi.pendingRequests, color: '#f59e0b' },
            { name: 'Rejected', value: kpi.rejectedRequests, color: '#ef4444' },
        ];
    }, [kpi.approvedRequests, kpi.pendingRequests, kpi.rejectedRequests]);

    const handleExportData = async () => {
        try {
            const response = await requestsApi.getAll();
            const requestsData: PurchaseRequest[] = isPaginatedResponse(response) ? response.data : response;

            const headers = ['ID', 'Date', 'Requester', 'Department', 'Amount', 'Status'];
            const rows = requestsData.map((request) => [
                request.id.slice(0, 8),
                formatDateTime(request.createdAt),
                request.requester?.name || 'Unknown',
                getRequestDepartmentLabel(request),
                request.totalAmount,
                request.status.replace(/_/g, ' '),
            ]);

            const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

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
            const requestsData: PurchaseRequest[] = isPaginatedResponse(response) ? response.data : response;

            const headers = ['ID', 'Date', 'Requester', 'Department', 'Amount', 'Status'];
            const rows = requestsData.map((request) => [
                request.id.slice(0, 8),
                formatDateTime(request.createdAt),
                request.requester?.name || 'Unknown',
                getRequestDepartmentLabel(request),
                formatCurrency(Number(request.totalAmount)),
                request.status.replace(/_/g, ' '),
            ]);

            pdfService.exportToPDF('Procurement Reports', headers, rows, 'procurement_report');
        } catch (error) {
            console.error('PDF Export failed:', error);
            alert('Failed to export PDF');
        }
    };

    if (loading) {
        return <ReportsSkeleton />;
    }

    return (
        <div className="space-y-6">
            <section className="relative rounded-2xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/60 to-accent-50/70 p-6 shadow-sm">
                <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary-200/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-accent-200/50 blur-3xl" />

                <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700">Insights Workspace</p>
                        <h1 className="mt-2 text-3xl font-bold text-gray-900">Reports & Analytics</h1>
                        <p className="mt-2 max-w-2xl text-sm text-gray-600">
                            Understand procurement spend, approval performance, and transaction quality with a single source of truth.
                        </p>
                        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 px-3 py-1 text-xs font-medium text-primary-700">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatRangeLabel(activeDateRange.start, activeDateRange.end)}
                        </div>
                    </div>

                    <div className="relative flex flex-wrap gap-2">
                        <div ref={dateFilterAnchorRef}>
                            <Button variant="outline" onClick={() => setShowDatePicker((prev) => !prev)} className="border-white/70 bg-white/90 backdrop-blur">
                                <Calendar className="mr-2 h-4 w-4" /> Date Range
                            </Button>
                        </div>
                        <Button variant="outline" onClick={handleExportData} className="border-white/70 bg-white/90 backdrop-blur">
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                        <Button variant="outline" onClick={handleExportPDF} className="border-white/70 bg-white/90 backdrop-blur">
                            <FileText className="mr-2 h-4 w-4" /> Export PDF
                        </Button>
                    </div>
                </div>

                <DateRangeFilterPopover
                    isOpen={showDatePicker}
                    anchorRef={dateFilterAnchorRef}
                    activeRange={activeDateRange}
                    draftRange={dateRange}
                    onDraftRangeChange={setDateRange}
                    onApply={applyDateRange}
                    onClear={clearDateRange}
                    onClose={() => setShowDatePicker(false)}
                    presets={dateRangePresets}
                    clearLabel="Reset"
                    applyLabel="Apply"
                />

                <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Total Spend
                            <Wallet className="h-4 w-4 text-primary-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(kpi.totalSpend)}</p>
                        <p className="mt-1 text-xs text-gray-500">Across selected period</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Total Requests
                            <BarChart3 className="h-4 w-4 text-primary-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{kpi.totalRequests}</p>
                        <p className="mt-1 text-xs text-gray-500">Procurement requests recorded</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Avg Processing
                            <Clock3 className="h-4 w-4 text-amber-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-amber-700">{kpi.avgProcessingTime.toFixed(1)} days</p>
                        <p className="mt-1 text-xs text-gray-500">Request approval cycle</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                            Approval Rate
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-emerald-700">{kpi.approvalRate}%</p>
                        <p className="mt-1 text-xs text-gray-500">{kpi.rejectedRequests} rejected in range</p>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <section className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Monthly Spend Trends</h3>
                            <p className="text-sm text-gray-500">Department monthly budgets in color, with actual spend as the grey trend line.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                                {spendData.length} months
                            </span>
                            <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                Monthly Budget Total: {formatCurrency(monthlyBudgetTotal)}
                            </span>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                        <div className="h-[430px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={budgetChartData} margin={{ top: 8, right: 12, left: 8, bottom: 18 }}>
                                    <defs>
                                        <linearGradient id="colorTotalSpend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="4%" stopColor="#94a3b8" stopOpacity={0.38} />
                                            <stop offset="96%" stopColor="#94a3b8" stopOpacity={0.04} />
                                        </linearGradient>
                                        {sortedDepartments.map((department, index) => {
                                            const color = DEPARTMENT_COLORS[department] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
                                            return (
                                                <linearGradient key={department} id={`color${department.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="8%" stopColor={color} stopOpacity={0.72} />
                                                    <stop offset="98%" stopColor={color} stopOpacity={0.22} />
                                                </linearGradient>
                                            );
                                        })}
                                    </defs>

                                    <CartesianGrid strokeDasharray="3 4" stroke="#dbe3ee" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={{ stroke: '#cbd5e1' }}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        tickFormatter={formatMonthTick}
                                        angle={-42}
                                        textAnchor="end"
                                        height={64}
                                        interval={0}
                                    />
                                    <YAxis
                                        axisLine={{ stroke: '#cbd5e1' }}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        tickFormatter={formatCurrencyAxisTick}
                                        domain={[0, yAxisMax]}
                                        ticks={yAxisTicks}
                                    />
                                    <Tooltip
                                        cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }}
                                        content={renderMonthlySpendTooltip}
                                    />

                                    <Area
                                        type="monotone"
                                        dataKey="spend"
                                        stroke="#64748b"
                                        strokeWidth={2.5}
                                        fill="url(#colorTotalSpend)"
                                        fillOpacity={1}
                                        dot={false}
                                        activeDot={{ r: 5, fill: '#64748b', stroke: '#ffffff', strokeWidth: 2 }}
                                    />

                                    {sortedDepartments.map((department, index) => {
                                        const color = DEPARTMENT_COLORS[department] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
                                        return (
                                            <Area
                                                key={department}
                                                type="monotone"
                                                dataKey={department}
                                                stackId="stacked"
                                                stroke={color}
                                                strokeWidth={1.6}
                                                fillOpacity={1}
                                                fill={`url(#color${department.replace(/[^a-zA-Z0-9]/g, '')})`}
                                                dot={false}
                                                activeDot={false}
                                            />
                                        );
                                    })}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                        {sortedDepartments.map((department, index) => {
                            const color = DEPARTMENT_COLORS[department] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];

                            return (
                                <div
                                    key={`legend-${department}`}
                                    className="inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-sm font-semibold"
                                >
                                    <span
                                        className="h-2.5 w-2.5 rounded-full border border-white shadow-sm"
                                        style={{
                                            backgroundColor: color,
                                        }}
                                    />
                                    <span
                                        style={{
                                            color,
                                        }}
                                    >
                                        {formatDepartmentLabel(department)}
                                    </span>
                                    <span className="text-slate-500">
                                        {formatCurrency(MONTHLY_DEPARTMENT_BUDGETS[department])}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Request Mix</h3>
                            <p className="text-sm text-gray-500">Distribution by current status.</p>
                        </div>
                        <span className="whitespace-nowrap rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                            {kpi.totalRequests} total
                        </span>
                    </div>

                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={breakdownData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={58}
                                    outerRadius={82}
                                    dataKey="value"
                                    strokeWidth={0}
                                >
                                    {breakdownData.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-2">
                        {breakdownData.map((item) => {
                            const percentage = kpi.totalRequests > 0 ? Math.round((item.value / kpi.totalRequests) * 100) : 0;
                            return (
                                <div key={item.name} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                                    <div className="mb-1 flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-gray-700">{item.name}</span>
                                        </div>
                                        <span className="font-semibold text-gray-900">{item.value}</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-gray-200">
                                        <div
                                            className="h-full rounded-full"
                                            style={{ width: `${Math.max(percentage, item.value > 0 ? 5 : 0)}%`, backgroundColor: item.color }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                        <p className="text-sm text-gray-500">Latest requests in the selected date range.</p>
                    </div>

                    <div ref={transactionFilterRef}>
                        <button
                            ref={transactionFilterButtonRef}
                            type="button"
                            onClick={() => {
                                setShowTransactionFilter((prev) => {
                                    const next = !prev;
                                    if (next) {
                                        updateTransactionFilterPosition();
                                    }
                                    return next;
                                });
                            }}
                            className={`group flex min-h-[42px] items-center gap-2.5 rounded-2xl border px-3.5 py-2 text-left text-sm transition-all ${transactionFilter !== 'ALL'
                                ? 'border-primary-200 bg-primary-50/80 text-primary-800 shadow-[0_12px_24px_-20px_rgba(37,99,235,0.6)]'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            aria-expanded={showTransactionFilter}
                            aria-haspopup="listbox"
                        >
                            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-xl border ${transactionFilter !== 'ALL'
                                ? 'border-primary-200 bg-white text-primary-700'
                                : 'border-gray-200 bg-gray-50 text-gray-500 group-hover:text-gray-700'
                                }`}>
                                <Filter className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Status</span>
                                <span className="block truncate font-semibold">
                                    {transactionFilter === 'ALL' ? 'All Statuses' : getTransactionFilterLabel(transactionFilter)}
                                </span>
                            </span>
                            <span className={`ml-1 inline-flex min-w-[1.75rem] items-center justify-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${transactionFilter !== 'ALL'
                                ? 'border-primary-200 bg-white text-primary-700'
                                : 'border-gray-200 bg-gray-100 text-gray-600'
                                }`}>
                                {transactionFilterCounts[transactionFilter] ?? 0}
                            </span>
                            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showTransactionFilter ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                </div>

                {showTransactionFilter && typeof document !== 'undefined' && createPortal(
                    <div
                        ref={transactionFilterMenuRef}
                        className="fixed z-[130] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_65px_-35px_rgba(15,23,42,0.8)] ring-1 ring-slate-900/5"
                        style={{
                            top: transactionFilterPosition.top,
                            left: transactionFilterPosition.left,
                            width: transactionFilterPosition.width,
                        }}
                        role="listbox"
                    >
                        <div className="border-b border-slate-100 bg-slate-50/90 px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Filter Transactions</p>
                            <p className="mt-1 text-xs text-slate-500">
                                Show results by request status
                            </p>
                        </div>
                        <div className="max-h-80 overflow-y-auto p-2 custom-scrollbar">
                            {transactionFilterOptions.map((status) => {
                                const isActive = status === transactionFilter;
                                const meta = getTransactionFilterMeta(status);
                                return (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => {
                                            setTransactionFilter(status);
                                            setShowTransactionFilter(false);
                                        }}
                                        className={`mb-1 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all last:mb-0 ${isActive
                                            ? 'border-primary-200 bg-primary-50/70'
                                            : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                                            }`}
                                        role="option"
                                        aria-selected={isActive}
                                    >
                                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dotClassName}`} />
                                        <span className="min-w-0 flex-1">
                                            <span className={`block truncate text-sm font-semibold ${isActive ? 'text-primary-800' : 'text-slate-800'}`}>
                                                {getTransactionFilterLabel(status)}
                                            </span>
                                            <span className="block truncate text-xs text-slate-500">{meta.description}</span>
                                        </span>
                                        <span className={`inline-flex min-w-[2rem] items-center justify-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${meta.badgeClassName}`}>
                                            {transactionFilterCounts[status] ?? 0}
                                        </span>
                                        {isActive && <Check className="h-3.5 w-3.5 text-primary-700" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>,
                    document.body
                )}

                {filteredTransactions.length === 0 ? (
                    <div className="px-6 py-14 text-center text-sm text-gray-500">
                        No transactions found for this filter.
                    </div>
                ) : (
                    <>
                        <div className="hidden lg:block">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[920px] text-left text-sm">
                                    <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Reference</th>
                                            <th className="px-6 py-3 font-semibold">Date</th>
                                            <th className="px-6 py-3 font-semibold">Requester</th>
                                            <th className="px-6 py-3 font-semibold">Department</th>
                                            <th className="px-6 py-3 font-semibold">Amount</th>
                                            <th className="px-6 py-3 font-semibold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredTransactions.map((request) => {
                                            const { date, time } = getDateAndTime(request.createdAt);
                                            const department = getRequestDepartmentLabel(request);

                                            return (
                                                <tr key={request.id} className="bg-white transition hover:bg-primary-50/30">
                                                    <td className="px-6 py-4 font-semibold text-primary-700">#{request.id.slice(0, 8)}</td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-medium text-gray-900">{date}</p>
                                                        <p className="text-xs text-gray-500">{time}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-700">{request.requester?.name || 'Unknown'}</td>
                                                    <td className="px-6 py-4 text-gray-600">{department}</td>
                                                    <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(Number(request.totalAmount))}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(request.status)}`}>
                                                            {request.status.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="space-y-3 p-4 lg:hidden">
                            {filteredTransactions.map((request) => {
                                const { date, time } = getDateAndTime(request.createdAt);
                                const department = getRequestDepartmentLabel(request);

                                return (
                                    <article key={request.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm font-semibold text-primary-700">#{request.id.slice(0, 8)}</p>
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(request.status)}`}>
                                                {request.status.replace(/_/g, ' ')}
                                            </span>
                                        </div>

                                        <div className="mt-3 grid gap-2 text-sm text-gray-700">
                                            <p><span className="font-medium text-gray-900">Requester:</span> {request.requester?.name || 'Unknown'}</p>
                                            <p><span className="font-medium text-gray-900">Department:</span> {department}</p>
                                            <p><span className="font-medium text-gray-900">Date:</span> {date} at {time}</p>
                                            <p className="text-base font-semibold text-gray-900">{formatCurrency(Number(request.totalAmount))}</p>
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

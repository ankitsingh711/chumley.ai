import { Search, X, ClipboardList, Building2, ShoppingCart, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestsApi } from '../../services/requests.service';
import { suppliersApi } from '../../services/suppliers.service';
import { ordersApi } from '../../services/orders.service';
import { isPaginatedResponse } from '../../types/pagination';
import { UserRole, type Supplier, type PurchaseRequest, type PurchaseOrder } from '../../types/api';
import NotificationBell from '../NotificationBell';

interface SearchResult {
    id: string;
    type: 'request' | 'supplier' | 'order';
    title: string;
    subtitle: string;
    url: string;
    state?: { openOrderId?: string };
}

export function Header() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim().length > 0) {
                performSearch(searchQuery);
            } else {
                setSearchResults([]);
                setShowResults(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const performSearch = async (query: string) => {
        setIsSearching(true);
        try {
            const [requestsResponse, suppliersResponse, ordersResponse] = await Promise.all([
                requestsApi.getAll().catch(() => []),
                suppliersApi.getAll().catch(() => []),
                ordersApi.getAll().catch(() => []),
            ]);

            // Extract data from paginated responses
            const requests: PurchaseRequest[] = isPaginatedResponse(requestsResponse) ? requestsResponse.data : requestsResponse;
            const suppliers: Supplier[] = isPaginatedResponse(suppliersResponse) ? suppliersResponse.data : suppliersResponse;
            const orders: PurchaseOrder[] = isPaginatedResponse(ordersResponse) ? ordersResponse.data : ordersResponse;

            const results: SearchResult[] = [];
            const lowerQuery = query.toLowerCase();

            // Search requests
            requests
                .filter((req: PurchaseRequest) =>
                    req.id.toLowerCase().includes(lowerQuery)
                )
                .slice(0, 5)
                .forEach((req: PurchaseRequest) => {
                    results.push({
                        id: req.id,
                        type: 'request',
                        title: `Request #${req.id.slice(0, 8)}`,
                        subtitle: `£${Number(req.totalAmount).toLocaleString()} • ${req.status}`,
                        url: `/requests/${req.id}`
                    });
                });

            // Search suppliers
            suppliers
                .filter((sup: Supplier) =>
                    sup.name.toLowerCase().includes(lowerQuery) ||
                    sup.contactEmail?.toLowerCase().includes(lowerQuery) ||
                    sup.category?.toLowerCase().includes(lowerQuery)
                )
                .slice(0, 5)
                .forEach((sup: Supplier) => {
                    results.push({
                        id: sup.id,
                        type: 'supplier',
                        title: sup.name,
                        subtitle: sup.category || 'Supplier',
                        url: `/suppliers/${sup.id}`
                    });
                });

            // Search orders
            orders
                .filter((order: PurchaseOrder) =>
                    order.id.toLowerCase().includes(lowerQuery)
                )
                .slice(0, 5)
                .forEach((order: PurchaseOrder) => {
                    results.push({
                        id: order.id,
                        type: 'order',
                        title: `Order #${order.id.slice(0, 8)}`,
                        subtitle: `£${Number(order.totalAmount).toLocaleString()} • ${order.status}`,
                        url: `/orders`,
                        state: { openOrderId: order.id }
                    });
                });

            setSearchResults(results);
            setShowResults(results.length > 0);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleResultClick = (result: SearchResult) => {
        navigate(result.url, { state: result.state });
        setSearchQuery('');
        setShowResults(false);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setShowResults(false);
    };

    const getTypeMeta = (type: SearchResult['type']) => {
        switch (type) {
            case 'request':
                return {
                    icon: ClipboardList,
                    iconClassName: 'bg-sky-50 text-sky-700',
                    badgeClassName: 'border border-sky-200 bg-sky-50 text-sky-700',
                    label: 'Request',
                };
            case 'supplier':
                return {
                    icon: Building2,
                    iconClassName: 'bg-emerald-50 text-emerald-700',
                    badgeClassName: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
                    label: 'Supplier',
                };
            case 'order':
                return {
                    icon: ShoppingCart,
                    iconClassName: 'bg-amber-50 text-amber-700',
                    badgeClassName: 'border border-amber-200 bg-amber-50 text-amber-700',
                    label: 'Order',
                };
            default:
                return {
                    icon: Search,
                    iconClassName: 'bg-gray-100 text-gray-600',
                    badgeClassName: 'border border-gray-200 bg-gray-100 text-gray-600',
                    label: 'Result',
                };
        }
    };

    const roleLabel = (() => {
        switch (user?.role) {
            case UserRole.SYSTEM_ADMIN:
                return 'System Admin';
            case UserRole.SENIOR_MANAGER:
                return 'Senior Manager';
            case UserRole.MANAGER:
                return 'Manager';
            case UserRole.MEMBER:
                return 'Member';
            default:
                return 'User';
        }
    })();

    return (
        <header className="border-b border-gray-200/80 bg-gradient-to-r from-white via-gray-50/60 to-white px-4 py-3 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full max-w-2xl" ref={searchRef}>
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search orders, suppliers, or invoices..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        onFocus={() => searchResults.length > 0 && setShowResults(true)}
                        className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-10 text-sm text-gray-700 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                    />
                    {searchQuery && (
                        <button
                            onClick={clearSearch}
                            className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}

                    {showResults && (
                        <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5">
                            {isSearching ? (
                                <div className="flex items-center justify-center gap-2 p-4 text-sm text-gray-500">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Searching...
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-500">No results found</div>
                            ) : (
                                <div className="max-h-96 overflow-y-auto p-2">
                                    {searchResults.map((result) => {
                                        const typeMeta = getTypeMeta(result.type);
                                        const ResultIcon = typeMeta.icon;
                                        return (
                                            <button
                                                key={`${result.type}-${result.id}`}
                                                onClick={() => handleResultClick(result)}
                                                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-primary-50/40"
                                            >
                                                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${typeMeta.iconClassName}`}>
                                                    <ResultIcon className="h-4 w-4" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-gray-900">{result.title}</p>
                                                    <p className="truncate text-xs text-gray-500">{result.subtitle}</p>
                                                </span>
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${typeMeta.badgeClassName}`}>
                                                    {typeMeta.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3">
                    <NotificationBell />
                    <div className="hidden h-9 w-px bg-gray-200 sm:block" />

                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm">
                        <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{user?.name || 'User'}</p>
                            <p className="text-xs font-semibold text-primary-600">{roleLabel}</p>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary-700 text-sm font-semibold text-white shadow-sm">
                            {user?.name ? getInitials(user.name) : 'U'}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}

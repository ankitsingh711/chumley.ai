import { Search, MessageSquare, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestsApi } from '../../services/requests.service';
import { suppliersApi } from '../../services/suppliers.service';
import { ordersApi } from '../../services/orders.service';
import NotificationBell from '../NotificationBell';

interface SearchResult {
    id: string;
    type: 'request' | 'supplier' | 'order';
    title: string;
    subtitle: string;
    url: string;
}

export function Header() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Generate initials from user name
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Get role display name
    const getRoleDisplay = (role?: string) => {
        if (!role) return '';
        // Convert ADMIN -> Admin, MANAGER -> Manager, etc.
        return role.charAt(0) + role.slice(1).toLowerCase();
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
            const [requests, suppliers, orders] = await Promise.all([
                requestsApi.getAll().catch(() => []),
                suppliersApi.getAll().catch(() => []),
                ordersApi.getAll().catch(() => []),
            ]);

            const results: SearchResult[] = [];
            const lowerQuery = query.toLowerCase();

            // Search requests
            requests
                .filter(req =>
                    req.id.toLowerCase().includes(lowerQuery)
                )
                .slice(0, 5)
                .forEach(req => {
                    results.push({
                        id: req.id,
                        type: 'request',
                        title: `Request #${req.id.slice(0, 8)}`,
                        subtitle: `$${Number(req.totalAmount).toLocaleString()} • ${req.status}`,
                        url: `/requests/${req.id}`
                    });
                });

            // Search suppliers
            suppliers
                .filter(sup =>
                    sup.name.toLowerCase().includes(lowerQuery) ||
                    sup.contactEmail?.toLowerCase().includes(lowerQuery) ||
                    sup.category?.toLowerCase().includes(lowerQuery)
                )
                .slice(0, 5)
                .forEach(sup => {
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
                .filter(order =>
                    order.id.toLowerCase().includes(lowerQuery)
                )
                .slice(0, 5)
                .forEach(order => {
                    results.push({
                        id: order.id,
                        type: 'order',
                        title: `Order #${order.id.slice(0, 8)}`,
                        subtitle: `$${Number(order.totalAmount).toLocaleString()} • ${order.status}`,
                        url: `/orders`
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
        navigate(result.url);
        setSearchQuery('');
        setShowResults(false);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setShowResults(false);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'request':
                return '📋';
            case 'supplier':
                return '🏢';
            case 'order':
                return '📦';
            default:
                return '📄';
        }
    };

    return (
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
            <div className="relative w-96" ref={searchRef}>
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search orders, suppliers, or invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                    className="h-10 w-full rounded-md border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
                {searchQuery && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}

                {/* Search Results Dropdown */}
                {showResults && (
                    <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
                        {isSearching ? (
                            <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
                        ) : searchResults.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">No results found</div>
                        ) : (
                            <div className="py-2">
                                {searchResults.map((result) => (
                                    <button
                                        key={`${result.type}-${result.id}`}
                                        onClick={() => handleResultClick(result)}
                                        className="w-full px-4 py-3 hover:bg-gray-50 flex items-start gap-3 text-left transition-colors"
                                    >
                                        <span className="text-2xl flex-shrink-0">{getTypeIcon(result.type)}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                                            <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                                        </div>
                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded capitalize flex-shrink-0">
                                            {result.type}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4">
                <NotificationBell />
                <button className="rounded-full p-2 hover:bg-gray-100">
                    <MessageSquare className="h-5 w-5 text-gray-600" />
                </button>

                <div className="flex items-center gap-3 border-l pl-4">
                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                        <p className="text-xs text-gray-500">
                            {user?.department || getRoleDisplay(user?.role)}
                        </p>
                    </div>
                    <div className="h-9 w-9 overflow-hidden rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm">
                        {user?.name ? getInitials(user.name) : 'U'}
                    </div>
                </div>
            </div>
        </header>
    );
}

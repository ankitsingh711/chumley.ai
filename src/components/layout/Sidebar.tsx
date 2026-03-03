import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    ShoppingCart,
    Users,
    BarChart3,
    Settings,
    LogOut,
    Package,
    FileSignature,
    Wallet,
} from 'lucide-react';
import { LogoWithText } from '../ui/Logo';

import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/api';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: FileText, label: 'Requests', path: '/requests' },
    { icon: ShoppingCart, label: 'Orders', path: '/orders' },
    { icon: Package, label: 'Catalog', path: '/catalog', adminOnly: true },
    { icon: Users, label: 'Suppliers', path: '/suppliers' },
    { icon: FileSignature, label: 'Contracts', path: '/contracts', adminOnly: true },
    { icon: Wallet, label: 'Budgets', path: '/budgets', adminOnly: true },
    { icon: BarChart3, label: 'Reports', path: '/reports' },
];

const MIN_SIDEBAR_WIDTH = 96;
const MAX_SIDEBAR_WIDTH = 360;
const DEFAULT_SIDEBAR_WIDTH = 256;
const COLLAPSED_WIDTH_THRESHOLD = 192;

const clampWidth = (width: number) => Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));

export function Sidebar() {
    const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
        if (typeof window === 'undefined') {
            return DEFAULT_SIDEBAR_WIDTH;
        }

        const storedWidth = Number(window.localStorage.getItem('sidebar-width'));
        return Number.isFinite(storedWidth) ? clampWidth(storedWidth) : DEFAULT_SIDEBAR_WIDTH;
    });
    const [isResizing, setIsResizing] = useState(false);
    const resizeStartXRef = useRef(0);
    const resizeStartWidthRef = useRef(sidebarWidth);
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const isCollapsed = sidebarWidth <= COLLAPSED_WIDTH_THRESHOLD;

    useEffect(() => {
        window.localStorage.setItem('sidebar-width', String(sidebarWidth));
    }, [sidebarWidth]);

    useEffect(() => {
        if (!isResizing) {
            return;
        }

        const previousUserSelect = document.body.style.userSelect;
        const previousCursor = document.body.style.cursor;

        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';

        return () => {
            document.body.style.userSelect = previousUserSelect;
            document.body.style.cursor = previousCursor;
        };
    }, [isResizing]);

    const visibleNavItems = navItems.filter((item) => {
        if (user?.role === UserRole.SYSTEM_ADMIN) return true;

        if (user?.role === UserRole.SENIOR_MANAGER) {
            return ['/', '/requests', '/orders', '/suppliers', '/reports'].includes(item.path);
        }

        if (user?.role === UserRole.MANAGER) {
            return ['/', '/requests', '/orders', '/suppliers', '/reports'].includes(item.path);
        }

        if (user?.role === UserRole.MEMBER) {
            return ['/requests', '/orders', '/suppliers'].includes(item.path);
        }

        return false;
    });

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleResizeStart = (event: PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        resizeStartXRef.current = event.clientX;
        resizeStartWidthRef.current = sidebarWidth;
        setIsResizing(true);
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handleResizeMove = (event: PointerEvent<HTMLDivElement>) => {
        if (!isResizing) {
            return;
        }

        const deltaX = event.clientX - resizeStartXRef.current;
        const nextWidth = clampWidth(resizeStartWidthRef.current + deltaX);
        setSidebarWidth(nextWidth);
    };

    const handleResizeEnd = (event: PointerEvent<HTMLDivElement>) => {
        if (!isResizing) {
            return;
        }

        setIsResizing(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    return (
        <aside
            className={cn(
                'relative flex h-screen flex-col border-r border-gray-200/80 bg-gradient-to-b from-white via-gray-50/60 to-white',
                isResizing ? 'transition-none' : 'transition-[width] duration-150'
            )}
            style={{ width: `${sidebarWidth}px` }}
        >
            <div className={cn('pb-5 pt-5', isCollapsed ? 'px-3' : 'px-5')}>
                <div className={cn('flex items-start', isCollapsed ? 'justify-center' : 'justify-between gap-2')}>
                    {isCollapsed ? (
                        <img
                            src="/aspect_logo_icon.png"
                            alt="Aspect"
                            className="h-11 w-11 rounded-xl border border-gray-200/80 bg-white p-1 shadow-sm"
                        />
                    ) : (
                        <LogoWithText classNameIcon="w-44" classNameText="text-gray-500" />
                    )}
                </div>
            </div>

            <nav className={cn('flex-1 space-y-1.5 overflow-y-auto pb-4', isCollapsed ? 'px-2.5' : 'px-3')}>
                {visibleNavItems.map((item) => {
                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                    const displayLabel = user?.role === UserRole.MEMBER && item.path === '/orders' ? 'My Orders' : item.label;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            title={isCollapsed ? displayLabel : undefined}
                            aria-label={isCollapsed ? displayLabel : undefined}
                            className={cn(
                                'group relative flex items-center rounded-xl border py-2.5 text-sm font-semibold transition-all',
                                isCollapsed ? 'justify-center px-2.5' : 'gap-3.5 px-3',
                                isActive
                                    ? 'border-primary-200 bg-gradient-to-r from-primary-50 to-white text-primary-800 shadow-sm'
                                    : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-white hover:text-gray-900'
                            )}
                        >
                            <span
                                className={cn(
                                    'inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all',
                                    isActive
                                        ? 'bg-primary-700 text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-700',
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                            </span>
                            {!isCollapsed && <span className="flex-1">{displayLabel}</span>}
                            {!isCollapsed && isActive && <span className="h-2 w-2 rounded-full bg-primary-600" />}
                            {isCollapsed && isActive && <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary-600" />}
                        </Link>
                    );
                })}
            </nav>

            <div className={cn('space-y-1.5 border-t border-gray-200/80 bg-white/80 backdrop-blur', isCollapsed ? 'p-2.5' : 'p-3')}>
                {!isCollapsed && <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-gray-500">Account</p>}
                <Link
                    to="/settings"
                    title={isCollapsed ? 'Settings' : undefined}
                    aria-label={isCollapsed ? 'Settings' : undefined}
                    className={cn(
                        'group flex items-center rounded-xl border py-2.5 text-sm font-semibold transition-all',
                        isCollapsed ? 'justify-center px-2.5' : 'gap-3 px-3',
                        location.pathname === '/settings'
                            ? 'border-primary-200 bg-gradient-to-r from-primary-50 to-white text-primary-800 shadow-sm'
                            : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-white hover:text-gray-900',
                    )}
                >
                    <span
                        className={cn(
                            'inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all',
                            location.pathname === '/settings'
                                ? 'bg-primary-700 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-700',
                        )}
                    >
                        <Settings className="h-5 w-5" />
                    </span>
                    {!isCollapsed && 'Settings'}
                </Link>
                <button
                    type="button"
                    onClick={handleLogout}
                    title={isCollapsed ? 'Logout' : undefined}
                    aria-label={isCollapsed ? 'Logout' : undefined}
                    className={cn(
                        'group flex w-full items-center rounded-xl border border-transparent py-2.5 text-sm font-semibold text-gray-600 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700',
                        isCollapsed ? 'justify-center px-2.5' : 'gap-3 px-3'
                    )}
                >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-400 transition-all group-hover:bg-rose-100 group-hover:text-rose-700">
                        <LogOut className="h-5 w-5" />
                    </span>
                    {!isCollapsed && 'Logout'}
                </button>
            </div>

            <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize sidebar"
                className="group absolute -right-1 top-0 z-20 h-full w-2 cursor-col-resize touch-none"
                onPointerDown={handleResizeStart}
                onPointerMove={handleResizeMove}
                onPointerUp={handleResizeEnd}
                onPointerCancel={handleResizeEnd}
            >
                <span
                    className={cn(
                        'pointer-events-none absolute right-0 top-1/2 h-20 w-1 -translate-y-1/2 rounded-full transition-colors',
                        isResizing ? 'bg-primary-500' : 'bg-transparent group-hover:bg-primary-300'
                    )}
                />
            </div>
        </aside>
    );
}

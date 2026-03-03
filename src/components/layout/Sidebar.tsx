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

const SIDEBAR_WIDTH = 256;

export function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, user } = useAuth();

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

    return (
        <aside
            className="relative flex h-screen flex-col border-r border-gray-200/80 bg-gradient-to-b from-white via-gray-50/60 to-white"
            style={{ width: `${SIDEBAR_WIDTH}px` }}
        >
            <div className="px-5 pb-5 pt-5">
                <div className="flex items-start justify-between gap-2">
                    <LogoWithText classNameIcon="w-44" classNameText="text-gray-500" />
                </div>
            </div>

            <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-4">
                {visibleNavItems.map((item) => {
                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                    const displayLabel = user?.role === UserRole.MEMBER && item.path === '/orders' ? 'My Orders' : item.label;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                'group relative flex items-center rounded-xl border py-2.5 text-sm font-semibold transition-all',
                                'gap-3.5 px-3',
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
                            <span className="flex-1">{displayLabel}</span>
                            {isActive && <span className="h-2 w-2 rounded-full bg-primary-600" />}
                        </Link>
                    );
                })}
            </nav>

            <div className="space-y-1.5 border-t border-gray-200/80 bg-white/80 p-3 backdrop-blur">
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-gray-500">Account</p>
                <Link
                    to="/settings"
                    className={cn(
                        'group flex items-center rounded-xl border py-2.5 text-sm font-semibold transition-all',
                        'gap-3 px-3',
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
                    Settings
                </Link>
                <button
                    type="button"
                    onClick={handleLogout}
                    className={cn(
                        'group flex w-full items-center rounded-xl border border-transparent py-2.5 text-sm font-semibold text-gray-600 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700',
                        'gap-3 px-3'
                    )}
                >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-400 transition-all group-hover:bg-rose-100 group-hover:text-rose-700">
                        <LogOut className="h-5 w-5" />
                    </span>
                    Logout
                </button>
            </div>
        </aside>
    );
}

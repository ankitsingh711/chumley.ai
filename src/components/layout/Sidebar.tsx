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
    Wallet
} from 'lucide-react';
import { LogoIcon } from '../ui/Logo';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
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

export function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, user } = useAuth();

    // Filter menu items based on user role
    const visibleNavItems = navItems.filter(item => {
        // If system admin, show everything (except explicit non-admin if any)
        if (user?.role === UserRole.SYSTEM_ADMIN) return true;

        // If member, only show Requests and Suppliers (and maybe Dashboard/Settings if safe, but req says restrict)
        // Request says "For members we only need to show requets pages and suppliers pages"
        if (user?.role === UserRole.MEMBER) {
            return ['/requests', '/suppliers'].includes(item.path);
        }

        // For other roles (Manager etc), default behavior (hide adminOnly)
        if (item.adminOnly) return false;

        return true;
    });

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen w-64 flex-col border-r bg-white">
            <div className="flex items-center gap-2 p-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
                    <LogoIcon />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-lg font-bold text-gray-900 leading-none">Chumley AI</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Global Ops</p>
                </div>
            </div>

            <nav className="flex-1 space-y-1 px-4">
                {visibleNavItems.map((item) => {
                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            )}
                        >
                            <item.icon className={cn('h-5 w-5', isActive ? 'text-primary-700' : 'text-gray-400')} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t p-4 space-y-1">
                <Link
                    to="/settings"
                    className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        location.pathname === '/settings' && 'bg-primary-50 text-primary-700'
                    )}
                >
                    <Settings className="h-5 w-5 text-gray-400" />
                    Settings
                </Link>
                <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                    <LogOut className="h-5 w-5 text-gray-400" />
                    Logout
                </button>
            </div>
        </div>
    );
}

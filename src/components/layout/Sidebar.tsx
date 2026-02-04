import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    ShoppingCart,
    Users,
    BarChart3,
    Settings,
    LogOut,
    Package
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: FileText, label: 'Requests', path: '/requests' },
    { icon: ShoppingCart, label: 'Orders', path: '/orders' },
    { icon: Users, label: 'Suppliers', path: '/suppliers' },
    { icon: BarChart3, label: 'Reports', path: '/reports' },
];

export function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen w-64 flex-col border-r bg-white">
            <div className="flex items-center gap-2 p-6">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-primary-500 text-white">
                    <Package className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-gray-900 leading-none">Chumley AI</h1>
                    <p className="text-xs text-gray-500">Global Ops</p>
                </div>
            </div>

            <nav className="flex-1 space-y-1 px-4">
                {navItems.map((item) => {
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

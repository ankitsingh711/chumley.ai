import { Search, Bell, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function Header() {
    const { user } = useAuth();

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

    return (
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
            <div className="relative w-96">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search orders, suppliers, or invoices..."
                    className="h-10 w-full rounded-md border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
            </div>

            <div className="flex items-center gap-4">
                <button className="relative rounded-full p-2 hover:bg-gray-100">
                    <Bell className="h-5 w-5 text-gray-600" />
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                </button>
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

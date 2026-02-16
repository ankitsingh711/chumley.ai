import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/api';

interface AdminRouteProps {
    children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Check if user is System Admin
    if (!user || user.role !== UserRole.SYSTEM_ADMIN) {
        // Redirect to dashboard if not admin
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

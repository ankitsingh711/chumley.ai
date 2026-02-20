import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/api';

interface RoleProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
    fallbackPath?: string;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
    children,
    allowedRoles,
    fallbackPath
}) => {
    const { user, isLoading, isAuthenticated } = useAuth();
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

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!allowedRoles.includes(user.role)) {
        // If they are a MEMBER, default fallback to /requests instead of /
        const defaultFallback = user.role === UserRole.MEMBER ? '/requests' : '/';
        const finalFallback = fallbackPath || defaultFallback;

        // Prevent infinite redirects if the fallback path is the current location
        if (location.pathname === finalFallback) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
                        <p className="text-gray-600">You do not have permission to view this page.</p>
                    </div>
                </div>
            );
        }

        return <Navigate to={finalFallback} replace />;
    }

    return <>{children}</>;
};

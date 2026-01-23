import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function GoogleCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [error, setError] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            const token = searchParams.get('token');
            const errorParam = searchParams.get('error');

            if (errorParam) {
                setError('Authentication failed. Please try again.');
                setTimeout(() => navigate('/login'), 3000);
                return;
            }

            if (!token) {
                setError('No authentication token received.');
                setTimeout(() => navigate('/login'), 3000);
                return;
            }

            try {
                // Store token and user info
                localStorage.setItem('authToken', token);

                // Decode JWT to get user info (simple decode, not verification - that's done server-side)
                const payload = JSON.parse(atob(token.split('.')[1]));
                const user = {
                    id: payload.id,
                    email: payload.email,
                    role: payload.role,
                    name: payload.name || payload.email.split('@')[0],
                };

                localStorage.setItem('currentUser', JSON.stringify(user));

                // Force auth context update by triggering a page reload or navigation
                window.location.href = '/';
            } catch (err) {
                console.error('Error processing Google callback:', err);
                setError('Failed to complete authentication.');
                setTimeout(() => navigate('/login'), 3000);
            }
        };

        handleCallback();
    }, [searchParams, navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Failed</h3>
                    <p className="text-sm text-gray-500">{error}</p>
                    <p className="text-xs text-gray-400 mt-4">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Completing Sign In</h3>
                <p className="text-sm text-gray-500">Please wait while we complete your Google authentication...</p>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Briefcase, Eye, EyeOff, CheckCircle2, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { LogoWithText } from '../components/ui/Logo';
import { authApi } from '../services/auth.service';
// import { useAuth } from '../hooks/useAuth';

export default function Onboarding() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    // const { login } = useAuth(); // We might need to manually set user context if acceptInvite returns token

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        password: '',
        title: ''
    });

    useEffect(() => {
        if (!token) {
            setError('Missing invitation token. Please check your email link.');
        }
    }, [token]);

    const handleComplete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setIsLoading(true);
        setError('');

        try {
            // Call API to accept invite
            const response = await authApi.acceptInvite({
                token,
                name: formData.name,
                password: formData.password,
                jobTitle: formData.title
            });

            // If successful, log the user in (if AuthContext supports it, or just save token)
            if (response.token) {
                localStorage.setItem('token', response.token);
                // Force a reload or use a context method to update state would be better, 
                // but usually storing token and redirecting works if App checks token on mount.
                // Assuming useAuth has a way to update, or we just rely on reload/redirect.
                // For now, let's just redirect.
            }

            navigate('/onboarding/success');
        } catch (err: any) {
            console.error('Onboarding failed:', err);
            setError(err.response?.data?.error || 'Failed to complete setup. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-4 relative overflow-hidden">
            {/* Background decoration matching Image 1 */}
            <div className="absolute top-0 right-0 w-2/3 h-full bg-[#e6f0f2] rounded-l-[100px] -z-10 translate-x-1/4"></div>

            <div className="w-full max-w-[500px] bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500">
                <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <LogoWithText />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> Secure Invitation
                    </div>
                </div>

                <div className="p-10">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Welcome to Aspect</h2>
                        <p className="text-gray-500 mt-2 text-sm">Hi there, let's get your account ready in seconds.</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleComplete}>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700">Full Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 py-3 pl-4 pr-10 text-sm focus:border-[#1f4b55] focus:ring-1 focus:ring-[#1f4b55] outline-none"
                                    required
                                    placeholder="Enter your full name"
                                />
                                <User className="absolute right-3.5 top-3.5 h-4 w-4 text-gray-400" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700">Job Title</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="e.g. Procurement Manager"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 py-3 pl-4 pr-10 text-sm focus:border-[#1f4b55] focus:ring-1 focus:ring-[#1f4b55] outline-none"
                                />
                                <Briefcase className="absolute right-3.5 top-3.5 h-4 w-4 text-gray-400" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700">Set Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 py-3 pl-4 pr-10 text-sm focus:border-[#1f4b55] focus:ring-1 focus:ring-[#1f4b55] outline-none"
                                    required
                                    minLength={6}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600">
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>

                            {/* Progress Bar Style Password Strength */}
                            <div className="flex gap-1 h-1 mt-2">
                                <div className={`flex-1 rounded-full ${formData.password.length > 2 ? 'bg-[#1f4b55]' : 'bg-gray-200'}`}></div>
                                <div className={`flex-1 rounded-full ${formData.password.length > 4 ? 'bg-[#1f4b55]' : 'bg-gray-200'}`}></div>
                                <div className={`flex-1 rounded-full ${formData.password.length > 6 ? 'bg-[#a5babb]' : 'bg-gray-200'}`}></div>
                                <div className={`flex-1 rounded-full ${formData.password.length > 8 ? 'bg-[#a5babb]' : 'bg-gray-200'}`}></div>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">Include at least 8 characters and one symbol.</p>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading || !token}
                            className="w-full bg-[#1daabb] hover:bg-[#1899a7] text-white font-semibold py-6 rounded-lg mt-4 shadow-sm group"
                        >
                            {isLoading ? 'Setting up...' : 'Complete Setup'}
                            {!isLoading && <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>}
                        </Button>
                    </form>

                    <p className="text-[10px] text-center text-gray-400 mt-6 leading-relaxed">
                        By completing setup, you agree to Aspect's <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>.
                    </p>

                    {/* Skeleton Loaders at bottom mimicking image */}
                    <div className="flex justify-center gap-3 mt-8">
                        <div className="h-1.5 w-12 bg-gray-100 rounded-full"></div>
                        <div className="h-1.5 w-12 bg-gray-100 rounded-full"></div>
                        <div className="h-1.5 w-12 bg-gray-100 rounded-full"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

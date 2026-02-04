import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { LogoIcon } from '../components/ui/Logo';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [rememberDevice, setRememberDevice] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent form submission refresh immediately
        setError('');
        setLoading(true);

        try {
            await login(email, password);

            // If remember device is checked, set expiration for 30 days
            if (rememberDevice) {
                const expirationDate = new Date();
                expirationDate.setDate(expirationDate.getDate() + 30);
                localStorage.setItem('authExpiration', expirationDate.toISOString());
            } else {
                localStorage.removeItem('authExpiration');
            }

            const from = (location.state as any)?.from?.pathname || '/';
            navigate(from, { replace: true });
        } catch (err: any) {
            console.error('Login error:', err);
            const errorMessage = err.response?.data?.error || err.message || 'Login failed. Please check your credentials.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-white">
            {/* Left Side - Brand / Teal Background */}
            <div className="hidden lg:flex w-1/2 flex-col justify-between bg-gradient-to-br from-primary-400 to-primary-500 p-16 text-white relative overflow-hidden">
                {/* Abstract background pattern placeholder - subtle dots or grid */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-24">
                        <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm border border-white/30">
                            <LogoIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Chumley AI</h1>
                    </div>

                    <div className="max-w-xl">
                        <h2 className="text-5xl font-bold leading-tight mb-6">Master your organization's spend management.</h2>
                        <p className="text-lg text-white/80 leading-relaxed mb-12">
                            The modern procurement platform designed for efficiency, transparency, and scalable growth. Join thousands of organizations optimizing their supply chains.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 flex gap-6">
                    <div className="flex-1 rounded-xl bg-white/10 backdrop-blur-md p-6 border border-white/10">
                        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center mb-4">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <h3 className="font-bold text-lg mb-1">Fast Processing</h3>
                        <p className="text-sm text-white/70">Reduce cycle times by up to 45%</p>
                    </div>
                    <div className="flex-1 rounded-xl bg-white/10 backdrop-blur-md p-6 border border-white/10">
                        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center mb-4">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </div>
                        <h3 className="font-bold text-lg mb-1">Real-time Insights</h3>
                        <p className="text-sm text-white/70">Live tracking for every transaction</p>
                    </div>
                </div>

                <div className="relative z-10 mt-12 text-xs text-white/40">
                    © 2024 Chumley AI Inc. All rights reserved.
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-gray-50/30">
                <div className="w-full max-w-md space-y-8">
                    <div className="mb-10">
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome back</h2>
                        <p className="text-gray-500 mt-2">Please enter your details to access your dashboard.</p>
                    </div>

                    <div className="rounded-lg bg-primary-50 border border-primary-100 p-4 flex gap-3 items-start">
                        <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold mt-0.5">i</div>
                        <p className="text-sm text-primary-800">Access is by invitation only. Please contact your organization's administrator for an invite.</p>
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex gap-3 items-start">
                            <div className="flex-shrink-0 h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold mt-0.5">!</div>
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-900">Work Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder:text-gray-400 disabled:opacity-50"
                                placeholder="name@company.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-gray-900">Password</label>
                                <a href="#" className="text-sm font-semibold text-primary-600 hover:text-primary-700">Forgot password?</a>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 pr-12 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder:text-gray-400 disabled:opacity-50"
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-3 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="remember"
                                checked={rememberDevice}
                                onChange={(e) => setRememberDevice(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                            />
                            <label htmlFor="remember" className="text-sm text-gray-700">Remember this device for 30 days</label>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary-500 hover:bg-primary-600 text-white py-6 text-base font-semibold rounded-lg shadow-sm disabled:opacity-50"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200"></span></div>
                        <div className="relative flex justify-center text-xs uppercase tracking-wider"><span className="bg-gray-50/30 px-4 text-gray-500 font-medium">OR CONTINUE WITH SSO</span></div>
                    </div>

                    <button
                        onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3003/api'}/auth/google`}
                        className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
                        Continue with Google
                    </button>

                    <div className="pt-8 mt-8 border-t border-gray-100 text-center space-y-2">
                        <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">ENTERPRISE ACCESS</p>
                        <p className="text-sm text-gray-500">Chumley AI is an invite-only platform.</p>
                        <button className="text-sm font-bold text-primary-600">Contact support for inquiries</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

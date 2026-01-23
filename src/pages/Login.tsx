import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Lock } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate login
        navigate('/');
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50">
            <div className="flex h-full w-full overflow-hidden bg-white shadow-xl md:h-[600px] md:w-[1000px] md:rounded-2xl">
                {/* Left Side - Brand */}
                <div className="hidden w-1/2 flex-col justify-between bg-teal-800 p-12 text-white md:flex">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-white text-teal-800">
                            <Package className="h-5 w-5" />
                        </div>
                        <h1 className="text-xl font-bold">ProcureCorp</h1>
                    </div>
                    <div>
                        <h2 className="mb-4 text-3xl font-bold">Master your organization's spend management.</h2>
                        <p className="text-teal-100">The modern procurement platform designed for efficiency, transparency, and scalable growth.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="rounded-lg bg-teal-700/50 p-4 backdrop-blur-sm">
                            <p className="font-semibold">Fast Processing</p>
                            <p className="text-xs text-teal-200">Reduce cycle times by up to 45%</p>
                        </div>
                        <div className="rounded-lg bg-teal-700/50 p-4 backdrop-blur-sm">
                            <p className="font-semibold">Real-time Insights</p>
                            <p className="text-xs text-teal-200">Live tracking for every transaction</p>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="flex w-full flex-col justify-center p-12 md:w-1/2">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
                        <p className="text-sm text-gray-500">Please enter your details to access your dashboard.</p>
                    </div>

                    <div className="mb-6 rounded-md bg-blue-50 p-3 text-xs text-blue-700 border border-blue-100 flex gap-2">
                        <span className="font-bold">i</span>
                        Access is by invitation only. Please contact your organization's administrator for an invite.
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Work Email</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 py-2 pl-3 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                                <a href="#" className="text-xs font-medium text-teal-600 hover:text-teal-800">Forgot password?</a>
                            </div>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 py-2 pl-3 pr-10 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                    placeholder="Enter your password"
                                />
                                <Lock className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="remember" className="rounded border-gray-300 text-teal-600 focus:ring-teal-600" />
                            <label htmlFor="remember" className="text-sm text-gray-600">Remember this device for 30 days</label>
                        </div>

                        <Button type="submit" className="w-full bg-teal-700 hover:bg-teal-800">Sign In</Button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200"></span></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">Or continue with SSO</span></div>
                    </div>

                    <Button variant="outline" className="w-full">Continue with Google</Button>

                    <div className="mt-8 text-center text-xs text-gray-400">
                        <p className="font-semibold text-gray-500">ENTERPRISE ACCESS</p>
                        <p>ProcureCorp is an invite-only platform.</p>
                        <p className="text-teal-600 cursor-pointer">Contact support for inquiries</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

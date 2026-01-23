import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, User, Briefcase, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function Onboarding() {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);

    const handleComplete = (e: React.FormEvent) => {
        e.preventDefault();
        navigate('/onboarding/success');
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">

            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-teal-800 text-white">
                        <Package className="h-5 w-5" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">ProcurementHub</h1>
                    <div className="ml-auto flex items-center text-xs text-gray-400 gap-1">
                        <div className="bg-blue-500 rounded-full p-0.5"><CheckCircle className="h-2 w-2 text-white" /></div>
                        Secure Invitation
                    </div>
                </div>

                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 relative overflow-hidden">
                    {/* Background curves placeholder - simplified with CSS if needed, or just clean white */}

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 h-8">Welcome to Acme Corp</h2>
                        <p className="mt-2 text-sm text-gray-600">Hi Alex, let's get your account ready in seconds.</p>
                    </div>

                    <form className="space-y-6" onSubmit={handleComplete}>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 uppercase">Full Name</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <input
                                    type="text"
                                    defaultValue="Alex Rivera"
                                    className="block w-full rounded-md border-gray-300 py-3 pl-3 pr-10 focus:border-teal-500 focus:ring-teal-500 sm:text-sm border"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <User className="h-4 w-4 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 uppercase">Job Title</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <input
                                    type="text"
                                    placeholder="e.g. Procurement Manager"
                                    className="block w-full rounded-md border-gray-300 py-3 pl-3 pr-10 focus:border-teal-500 focus:ring-teal-500 sm:text-sm border"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <Briefcase className="h-4 w-4 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 uppercase">Set Password</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    defaultValue="........"
                                    className="block w-full rounded-md border-gray-300 py-3 pl-3 pr-10 focus:border-teal-500 focus:ring-teal-500 sm:text-sm border"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                                </div>
                            </div>

                            {/* Password Strength Meter */}
                            <div className="mt-2 flex gap-1 h-1">
                                <div className="flex-1 bg-teal-600 rounded-full"></div>
                                <div className="flex-1 bg-teal-600 rounded-full"></div>
                                <div className="flex-1 bg-teal-100 rounded-full"></div>
                                <div className="flex-1 bg-teal-100 rounded-full"></div>
                            </div>
                            <p className="mt-1 text-xs text-gray-400">Include at least 8 characters and one symbol.</p>
                        </div>

                        <div>
                            <Button type="submit" className="w-full bg-teal-800 hover:bg-teal-900 py-6">
                                Complete Setup →
                            </Button>
                        </div>
                    </form>

                    <div className="mt-6 text-center text-xs text-gray-400">
                        By completing setup, you agree to Acme Corp's <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
                    </div>

                    <div className="mt-8 flex justify-center gap-4">
                        <div className="h-2 w-16 bg-gray-200 rounded"></div>
                        <div className="h-2 w-16 bg-gray-200 rounded"></div>
                        <div className="h-2 w-16 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

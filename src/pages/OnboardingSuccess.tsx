import { useNavigate } from 'react-router-dom';
import { ArrowRight, PlayCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { LogoWithText } from '../components/ui/Logo';

export default function OnboardingSuccess() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-100/50 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-[800px] bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
                {/* Top branding bar */}
                <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2">
                        <LogoWithText />
                    </div>
                    {/* User Avatar */}
                    <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center border border-gray-100">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="Avatar" className="h-6 w-6" />
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center py-16 px-4">
                    {/* Hero Graphic Area */}
                    <div className="relative w-full max-w-lg h-40 bg-gradient-to-r from-primary-400 to-primary-500 rounded-t-2xl flex items-center justify-center overflow-hidden mb-8">
                        {/* Soft Glows */}
                        <div className="absolute top-1/2 left-1/4 h-32 w-32 bg-yellow-200 rounded-full blur-3xl opacity-50 -translate-y-1/2"></div>
                        <div className="absolute top-1/2 right-1/4 h-32 w-32 bg-yellow-200 rounded-full blur-3xl opacity-50 -translate-y-1/2"></div>

                        {/* Center Check Icon */}
                        <div className="relative z-10 h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-4xl text-cyan-500">✓</span>
                        </div>
                    </div>

                    <div className="text-center max-w-md mx-auto space-y-4">
                        <h1 className="text-3xl font-bold text-gray-900">You're all set, Alex!</h1>
                        <p className="text-gray-500 leading-relaxed">
                            Your procurement workspace is ready. You've successfully laid the foundation for effortless spend management.
                        </p>
                    </div>

                    {/* Config Summary Card */}
                    <div className="bg-gray-50 rounded-xl p-8 max-w-md w-full mx-auto my-8 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">SETUP SUMMARY</p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-5 w-5 rounded-full bg-cyan-500 flex items-center justify-center">
                                    <CheckCircle2 className="h-3 w-3 text-white" />
                                </div>
                                <span className="text-sm font-medium text-gray-700">Organization Profile Verified</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-5 w-5 rounded-full bg-cyan-500 flex items-center justify-center">
                                    <CheckCircle2 className="h-3 w-3 text-white" />
                                </div>
                                <span className="text-sm font-medium text-gray-700">Team Members Invited</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-5 w-5 rounded-full bg-cyan-500 flex items-center justify-center">
                                    <CheckCircle2 className="h-3 w-3 text-white" />
                                </div>
                                <span className="text-sm font-medium text-gray-700">Payment Methods Connected</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                        <Button
                            className="bg-[#24a0b5] hover:bg-[#1b8a9c] text-white px-8 py-6 rounded-lg font-semibold flex items-center gap-2 shadow-sm shadow-cyan-200"
                            onClick={() => navigate('/')}
                        >
                            Go to Dashboard <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="px-8 py-6 rounded-lg font-semibold text-gray-600 border-gray-200 hover:bg-gray-50 flex items-center gap-2">
                            <PlayCircle className="h-4 w-4 text-cyan-500" /> 2-min Tour
                        </Button>
                    </div>

                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mt-10">
                        STREAMLINING YOUR SPEND STARTS NOW
                    </p>
                </div>

                {/* Footer */}
                <div className="py-6 text-center text-xs text-gray-400 border-t border-gray-100">
                    Need more help? <a href="#" className="text-cyan-600 font-medium hover:underline">Visit Support Center</a> or <a href="#" className="text-cyan-600 font-medium hover:underline">Contact Success Manager</a>
                </div>
            </div>
        </div>
    );
}

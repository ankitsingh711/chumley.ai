import { useNavigate } from 'react-router-dom';
import { Package, PlayCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function OnboardingSuccess() {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="p-1 bg-teal-600 rounded text-white"><Package className="h-4 w-4" /></div>
                        <span className="font-bold text-gray-900">ProcurePro</span>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" className="h-8 w-8 rounded-full" alt="User" />
                    </div>
                </div>

                <div className="p-12 text-center">
                    {/* Hero Image / Gradient Area */}
                    <div className="mx-auto mb-8 relative w-full h-48 bg-gradient-to-r from-teal-400 to-blue-400 rounded-xl overflow-hidden flex items-center justify-center">
                        <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle2 className="h-12 w-12 text-teal-500" />
                        </div>
                        {/* Decorative blurs could be added here with absolute positioning */}
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 mb-4">You're all set, Alex!</h1>
                    <p className="text-gray-500 max-w-md mx-auto mb-8">
                        Your procurement workspace is ready. You've successfully laid the foundation for effortless spend management.
                    </p>

                    <div className="bg-gray-50 rounded-xl p-6 max-w-md mx-auto mb-8 text-left">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">SETUP SUMMARY</p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="bg-teal-500 rounded-full p-0.5"><CheckCircle2 className="h-3 w-3 text-white" /></div>
                                <span className="text-sm font-medium text-gray-700">Organization Profile Verified</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="bg-teal-500 rounded-full p-0.5"><CheckCircle2 className="h-3 w-3 text-white" /></div>
                                <span className="text-sm font-medium text-gray-700">Team Members Invited</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="bg-teal-500 rounded-full p-0.5"><CheckCircle2 className="h-3 w-3 text-white" /></div>
                                <span className="text-sm font-medium text-gray-700">Payment Methods Connected</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <Button className="bg-teal-500 hover:bg-teal-600 px-8" onClick={() => navigate('/')}>
                            Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="px-6">
                            <PlayCircle className="mr-2 h-4 w-4 text-teal-500" /> 2-min Tour
                        </Button>
                    </div>

                    <p className="mt-8 text-xs text-gray-400 font-medium tracking-widest uppercase">
                        STREAMLINING YOUR SPEND STARTS NOW
                    </p>
                </div>

                <div className="p-6 border-t border-gray-100 text-center text-xs text-gray-400 flex justify-center gap-1">
                    Need more help? <a href="#" className="text-teal-500 font-medium">Visit Support Center</a> or <a href="#" className="text-teal-500 font-medium">Contact Success Manager</a>
                </div>
            </div>
        </div>
    );
}

import { Shield, ExternalLink, Moon } from 'lucide-react';

export default function EmailTemplate() {
    return (
        <div className="min-h-screen bg-gray-200 p-8 flex items-center justify-center font-sans">
            <div className="w-full max-w-[600px] bg-white rounded-none shadow-sm overflow-hidden">
                {/* Email Header */}
                <div className="p-8 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-[#1f5f70] rounded text-white grid place-items-center">
                            <div className="grid grid-cols-2 gap-0.5">
                                <div className="h-1.5 w-1.5 bg-white rounded-[1px]"></div>
                                <div className="h-1.5 w-1.5 bg-white/50 rounded-[1px]"></div>
                                <div className="h-1.5 w-1.5 bg-white/50 rounded-[1px]"></div>
                                <div className="h-1.5 w-1.5 bg-white rounded-[1px]"></div>
                            </div>
                        </div>
                        <span className="font-bold text-gray-900 text-lg">Chumley AI</span>
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">OFFICIAL INVITATION</span>
                </div>

                <div className="px-12 py-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">Join Acme Corp on Chumley AI</h1>

                    <p className="text-gray-600 mb-2">Hello Sarah,</p>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        James Miller has invited you to join the <span className="font-bold text-gray-900">Acme Corp</span> procurement team. Access centralized purchasing, vendor management, and streamlined approvals.
                    </p>

                    {/* Role Card */}
                    <div className="bg-[#f0f7f9] rounded-lg p-6 border border-[#e1eef2] mb-8 flex gap-4">
                        <div className="h-10 w-10 bg-[#cfdee2] rounded flex items-center justify-center flex-shrink-0">
                            <Shield className="h-5 w-5 text-[#1f5f70]" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[#1f5f70] uppercase tracking-wide mb-1">YOUR ASSIGNED ROLE</p>
                            <p className="text-lg font-bold text-gray-900 mb-2">Approver</p>
                            <p className="text-sm text-gray-500 leading-snug">
                                You will have the authority to review and approve purchase requisitions within your department's budget.
                            </p>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <div className="text-center mb-4">
                        <button className="bg-[#1f5f70] hover:bg-[#164855] text-white px-8 py-3.5 rounded-lg font-semibold text-sm w-full sm:w-auto shadow-sm inline-flex items-center gap-2 transition-colors">
                            Accept Invitation & Set Up Password <span className="text-lg leading-none">→</span>
                        </button>
                    </div>
                    <p className="text-center text-xs text-gray-500">This link is valid for 24 hours.</p>
                </div>

                <div className="bg-[#f9fafb] px-12 py-8 border-t border-gray-100">
                    <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-[#1f5f70] mt-0.5" />
                        <div>
                            <p className="font-bold text-gray-900 text-sm">Secure Invitation</p>
                            <p className="text-xs text-gray-500">This is a verified invitation from your organization's administrator.</p>
                            <a href="#" className="text-xs font-bold text-[#1f5f70] mt-1 inline-flex items-center gap-1">Security Center <ExternalLink className="h-3 w-3" /></a>
                        </div>
                    </div>
                </div>

                <div className="bg-[#f9fafb] p-8 text-center border-t border-gray-100">
                    <div className="flex justify-center gap-6 mb-6 text-xs text-gray-500">
                        <a href="#" className="hover:text-gray-700">Privacy Policy</a>
                        <a href="#" className="hover:text-gray-700">Terms of Service</a>
                        <a href="#" className="hover:text-gray-700">Contact Support</a>
                    </div>

                    <p className="text-[10px] text-gray-400 max-w-sm mx-auto leading-relaxed">
                        © 2024 Chumley AI Inc. 123 Enterprise Way, Suite 400, San Francisco, CA. You received this because an administrator invited you.
                    </p>
                </div>
            </div>

            {/* Floating Toggle from image (optional) */}
            <div className="fixed bottom-8 right-8 h-10 w-10 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer border border-gray-100">
                <Moon className="h-5 w-5 text-gray-800" fill="currentColor" />
            </div>
        </div>
    );
}

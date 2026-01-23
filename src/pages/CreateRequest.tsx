import { Button } from '../components/ui/Button';
import { Calendar, Plus, Trash2, UploadCloud, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CreateRequest() {
    const navigate = useNavigate();

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* <Button variant="ghost" size="icon" onClick={() => navigate('/requests')}><ArrowLeft className="h-5 w-5"/></Button> */}
                    {/* Breadcrumb style from image */}
                    <div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                            <span className="cursor-pointer hover:text-gray-900" onClick={() => navigate('/requests')}>Requests</span>
                            <span>›</span>
                            <span className="font-medium text-gray-900">New Purchase Request</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Create Purchase Request</h1>
                        <p className="text-sm text-gray-500">Specify details for internal review and vendor processing.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Save as Draft</Button>
                    <Button className="bg-teal-700 hover:bg-teal-800">Submit for Approval</Button>
                </div>
            </div>

            {/* General Info */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-6">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[10px] text-white font-bold">i</span>
                    General Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Type of Purchase</label>
                        <select className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-teal-500">
                            <option>Operational Expenses (OPEX)</option>
                            <option>Capital Expenses (CAPEX)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Required Date</label>
                        <div className="relative">
                            <input type="text" placeholder="mm/dd/yyyy" className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-teal-500" />
                            <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Supplier / Vendor</label>
                        <input type="text" placeholder="Search approved vendors..." className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-teal-500" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Reason for Purchase</label>
                        <textarea placeholder="Briefly explain the business need..." className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-teal-500 min-h-[80px]" />
                    </div>
                </div>
            </div>

            {/* Item Details */}
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[10px] text-white font-bold">ii</span>
                        Item Details
                    </h3>
                    <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"><Plus className="h-4 w-4 mr-1" /> Add Row</Button>
                </div>

                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-6 py-3 font-medium">Item Description</th>
                            <th className="px-6 py-3 font-medium w-24">Qty</th>
                            <th className="px-6 py-3 font-medium w-32">Unit Price</th>
                            <th className="px-6 py-3 font-medium w-32">Total</th>
                            <th className="px-6 py-3 font-medium w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        <tr>
                            <td className="px-6 py-3">
                                <input type="text" defaultValue="MacBook Pro 16 - M3 Max 64GB" className="w-full bg-transparent outline-none" />
                            </td>
                            <td className="px-6 py-3">
                                <input type="number" defaultValue="2" className="w-full bg-gray-50 rounded border-none px-2 py-1 text-center" />
                            </td>
                            <td className="px-6 py-3">
                                <div className="relative">
                                    <span className="absolute left-2 top-1 text-gray-400">$</span>
                                    <input type="number" defaultValue="3499" className="w-full bg-gray-50 rounded border-none pl-5 py-1" />
                                </div>
                            </td>
                            <td className="px-6 py-3 font-bold text-gray-900">$6,998.00</td>
                            <td className="px-6 py-3 text-center">
                                <Trash2 className="h-4 w-4 text-gray-300 hover:text-red-500 cursor-pointer" />
                            </td>
                        </tr>
                        <tr>
                            <td className="px-6 py-3">
                                <input type="text" placeholder="Add item description..." className="w-full bg-transparent outline-none text-gray-500" />
                            </td>
                            <td className="px-6 py-3">
                                <input type="number" defaultValue="1" className="w-full bg-gray-50 rounded border-none px-2 py-1 text-center" />
                            </td>
                            <td className="px-6 py-3">
                                <div className="relative">
                                    <span className="absolute left-2 top-1 text-gray-400">$</span>
                                    <input type="number" defaultValue="0.00" className="w-full bg-gray-50 rounded border-none pl-5 py-1" />
                                </div>
                            </td>
                            <td className="px-6 py-3 font-bold text-gray-900">$0.00</td>
                            <td className="px-6 py-3 text-center">
                                <Trash2 className="h-4 w-4 text-gray-300 hover:text-red-500 cursor-pointer" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Supporting Documents */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-6">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[10px] text-white font-bold">iii</span>
                    Supporting Documents
                </h3>

                <div className="border-2 border-dashed border-gray-200 rounded-lg p-10 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="h-12 w-12 rounded-full bg-teal-50 flex items-center justify-center mb-3 text-teal-600">
                        <UploadCloud className="h-6 w-6" />
                    </div>
                    <p className="font-medium text-gray-900">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG or DOCX (max. 10MB)</p>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 p-3 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 text-red-600 rounded">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">Apple_Quote_2024.pdf</p>
                            <p className="text-xs text-gray-500">1.2 MB</p>
                        </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">×</button>
                </div>
            </div>

            {/* Footer Bar */}
            <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between z-10 px-8">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="h-2 w-2 rounded-full bg-yellow-400"></span>
                    Auto-saved as draft at 14:32 PM
                </div>
                <div className="flex gap-4">
                    <button className="text-sm font-medium text-gray-500 hover:text-gray-900">Discard Changes</button>
                    <Button className="bg-teal-700 hover:bg-teal-800">Submit for Approval</Button>
                </div>
            </div>

        </div>
    );
}

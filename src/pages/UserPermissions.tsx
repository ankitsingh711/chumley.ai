import { Search, Settings } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function UserPermissions() {
    return (
        <div className="flex h-full gap-6">
            {/* Left Sidebar: Organization */}
            <div className="w-80 flex-shrink-0 rounded-xl border border-gray-100 bg-white p-4 shadow-sm h-fit">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900">Organization</h2>
                    <Button variant="ghost" size="icon" className="h-6 w-6"><Settings className="h-4 w-4" /></Button>
                </div>

                <div className="relative mb-4">
                    <input
                        type="text"
                        placeholder="Filter members..."
                        className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-8 pr-4 text-sm outline-none focus:border-teal-500"
                    />
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                </div>

                <div className="space-y-1">
                    <div className="flex items-center gap-3 rounded-lg bg-teal-50 p-2 border border-teal-100 cursor-pointer">
                        <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" className="h-8 w-8 rounded-full" alt="" />
                        <div className="flex-1 overflow-hidden">
                            <p className="truncate text-sm font-medium text-gray-900">Sarah Jenkins</p>
                            <p className="truncate text-xs text-gray-500">Finance Manager</p>
                        </div>
                        <span className="rounded bg-teal-600 px-1.5 py-0.5 text-[10px] font-medium text-white">Admin</span>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 cursor-pointer">
                        <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" className="h-8 w-8 rounded-full" alt="" />
                        <div className="flex-1 overflow-hidden">
                            <p className="truncate text-sm font-medium text-gray-900">Mark Wilson</p>
                            <p className="truncate text-xs text-gray-500">Purchasing Agent</p>
                        </div>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">Requester</span>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 cursor-pointer">
                        <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" className="h-8 w-8 rounded-full" alt="" />
                        <div className="flex-1 overflow-hidden">
                            <p className="truncate text-sm font-medium text-gray-900">Elena Rodriguez</p>
                            <p className="truncate text-xs text-gray-500">VP of Operations</p>
                        </div>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">Approver</span>
                    </div>
                </div>

                <Button variant="outline" className="mt-4 w-full text-xs">BULK MANAGE</Button>
            </div>

            {/* Main Content: Settings */}
            <div className="flex-1 space-y-6">
                <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b pb-6">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Settings &gt; User Permissions</p>
                            <h1 className="mt-1 text-2xl font-bold text-gray-900">Manage Access: Sarah Jenkins</h1>
                            <p className="text-sm text-gray-500 text-teal-600 mt-1 max-w-xl">
                                Configure granular permissions and spending limits for this user profile.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-xs text-gray-500">ASSIGN TEMPLATE</p>
                                {/* Select Placeholder */}
                                <div className="mt-1 flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                                    Administrator
                                </div>
                            </div>
                            <Button className="bg-teal-700 hover:bg-teal-800">Save Changes</Button>
                        </div>
                    </div>

                    {/* Purchase Request Controls */}
                    <div className="py-6 border-b border-gray-100">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                            <span className="text-teal-600">🛒</span> Purchase Request Controls
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="rounded-lg border p-4 hover:border-teal-200 bg-teal-50/30">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-medium text-gray-900">Create Requests</h4>
                                    <input type="checkbox" checked className="accent-teal-600 h-4 w-4" readOnly />
                                </div>
                                <p className="mt-2 text-xs text-gray-500">Allows user to initiate new purchase requests and add items from catalogs</p>
                            </div>
                            <div className="rounded-lg border p-4 hover:border-teal-200">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-medium text-gray-900">Edit All Dept Requests</h4>
                                    <input type="checkbox" className="accent-teal-600 h-4 w-4" />
                                </div>
                                <p className="mt-2 text-xs text-gray-500">Grants ability to modify requests created by any member of the department.</p>
                            </div>
                            <div className="rounded-lg border p-4 hover:border-teal-200 bg-teal-50/30">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-medium text-gray-900">Override Vendor Rules</h4>
                                    <input type="checkbox" checked className="accent-teal-600 h-4 w-4" readOnly />
                                </div>
                                <p className="mt-2 text-xs text-gray-500">Allow requesting items from un-approved or off-contract vendors.</p>
                            </div>
                        </div>
                    </div>

                    {/* Approval Authority */}
                    <div className="py-6 border-b border-gray-100">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                            <span className="text-teal-600">💵</span> Approval Authority
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="rounded-lg border p-4 bg-gray-50">
                                <div className="flex justify-between">
                                    <div>
                                        <h4 className="font-medium text-gray-900">Spending Limit Threshold</h4>
                                        <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Set the maximum dollar amount this user can approve without higher intervention.</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white border rounded px-3 h-10">
                                        <span className="text-gray-400">$</span>
                                        <span className="font-bold text-gray-900">10000</span>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-lg border p-4 flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-gray-900">Approve Over Budget</h4>
                                    <p className="text-xs text-gray-500 mt-1">Allows approval even if the request exceeds the quarterly department budget.</p>
                                </div>
                                {/* Toggle Switch Placeholder */}
                                <div className="w-10 h-5 bg-teal-600 rounded-full relative cursor-pointer">
                                    <div className="absolute right-0.5 top-0.5 h-4 w-4 bg-white rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* System & Reporting */}
                    <div className="py-6">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                            <span className="text-teal-600">📊</span> System & Reporting
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="rounded-lg border p-4 bg-teal-50/30 border-teal-200">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-medium text-gray-900">User Management</h4>
                                    <span className="text-xs bg-teal-100 text-teal-700 px-1 rounded">✓</span>
                                </div>
                                <p className="mt-2 text-xs text-gray-500">Full access to invite, suspend, and modify permissions for other users.</p>
                            </div>
                            <div className="rounded-lg border p-4">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-medium text-gray-900">Export Audit Logs</h4>
                                    <input type="checkbox" checked className="accent-teal-600 h-4 w-4" readOnly />
                                </div>
                                <p className="mt-2 text-xs text-gray-500">Download CSV/PDF reports of all system activity and permission changes.</p>
                            </div>
                            <div className="rounded-lg border p-4">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-medium text-gray-900">Financial Reports</h4>
                                    <input type="checkbox" className="accent-teal-600 h-4 w-4" />
                                </div>
                                <p className="mt-2 text-xs text-gray-500">Access to expenditure dashboards, tax documents, and fiscal summaries.</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="rounded-lg bg-red-50 p-4 border border-red-100 flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-bold text-red-800 flex items-center gap-2">
                                Account Security Actions
                            </h4>
                            <p className="text-xs text-red-600 mt-1">These actions are irreversible and affect organization access.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100">Reset to Default</Button>
                            <Button variant="danger" size="sm">Revoke All</Button>
                        </div>
                    </div>

                </div>

                {/* Right Sidebar Placeholder - Change Log could go here if layout supported 3 cols, otherwise integrated */}
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-gray-400 text-xs">↺</span> Change Log
                    </h3>
                    <div className="space-y-6 relative pl-4 border-l border-gray-200">
                        <div className="relative">
                            <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-teal-500 ring-4 ring-white"></span>
                            <p className="text-sm font-medium">Permissions Updated</p>
                            <p className="text-xs text-gray-400">Today at 10:45 AM by James (IT)</p>
                            <div className="mt-1 flex gap-1">
                                <span className="text-[10px] bg-green-100 text-green-700 px-1 py-0.5 rounded">+ Create Requests</span>
                                <span className="text-[10px] bg-red-100 text-red-700 px-1 py-0.5 rounded">- Financial Reports</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useNavigate } from 'react-router-dom';
import { Download, Filter, Eye, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';

const requests = [
    { id: 'PR-9421', requester: { name: 'Sarah Waters', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' }, category: 'IT Infrastructure', amount: '$4,250.00', status: 'Review', date: 'Oct 24, 2023' },
    { id: 'PR-9418', requester: { name: 'David Chen', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' }, category: 'Marketing Tools', amount: '$890.00', status: 'Review', date: 'Oct 23, 2023' },
    { id: 'PR-9415', requester: { name: 'Elena Rodriguez', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' }, category: 'Office Supplies', amount: '$2,105.40', status: 'Approved', date: 'Oct 22, 2023' },
    { id: 'PR-9412', requester: { name: 'Alex Johnson', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' }, category: 'Hardware', amount: '$12,450.00', status: 'Rejected', date: 'Oct 20, 2023' },
];

export default function Requests() {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Purchase Requests</h1>
                    <p className="text-sm text-gray-500">Manage and track internal purchase requisitions.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
                    <Button onClick={() => navigate('/requests/new')}><Plus className="mr-2 h-4 w-4" /> New Request</Button>
                </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="bg-white border shadow-sm">All Requests</Button>
                        <Button variant="ghost" size="sm">Pending</Button>
                        <Button variant="ghost" size="sm">Approved</Button>
                    </div>
                    <Button variant="ghost" size="sm" className="text-gray-500"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-white border-b border-gray-100 text-gray-500 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4 font-medium">ID</th>
                            <th className="px-6 py-4 font-medium">Requester</th>
                            <th className="px-6 py-4 font-medium">Category</th>
                            <th className="px-6 py-4 font-medium">Date</th>
                            <th className="px-6 py-4 font-medium">Amount</th>
                            <th className="px-6 py-4 font-medium">Action</th>
                            <th className="px-6 py-4 font-medium text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {requests.map((req) => (
                            <tr key={req.id} className="hover:bg-gray-50/50">
                                <td className="px-6 py-4 font-medium text-teal-600">{req.id}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img src={req.requester.image} className="h-6 w-6 rounded-full" alt="" />
                                        <span className="font-medium text-gray-900">{req.requester.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500">{req.category}</td>
                                <td className="px-6 py-4 text-gray-500">{req.date}</td>
                                <td className="px-6 py-4 font-bold text-gray-900">{req.amount}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium 
                           ${req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                            req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-blue-50 text-blue-700'}`}>
                                        {req.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 text-gray-400">
                                        <button className="p-1 hover:text-gray-600"><Eye className="h-4 w-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Calendar, Plus, Trash2, UploadCloud, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { requestsApi } from '../services/requests.service';
import type { CreateRequestInput } from '../types/api';

interface ItemRow {
    description: string;
    quantity: number;
    unitPrice: number;
}

export default function CreateRequest() {
    const navigate = useNavigate();
    const [reason, setReason] = useState('');
    const [items, setItems] = useState<ItemRow[]>([
        { description: '', quantity: 1, unitPrice: 0 }
    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: keyof ItemRow, value: string | number) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        setItems(updated);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    };

    const handleSubmit = async () => {
        setError('');

        // Validation
        const validItems = items.filter(item => item.description && item.quantity > 0 && item.unitPrice > 0);
        if (validItems.length === 0) {
            setError('Please add at least one valid item');
            return;
        }

        setLoading(true);
        try {
            const data: CreateRequestInput = {
                reason: reason || undefined,
                items: validItems,
            };

            await requestsApi.create(data);
            navigate('/requests');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
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
                    <Button variant="outline" onClick={() => navigate('/requests')}>Cancel</Button>
                    <Button
                        className="bg-teal-700 hover:bg-teal-800"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Submitting...' : 'Submit for Approval'}
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {/* General Info */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-6">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[10px] text-white font-bold">i</span>
                    General Information
                </h3>

                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Reason for Purchase</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Briefly explain the business need..."
                            className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-teal-500 min-h-[80px]"
                        />
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
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                        onClick={addItem}
                    >
                        <Plus className="h-4 w-4 mr-1" /> Add Row
                    </Button>
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
                        {items.map((item, index) => (
                            <tr key={index}>
                                <td className="px-6 py-3">
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                                        placeholder="Add item description..."
                                        className="w-full bg-transparent outline-none"
                                    />
                                </td>
                                <td className="px-6 py-3">
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                        min="1"
                                        className="w-full bg-gray-50 rounded border-none px-2 py-1 text-center"
                                    />
                                </td>
                                <td className="px-6 py-3">
                                    <div className="relative">
                                        <span className="absolute left-2 top-1 text-gray-400">$</span>
                                        <input
                                            type="number"
                                            value={item.unitPrice}
                                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            min="0"
                                            step="0.01"
                                            className="w-full bg-gray-50 rounded border-none pl-5 py-1"
                                        />
                                    </div>
                                </td>
                                <td className="px-6 py-3 font-bold text-gray-900">
                                    ${(item.quantity * item.unitPrice).toFixed(2)}
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <button
                                        onClick={() => removeItem(index)}
                                        disabled={items.length === 1}
                                        className="disabled:opacity-30"
                                    >
                                        <Trash2 className="h-4 w-4 text-gray-300 hover:text-red-500 cursor-pointer" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-gray-50 font-bold">
                            <td colSpan={3} className="px-6 py-4 text-right">Grand Total:</td>
                            <td className="px-6 py-4 text-teal-700">${calculateTotal().toFixed(2)}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

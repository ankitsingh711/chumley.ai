import { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Calendar, PoundSterling, Building2, X } from 'lucide-react';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { Button } from '../components/ui/Button';
import { ContractsSkeleton } from '../components/skeletons/ContractsSkeleton';
import { contractsApi } from '../services/contracts.service';
import { suppliersApi } from '../services/suppliers.service';
import type { Contract, ContractStatus as ContractStatusType, Supplier } from '../types/api';
import { ContractStatus } from '../types/api';

export default function Contracts() {
    // const navigate = useNavigate(); // Future use for details page
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | ContractStatusType>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        supplierId: '',
        startDate: '',
        endDate: '',
        totalValue: '',
        paymentTerms: '',
        autoRenew: false,
        description: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [contractsData, suppliersData] = await Promise.all([
                contractsApi.getAll(),
                suppliersApi.getAll(),
            ]);
            setContracts(contractsData);
            setSuppliers(suppliersData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredContracts = filter === 'all'
        ? contracts
        : contracts.filter(c => c.status === filter);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            await contractsApi.create({
                ...formData,
                totalValue: parseFloat(formData.totalValue),
                status: ContractStatus.DRAFT,
            });
            await loadData();
            setShowAddModal(false);
            setFormData({
                title: '',
                supplierId: '',
                startDate: '',
                endDate: '',
                totalValue: '',
                paymentTerms: '',
                autoRenew: false,
                description: '',
            });
        } catch (error) {
            console.error('Failed to create contract:', error);
        } finally {
            setSaving(false);
        }
    };

    const getStatusBadgeColor = (status: ContractStatusType) => {
        switch (status) {
            case ContractStatus.ACTIVE:
                return 'bg-green-100 text-green-700';
            case ContractStatus.EXPIRING_SOON:
                return 'bg-yellow-100 text-yellow-700';
            case ContractStatus.EXPIRED:
                return 'bg-red-100 text-red-700';
            case ContractStatus.TERMINATED:
                return 'bg-gray-100 text-gray-700';
            case ContractStatus.RENEWED:
                return 'bg-blue-100 text-blue-700';
            default:
                return 'bg-gray-100 text-gray-600';
        }
    };



    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Contract Management</h1>
                    <p className="text-sm text-gray-500">Track supplier contracts, renewals, and terms.</p>
                </div>
                <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="mr-2 h-4 w-4" /> New Contract
                </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className={filter === 'all' ? 'bg-white border shadow-sm' : ''}
                    onClick={() => setFilter('all')}
                >
                    All Contracts
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className={filter === ContractStatus.ACTIVE ? 'bg-white border shadow-sm' : ''}
                    onClick={() => setFilter(ContractStatus.ACTIVE)}
                >
                    Active
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className={filter === ContractStatus.EXPIRING_SOON ? 'bg-white border shadow-sm' : ''}
                    onClick={() => setFilter(ContractStatus.EXPIRING_SOON)}
                >
                    Expiring Soon
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className={filter === ContractStatus.EXPIRED ? 'bg-white border shadow-sm' : ''}
                    onClick={() => setFilter(ContractStatus.EXPIRED)}
                >
                    Expired
                </Button>
            </div>

            {/* Contracts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <ContractsSkeleton />
                ) : filteredContracts.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No contracts found</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by creating a new contract.</p>
                    </div>
                ) : (
                    filteredContracts.map((contract) => (
                        <div
                            key={contract.id}
                            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() => {/* Future: navigate to contract details */ }}
                        >
                            {/* Status Badge */}
                            <div className="flex items-center justify-between mb-4">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(contract.status)}`}>
                                    {contract.status.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-gray-500">{contract.contractNumber}</span>
                            </div>

                            {/* Contract Title */}
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{contract.title}</h3>

                            {/* Supplier */}
                            <div className="flex items-center gap-2 mb-4">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{contract.supplier?.name || 'Unknown Supplier'}</span>
                            </div>

                            {/* Details */}
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5" /> End Date
                                    </span>
                                    <span className="font-medium text-gray-900">
                                        {new Date(contract.endDate).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 flex items-center gap-1">
                                        <PoundSterling className="h-3.5 w-3.5" /> Value
                                    </span>
                                    <span className="font-medium text-gray-900">
                                        £{contract.totalValue.toLocaleString()}
                                    </span>
                                </div>
                                {contract.daysUntilExpiry !== undefined && contract.daysUntilExpiry > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">Days Until Expiry</span>
                                        <span className="font-medium text-orange-600">{contract.daysUntilExpiry}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Contract Modal */}
            {showAddModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowAddModal(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">New Contract</h2>
                                <p className="text-sm text-gray-500">Create a new supplier contract</p>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Contract Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                    placeholder="e.g., Office Supplies Annual Contract"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Supplier <span className="text-red-500">*</span>
                                </label>
                                <Select
                                    value={formData.supplierId}
                                    onChange={(val) => setFormData({ ...formData, supplierId: val })}
                                    options={[
                                        { value: '', label: 'Select a supplier' },
                                        ...suppliers.map(s => ({ value: s.id, label: s.name }))
                                    ]}
                                    className="w-full"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Start Date <span className="text-red-500">*</span>
                                    </label>
                                    <DatePicker
                                        value={formData.startDate}
                                        onChange={(val) => setFormData({ ...formData, startDate: val })}
                                        className="w-full"
                                        placeholder="Start Date"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        End Date <span className="text-red-500">*</span>
                                    </label>
                                    <DatePicker
                                        value={formData.endDate}
                                        onChange={(val) => setFormData({ ...formData, endDate: val })}
                                        className="w-full"
                                        placeholder="End Date"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Total Value <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    value={formData.totalValue}
                                    onChange={(e) => setFormData({ ...formData, totalValue: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                    placeholder="50000.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                                <input
                                    type="text"
                                    value={formData.paymentTerms}
                                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                    placeholder="Net 30"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
                                    placeholder="Contract details..."
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="autoRenew"
                                    checked={formData.autoRenew}
                                    onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <label htmlFor="autoRenew" className="text-sm text-gray-700">
                                    Auto-renew this contract
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1"
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 bg-primary-600 hover:bg-primary-600"
                                    disabled={saving}
                                >
                                    {saving ? 'Creating...' : 'Create Contract'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

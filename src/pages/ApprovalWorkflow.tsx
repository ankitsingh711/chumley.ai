import { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowRight, Save, AlertCircle, Building2, Globe } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { departmentsApi, type Department } from '../services/departments.service';

interface WorkflowStep {
    id: string;
    type: 'TRIGGER' | 'APPROVAL' | 'CONDITION';
    title: string;
    description: string;
    approverRole?: string;
    condition?: string;
}

// Mock initial global steps
const INITIAL_GLOBAL_STEPS: WorkflowStep[] = [
    {
        id: '1',
        type: 'TRIGGER',
        title: 'Purchase Request Submitted',
        description: 'Starts when any user submits a request',
    },
    {
        id: '2',
        type: 'CONDITION',
        title: 'Check Amount',
        description: 'If amount > £1,000',
        condition: 'amount > 1000',
    },
    {
        id: '3',
        type: 'APPROVAL',
        title: 'Manager Approval',
        description: 'Department Manager must approve',
        approverRole: 'MANAGER',
    },
    {
        id: '4',
        type: 'APPROVAL',
        title: 'Finance Review',
        description: 'CFO must approve',
        approverRole: 'CFO',
    },
];

export default function ApprovalWorkflow() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null); // null = Global

    // Store workflows by ID ('global' or department ID)
    const [workflows, setWorkflows] = useState<Record<string, WorkflowStep[]>>({
        'global': INITIAL_GLOBAL_STEPS
    });

    const [loading, setLoading] = useState(false);
    const [loadingDepts, setLoadingDepts] = useState(true);
    const [showAddStepModal, setShowAddStepModal] = useState(false);
    const [newStepType, setNewStepType] = useState<'APPROVAL' | 'CONDITION'>('APPROVAL');
    const [newStepTitle, setNewStepTitle] = useState('');
    const [newStepDescription, setNewStepDescription] = useState('');

    useEffect(() => {
        loadDepartments();
    }, []);

    const loadDepartments = async () => {
        try {
            const data = await departmentsApi.getAll();
            setDepartments(data);
        } catch (error) {
            console.error('Failed to load departments', error);
        } finally {
            setLoadingDepts(false);
        }
    };

    // Get current steps based on selection
    const currentSteps = workflows[selectedDepartmentId || 'global'] || [];

    // Check if current department works as an override or inherits global
    const isInheriting = selectedDepartmentId && !workflows[selectedDepartmentId];

    // Helper to get effective steps (if inheriting, show global)
    const effectiveSteps = isInheriting ? workflows['global'] : currentSteps;

    const handleSave = async () => {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoading(false);
    };

    const handleDeleteStep = (id: string) => {
        if (id === '1') return; // Cannot delete trigger

        const contextKey = selectedDepartmentId || 'global';

        // If we are in an inheriting state, we first need to copy global to local
        let newSteps = [...effectiveSteps];

        newSteps = newSteps.filter(s => s.id !== id);

        setWorkflows(prev => ({
            ...prev,
            [contextKey]: newSteps
        }));
    };

    const handleAddStepClick = () => {
        setNewStepType('APPROVAL');
        setNewStepTitle('');
        setNewStepDescription('');
        setShowAddStepModal(true);
    };

    const confirmAddStep = () => {
        const newStep: WorkflowStep = {
            id: Date.now().toString(),
            type: newStepType,
            title: newStepTitle || (newStepType === 'APPROVAL' ? 'New Approval' : 'New Condition'),
            description: newStepDescription || 'Description',
            approverRole: newStepType === 'APPROVAL' ? 'MANAGER' : undefined,
            condition: newStepType === 'CONDITION' ? 'amount > 0' : undefined,
        };

        const contextKey = selectedDepartmentId || 'global';
        const newSteps = [...effectiveSteps, newStep];

        setWorkflows(prev => ({
            ...prev,
            [contextKey]: newSteps
        }));

        setShowAddStepModal(false);
    };

    const handleResetToGlobal = () => {
        if (!selectedDepartmentId) return;

        // Remove the override
        const newWorkflows = { ...workflows };
        delete newWorkflows[selectedDepartmentId];
        setWorkflows(newWorkflows);
    };

    const handleCreateOverride = () => {
        if (!selectedDepartmentId) return;

        // Clone global to local
        setWorkflows(prev => ({
            ...prev,
            [selectedDepartmentId]: [...workflows['global']]
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Approval Workflows</h1>
                    <p className="text-sm text-gray-500">Configure how purchase requests are routed and approved.</p>
                </div>


                <div className="flex items-center gap-3">
                    <Select
                        value={selectedDepartmentId || ''}
                        onChange={(val) => setSelectedDepartmentId(val || null)}
                        options={[
                            { value: '', label: 'Global Default' },
                            ...departments.map(dept => ({ value: dept.id, label: dept.name }))
                        ]}
                        disabled={loadingDepts}
                        className="min-w-[200px]"
                    />

                    <Button onClick={handleSave} disabled={loading} className="bg-primary-700 hover:bg-primary-600 whitespace-nowrap shrink-0">
                        {loading ? 'Saving...' : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Workflow Canvas */}
                <div className="lg:col-span-2 space-y-4">

                    {/* Context Banner */}
                    <div className={`p-4 rounded-lg flex items-center justify-between ${selectedDepartmentId ? 'bg-indigo-50 border border-indigo-100' : 'bg-gray-50 border border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${selectedDepartmentId ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-600 border border-gray-200'}`}>
                                {selectedDepartmentId ? <Building2 className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">
                                    {selectedDepartmentId
                                        ? departments.find(d => d.id === selectedDepartmentId)?.name
                                        : 'Global Default Workflow'}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {selectedDepartmentId
                                        ? (isInheriting ? 'Currently using global workflow' : 'Custom department workflow configured')
                                        : 'Applies to all departments unless overridden'}
                                </p>
                            </div>
                        </div>

                        {selectedDepartmentId && (
                            <div>
                                {isInheriting ? (
                                    <Button size="sm" variant="outline" onClick={handleCreateOverride}>
                                        Customize
                                    </Button>
                                ) : (
                                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleResetToGlobal}>
                                        Reset to Default
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-8 min-h-[600px] relative bg-dots ${isInheriting ? 'opacity-70' : ''}`}>
                        <div className="absolute inset-0 opacity-5 pointer-events-none"
                            style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                        </div>

                        <div className="flex flex-col items-center space-y-8 relative z-10">
                            {effectiveSteps.map((step, index) => (
                                <div key={step.id} className="flex flex-col items-center">
                                    {/* Connection Line (except for first) */}
                                    {index > 0 && (
                                        <div className="h-8 w-0.5 bg-gray-300 mb-2"></div>
                                    )}
                                    {index > 0 && <ArrowRight className="h-4 w-4 text-gray-400 mb-2 rotate-90" />}

                                    {/* Card */}
                                    <div className={`relative group w-80 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-md
                                        ${step.type === 'TRIGGER' ? 'bg-primary-50 border-primary-200' :
                                            step.type === 'CONDITION' ? 'bg-amber-50 border-amber-200' :
                                                'bg-white border-gray-200 hover:border-primary-500'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-2 inline-block
                                                    ${step.type === 'TRIGGER' ? 'bg-primary-100 text-primary-700' :
                                                        step.type === 'CONDITION' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-gray-100 text-gray-700'}`}>
                                                    {step.type}
                                                </span>
                                                <h3 className="font-semibold text-gray-900">{step.title}</h3>
                                                <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                                            </div>
                                            {step.type !== 'TRIGGER' && !isInheriting && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.id); }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 hover:text-red-500 rounded transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Add Step Button */}
                            {!isInheriting && (
                                <>
                                    <div className="h-8 w-0.5 bg-gray-300"></div>
                                    <button
                                        onClick={handleAddStepClick}
                                        className="flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-dashed border-gray-300 hover:border-primary-500 hover:text-primary-500 transition-colors"
                                    >
                                        <Plus className="h-5 w-5" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Configuration */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <h2 className="font-semibold text-gray-900 mb-4">Workflow Details</h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <p>
                                    {selectedDepartmentId
                                        ? "Configuring workflow specific to this department. Changes here won't affect the global default."
                                        : "Default workflow for all departments. Specific departmental overrides can be configured by switching the context above."}
                                </p>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Available Triggers</h3>
                                <div className="space-y-2">
                                    <div className="p-3 border border-gray-200 rounded-lg hover:border-primary-500 cursor-pointer transition-colors bg-gray-50">
                                        <p className="text-sm font-medium text-gray-900">Purchase Request</p>
                                        <p className="text-xs text-gray-500">Triggered when a new request is created</p>
                                    </div>
                                    <div className="p-3 border border-gray-200 rounded-lg hover:border-primary-500 cursor-pointer transition-colors opacity-60">
                                        <p className="text-sm font-medium text-gray-900">Invoice Received</p>
                                        <p className="text-xs text-gray-500">Coming soon</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-900 text-white rounded-xl p-6 shadow-lg">
                        <h3 className="font-semibold mb-2">Pro Tip</h3>
                        <p className="text-sm text-indigo-100">
                            You can set up multi-stage approvals. For example, require Department Head approval for all items, but add CFO approval only for items over £10,000.
                        </p>
                    </div>
                </div>
            </div>

            {/* Add Step Modal */}
            {showAddStepModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddStepModal(false)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Add Workflow Step</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Step Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        className={`p-3 rounded-lg border text-sm font-medium text-center transition-colors ${newStepType === 'APPROVAL' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        onClick={() => setNewStepType('APPROVAL')}
                                    >
                                        Approval
                                    </button>
                                    <button
                                        className={`p-3 rounded-lg border text-sm font-medium text-center transition-colors ${newStepType === 'CONDITION' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        onClick={() => setNewStepType('CONDITION')}
                                    >
                                        Condition
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                                    placeholder={newStepType === 'APPROVAL' ? "e.g. Manager Approval" : "e.g. Check Amount"}
                                    value={newStepTitle}
                                    onChange={(e) => setNewStepTitle(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                                    placeholder={newStepType === 'APPROVAL' ? "e.g. Requires manager sign-off" : "e.g. Amount > £1,000"}
                                    value={newStepDescription}
                                    onChange={(e) => setNewStepDescription(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <Button variant="ghost" onClick={() => setShowAddStepModal(false)}>Cancel</Button>
                                <Button onClick={confirmAddStep}>Add Step</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

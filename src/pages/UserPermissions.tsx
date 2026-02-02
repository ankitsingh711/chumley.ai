import { useState, useEffect } from 'react';
import { Search, Settings, CheckCircle, XCircle, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { usersApi } from '../services/users.service';
import { UserRole, type User } from '../types/api';

export default function UserPermissions() {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleValue, setRoleValue] = useState<UserRole>();
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'success' | 'error'>('success');
    const [modalMessage, setModalMessage] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            setRoleValue(selectedUser.role);
        }
    }, [selectedUser]);

    const fetchUsers = async () => {
        try {
            const data = await usersApi.getAll();
            setUsers(data);
            if (data.length > 0 && !selectedUser) {
                setSelectedUser(data[0]);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveChanges = async () => {
        if (!selectedUser) return;

        setSaving(true);
        try {
            const updated = await usersApi.update(selectedUser.id, {
                role: roleValue,
            });
            setSelectedUser(updated);
            // Update in list
            setUsers(users.map(u => u.id === updated.id ? updated : u));
            setModalType('success');
            setModalMessage(`Successfully updated ${updated.name}'s role to ${updated.role}`);
            setShowModal(true);
        } catch (error) {
            console.error('Failed to update user:', error);
            setModalType('error');
            setModalMessage('Failed to update user permissions. Please try again.');
            setShowModal(true);
        } finally {
            setSaving(false);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getRoleBadgeClass = (role: string) => {
        switch (role) {
            case 'ADMIN':
                return 'bg-teal-600 text-white';
            case 'MANAGER':
                return 'bg-blue-500 text-white';
            case 'APPROVER':
                return 'bg-purple-500 text-white';
            default:
                return 'bg-gray-100 text-gray-600';
        }
    };

    const getDepartmentName = (dept: any) => {
        if (!dept) return null;
        if (typeof dept === 'string') return dept;
        return dept.name;
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <div className="p-8 text-center">Loading users...</div>;
    }

    return (
        <div className="flex h-full gap-6">
            {/* Left Sidebar: Navigation & Organization */}
            <div className="w-80 flex-shrink-0 space-y-6">

                {/* Navigation */}
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <h2 className="font-semibold text-gray-900 mb-2 px-2">Settings</h2>
                    <nav className="space-y-1">
                        <div className="flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm font-medium text-teal-700">
                            <Settings className="h-4 w-4" />
                            <span>User Permissions</span>
                        </div>
                        <a href="/settings/approval-workflows" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                            <CheckCircle className="h-4 w-4" />
                            <span>Approval Workflows</span>
                        </a>
                    </nav>
                </div>

                {/* Organization List */}
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm h-fit">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-900">Organization</h2>
                        <Button variant="ghost" size="icon" className="h-6 w-6"><Settings className="h-4 w-4" /></Button>
                    </div>

                    <div className="relative mb-4">
                        <input
                            type="text"
                            placeholder="Filter members..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-8 pr-4 text-sm outline-none focus:border-teal-500"
                        />
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    </div>

                    <div className="space-y-1">
                        {filteredUsers.map(user => (
                            <div
                                key={user.id}
                                onClick={() => setSelectedUser(user)}
                                className={`flex items-center gap-3 rounded-lg p-2 cursor-pointer ${selectedUser?.id === user.id
                                    ? 'bg-teal-50 border border-teal-100'
                                    : 'hover:bg-gray-50'
                                    }`}
                            >
                                <div className="h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-xs">
                                    {getInitials(user.name)}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
                                    <p className="truncate text-xs text-gray-500">{getDepartmentName(user.department) || user.email}</p>
                                </div>
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getRoleBadgeClass(user.role)}`}>
                                    {user.role}
                                </span>
                            </div>
                        ))}
                    </div>

                    <p className="mt-4 text-xs text-gray-400 text-center">{users.length} total members</p>
                </div>
            </div>


            {/* Main Content: Settings */}
            {selectedUser && (
                <div className="flex-1 space-y-6">
                    <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b pb-6">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase">Settings &gt; User Permissions</p>
                                <h1 className="mt-1 text-2xl font-bold text-gray-900">Manage Access: {selectedUser.name}</h1>
                                <p className="text-sm text-teal-600 mt-1 max-w-xl">
                                    Configure granular permissions and spending limits for this user profile.
                                </p>
                            </div>
                            <div className="flex items-end gap-3">
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">ASSIGN ROLE</p>
                                    <select
                                        value={roleValue}
                                        onChange={(e) => setRoleValue(e.target.value as UserRole)}
                                        className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none"
                                    >
                                        <option value={UserRole.MEMBER}>Team Member</option>
                                        <option value={UserRole.MANAGER}>Manager</option>
                                        <option value={UserRole.SENIOR_MANAGER}>Senior Manager</option>
                                        <option value={UserRole.SYSTEM_ADMIN}>Administrator</option>
                                    </select>
                                </div>
                                <Button
                                    onClick={handleSaveChanges}
                                    disabled={saving || roleValue === selectedUser.role}
                                    className="bg-teal-700 hover:bg-teal-800"
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>

                        {/* User Info */}
                        <div className="py-6 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900 mb-4">User Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500">Email</p>
                                    <p className="text-sm font-medium text-gray-900">{selectedUser.email}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Department</p>
                                    <p className="text-sm font-medium text-gray-900">{getDepartmentName(selectedUser.department) || 'Not assigned'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Current Role</p>
                                    <p className="text-sm font-medium text-gray-900">{selectedUser.role}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">User ID</p>
                                    <p className="text-sm font-mono text-gray-600">{selectedUser.id}</p>
                                </div>
                            </div>
                        </div>

                        {/* Role-Based Permissions Description */}
                        <div className="py-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Role Permissions</h3>
                            <div className="grid grid-cols-1 gap-4">
                                {roleValue === UserRole.SYSTEM_ADMIN && (
                                    <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
                                        <h4 className="font-medium text-teal-900">Administrator</h4>
                                        <ul className="mt-2 text-sm text-teal-700 space-y-1">
                                            <li>• Full system access and user management</li>
                                            <li>• Can create, approve, and manage all requests</li>
                                            <li>• Access to all suppliers and purchase orders</li>
                                            <li>• View and export all reports</li>
                                        </ul>
                                    </div>
                                )}
                                {roleValue === UserRole.SENIOR_MANAGER && (
                                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                        <h4 className="font-medium text-blue-900">Senior Manager</h4>
                                        <ul className="mt-2 text-sm text-blue-700 space-y-1">
                                            <li>• Can create and manage suppliers</li>
                                            <li>• Approve purchase requests for department</li>
                                            <li>• View department reports and budget</li>
                                        </ul>
                                    </div>
                                )}
                                {roleValue === UserRole.MANAGER && (
                                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                                        <h4 className="font-medium text-purple-900">Manager</h4>
                                        <ul className="mt-2 text-sm text-purple-700 space-y-1">
                                            <li>• Approve purchase requests</li>
                                            <li>• View assigned requests</li>
                                            <li>• Manage direct reports</li>
                                        </ul>
                                    </div>
                                )}
                                {roleValue === UserRole.MEMBER && (
                                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                        <h4 className="font-medium text-gray-900">Team Member</h4>
                                        <ul className="mt-2 text-sm text-gray-700 space-y-1">
                                            <li>• Can create purchase requests</li>
                                            <li>• View own requests</li>
                                            <li>• Basic system access</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success/Error Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`flex-shrink-0 ${modalType === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                {modalType === 'success' ? (
                                    <CheckCircle className="h-12 w-12" />
                                ) : (
                                    <XCircle className="h-12 w-12" />
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    {modalType === 'success' ? 'Success!' : 'Error'}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {modalMessage}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <Button
                                onClick={() => setShowModal(false)}
                                className={modalType === 'success' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-gray-600 hover:bg-gray-700'}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

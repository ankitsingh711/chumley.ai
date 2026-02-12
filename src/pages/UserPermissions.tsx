import { useState, useEffect } from 'react';
import { Search, Settings, CheckCircle, XCircle, X, User as UserIcon } from 'lucide-react';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { usersApi } from '../services/users.service';
import { departmentsApi } from '../services/departments.service';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, UserStatus, type User } from '../types/api';

export default function UserPermissions() {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'permissions' | 'profile'>('permissions');
    const [searchQuery, setSearchQuery] = useState('');
    const [roleValue, setRoleValue] = useState<UserRole>();
    const [showModal, setShowModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteData, setInviteData] = useState<{
        name: string;
        email: string;
        role: UserRole;
        departmentId?: string;
    }>({
        name: '',
        email: '',
        role: UserRole.MEMBER,
        departmentId: ''
    });
    const [inviting, setInviting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [modalType, setModalType] = useState<'success' | 'error'>('success');
    const [modalMessage, setModalMessage] = useState('');

    const { user: currentUser, isLoading: authLoading } = useAuth();

    const [departments, setDepartments] = useState<any[]>([]);

    useEffect(() => {
        if (!authLoading) {
            fetchUsers();
            fetchDepartments();
        }
    }, [currentUser, authLoading]);

    const fetchDepartments = async () => {
        try {
            const data = await departmentsApi.getAll();
            setDepartments(data);
        } catch (error) {
            console.error('Failed to fetch departments:', error);
        }
    };

    useEffect(() => {
        if (selectedUser) {
            setRoleValue(selectedUser.role);
        }
    }, [selectedUser]);

    const fetchUsers = async () => {
        try {
            const data = await usersApi.getAll();

            // RBAC Filtering
            let accessibleUsers = data;

            if (currentUser?.role === UserRole.SYSTEM_ADMIN) {
                // Admin sees everyone EXCEPT other System Admins (to keep main admin hidden/protected)
                // accessibleUsers = data;
                accessibleUsers = data.filter(u => u.role !== UserRole.SYSTEM_ADMIN);
            } else if (currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.SENIOR_MANAGER) {
                // Managers see only their department
                if (currentUser.department) {
                    const currentDeptId = typeof currentUser.department === 'string'
                        ? currentUser.department
                        : currentUser.department.id;

                    accessibleUsers = data.filter(u => {
                        const userDeptId = typeof u.department === 'string'
                            ? u.department
                            : u.department?.id;
                        return userDeptId === currentDeptId;
                    });
                } else {
                    // Fallback if manager has no department assigned
                    accessibleUsers = [];
                }
            } else {
                // Members shouldn't see anyone (or maybe just themselves)
                accessibleUsers = data.filter(u => u.id === currentUser?.id);
            }

            setUsers(accessibleUsers);
            if (accessibleUsers.length > 0 && !selectedUser) {
                setSelectedUser(accessibleUsers[0]);
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

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        try {
            await usersApi.invite(inviteData);
            setModalType('success');
            setModalMessage(`Successfully invited ${inviteData.name}. An email has been sent to ${inviteData.email} with instructions to set up their account.`);
            setShowInviteModal(false);
            setInviteData({ name: '', email: '', role: UserRole.MEMBER, departmentId: '' });
            fetchUsers();
            setShowModal(true);
        } catch (error: any) {
            console.error('Failed to invite user:', error);
            setModalType('error');
            setModalMessage(error.response?.data?.error || 'Failed to invite user.');
            setShowModal(true);
        } finally {
            setInviting(false);
        }
    };

    const handleUpdateStatus = async (newStatus: UserStatus) => {
        if (!selectedUser) return;

        try {
            const updatedUser = await usersApi.update(selectedUser.id, { status: newStatus });

            // Update lists
            const updatedList = users.map(u => u.id === selectedUser.id ? updatedUser : u);
            setUsers(updatedList);
            setSelectedUser(updatedUser);

            setModalType('success');
            setModalMessage(`User ${newStatus === UserStatus.ACTIVE ? 'activated' : 'suspended'} successfully.`);
            setShowModal(true);
        } catch (error) {
            console.error('Failed to update user status:', error);
            setModalType('error');
            setModalMessage('Failed to update status. Please try again.');
            setShowModal(true);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;

        setDeleting(true);
        try {
            await usersApi.delete(selectedUser.id);
            setModalType('success');
            setModalMessage(`Successfully deleted user ${selectedUser.name}.`);
            setShowDeleteModal(false);

            // Remove from list
            const updatedUsers = users.filter(u => u.id !== selectedUser.id);
            setUsers(updatedUsers);
            setSelectedUser(updatedUsers.length > 0 ? updatedUsers[0] : null);

            setShowModal(true);
        } catch (error) {
            console.error('Failed to delete user:', error);
            setModalType('error');
            setModalMessage('Failed to delete user. Please try again.');
            setShowModal(true);
        } finally {
            setDeleting(false);
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
            case 'SYSTEM_ADMIN':
                return 'bg-purple-100 text-purple-700';
            case 'MANAGER':
            case 'SENIOR_MANAGER':
                return 'bg-blue-100 text-blue-700';
            case 'MEMBER':
                return 'bg-gray-100 text-gray-700';
            default:
                return 'bg-gray-100 text-gray-600';
        }
    };

    const getStatusBadgeClass = (status?: string) => {
        // Default to ACTIVE if status is missing (legacy users or default)
        const normalizedStatus = status || 'ACTIVE';

        switch (normalizedStatus) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'SUSPENDED':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-gray-100 text-gray-600 border-gray-200';
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
                        <button
                            onClick={() => setActiveTab('permissions')}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'permissions'
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <Settings className="h-4 w-4" />
                            <span>User Permissions</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'profile'
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <UserIcon className="h-4 w-4" />
                            <span>My Profile</span>
                        </button>
                        <a href="/settings/approval-workflows" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                            <CheckCircle className="h-4 w-4" />
                            <span>Approval Workflows</span>
                        </a>
                    </nav>
                </div>

                {/* Organization List - Only show when in Permissions tab */}
                {activeTab === 'permissions' && (
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm h-fit">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-gray-900">Organization</h2>
                            <div className="flex gap-2">
                                {(currentUser?.role === UserRole.SYSTEM_ADMIN || currentUser?.role === UserRole.SENIOR_MANAGER) && (
                                    <Button size="sm" onClick={() => setShowInviteModal(true)} className="bg-primary-600 hover:bg-primary-700 text-white h-7 text-xs px-2">
                                        + Invite
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="relative mb-4">
                            <input
                                type="text"
                                placeholder="Filter members..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-8 pr-4 text-sm outline-none focus:border-primary-500"
                            />
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        </div>

                        <div className="space-y-1">
                            {filteredUsers.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => setSelectedUser(user)}
                                    className={`flex items-center gap-3 rounded-lg p-2 cursor-pointer ${selectedUser?.id === user.id
                                        ? 'bg-primary-50 border border-primary-100'
                                        : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-xs">
                                        {getInitials(user.name)}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
                                        <p className="truncate text-xs text-gray-500">{getDepartmentName(user.department) || user.email}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getRoleBadgeClass(user.role)}`}>
                                            {user.role === 'SYSTEM_ADMIN' ? 'ADMIN' : user.role === 'SENIOR_MANAGER' ? 'SR. MGR' : user.role}
                                        </span>
                                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${getStatusBadgeClass(user.status)}`}>
                                            {user.status || 'ACTIVE'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="mt-4 text-xs text-gray-400 text-center">{users.length} total members</p>
                    </div>
                )}
            </div>


            {/* Main Content: Settings OR Profile */}
            {activeTab === 'permissions' ? (
                selectedUser && (
                    <div className="flex-1 space-y-6">
                        <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b pb-6">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase">Settings &gt; User Permissions</p>
                                    <h1 className="mt-1 text-2xl font-bold text-gray-900">Manage Access: {selectedUser.name}</h1>
                                    <p className="text-sm text-primary-600 mt-1 max-w-xl">
                                        Configure granular permissions and spending limits for this user profile.
                                    </p>
                                </div>
                                <div className="flex items-end gap-3">
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">ASSIGN ROLE</p>
                                        <Select
                                            value={roleValue}
                                            onChange={(val) => setRoleValue(val as UserRole)}
                                            options={[
                                                { value: UserRole.MEMBER, label: 'Team Member' },
                                                { value: UserRole.MANAGER, label: 'Manager' },
                                                { value: UserRole.SENIOR_MANAGER, label: 'Senior Manager' },
                                            ]}
                                            className="mt-1 min-w-[200px]"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleSaveChanges}
                                        disabled={saving || roleValue === selectedUser.role}
                                        className="bg-primary-700 hover:bg-primary-600"
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
                                        <p className="text-xs text-gray-500">Status</p>
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusBadgeClass(selectedUser.status)} ring-gray-500/10 mt-1`}>
                                            {selectedUser.status || 'ACTIVE'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Role-Based Permissions Description */}
                            <div className="py-6">
                                <h3 className="font-semibold text-gray-900 mb-4">Role Permissions</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {roleValue === UserRole.SYSTEM_ADMIN && (
                                        <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
                                            <h4 className="font-medium text-primary-900">Administrator</h4>
                                            <ul className="mt-2 text-sm text-primary-700 space-y-1">
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

                            {/* Actions - Only for Admins */}
                            {currentUser?.role === UserRole.SYSTEM_ADMIN && selectedUser.id !== currentUser.id && (
                                <div className="py-6 border-t border-gray-100 space-y-6">
                                    {/* Suspend/Activate User */}
                                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium text-gray-900">
                                                {selectedUser.status === UserStatus.SUSPENDED ? 'Activate User' : 'Suspend User'}
                                            </h4>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {selectedUser.status === UserStatus.SUSPENDED
                                                    ? 'Restore access for this user.'
                                                    : 'Temporarily disable access for this user.'}
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => handleUpdateStatus(
                                                selectedUser.status === UserStatus.SUSPENDED ? UserStatus.ACTIVE : UserStatus.SUSPENDED
                                            )}
                                            className={selectedUser.status === UserStatus.SUSPENDED
                                                ? "border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                                                : "border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300"}
                                        >
                                            {selectedUser.status === UserStatus.SUSPENDED ? 'Activate User' : 'Suspend User'}
                                        </Button>
                                    </div>

                                    {/* Danger Zone */}
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium text-red-900">Delete User</h4>
                                            <p className="text-sm text-red-700 mt-1">
                                                Permanently remove this user and all of their data. This action cannot be undone.
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowDeleteModal(true)}
                                            className="border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 hover:border-red-300"
                                        >
                                            Delete User
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            ) : (
                // My Profile View
                currentUser && (
                    <div className="flex-1 space-y-6">
                        <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
                            {/* Header */}
                            <div className="border-b pb-6">
                                <p className="text-xs font-medium text-gray-500 uppercase">Settings &gt; My Profile</p>
                                <h1 className="mt-1 text-2xl font-bold text-gray-900">My Profile</h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    Manage your account details and preferences.
                                </p>
                            </div>

                            {/* User Info */}
                            <div className="py-6">
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="h-20 w-20 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-2xl shadow-md">
                                        {getInitials(currentUser.name)}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{currentUser.name}</h3>
                                        <p className="text-gray-500">{currentUser.email}</p>
                                        <div className="flex gap-2 mt-2">
                                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${getRoleBadgeClass(currentUser.role)}`}>
                                                {currentUser.role === 'SYSTEM_ADMIN' ? 'ADMIN' : currentUser.role.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-gray-900 border-b pb-2">Account Details</h4>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold">Full Name</p>
                                            <p className="text-sm text-gray-900 mt-1">{currentUser.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold">Email Address</p>
                                            <p className="text-sm text-gray-900 mt-1">{currentUser.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold">Department</p>
                                            <p className="text-sm text-gray-900 mt-1">
                                                {(() => {
                                                    if (!currentUser.departmentId && !currentUser.department) return 'Not Assigned';

                                                    // Try to get from object
                                                    if (currentUser.department) {
                                                        return typeof currentUser.department === 'string'
                                                            ? currentUser.department
                                                            : currentUser.department.name;
                                                    }

                                                    // Try to look up using departmentId from fetched departments list
                                                    if (currentUser.departmentId) {
                                                        const dept = departments.find(d => d.id === currentUser.departmentId);
                                                        return dept ? dept.name : 'Unknown Department';
                                                    }

                                                    return 'Not Assigned';
                                                })()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-gray-900 border-b pb-2">System Access</h4>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold">Role</p>
                                            <p className="text-sm text-gray-900 mt-1">{currentUser.role}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold">Status</p>
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusBadgeClass(currentUser.status)} ring-gray-500/10 mt-1`}>
                                                {currentUser.status || 'ACTIVE'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold">Member Since</p>
                                            <p className="text-sm text-gray-900 mt-1">
                                                {currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowDeleteModal(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-4 mb-4">
                            <div className="flex-shrink-0 text-red-500 bg-red-100 rounded-full p-2">
                                <XCircle className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Delete User?</h3>
                                <p className="text-sm text-gray-600 mt-2">
                                    Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone.
                                </p>

                                <div className="mt-4 bg-red-50 border border-red-100 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-red-800 uppercase mb-2">
                                        Impact of deleting this {selectedUser?.role?.replace('_', ' ')}:
                                    </p>
                                    <ul className="text-xs text-red-700 space-y-1 list-disc pl-4">
                                        {selectedUser?.role === UserRole.MANAGER && (
                                            <>
                                                <li>Pending approvals assigned to them will be orphaned.</li>
                                                <li>Team members will need reassignment.</li>
                                                <li>Historical approval records remain.</li>
                                            </>
                                        )}
                                        {selectedUser?.role === UserRole.SENIOR_MANAGER && (
                                            <>
                                                <li>Department budget oversight will be removed.</li>
                                                <li>Supplier management access will be revoked.</li>
                                                <li>Pending high-value approvals may stall.</li>
                                            </>
                                        )}
                                        {selectedUser?.role === UserRole.MEMBER && (
                                            <>
                                                <li>Their active purchase requests will be cancelled.</li>
                                                <li>Access to create new requests will be revoked immediately.</li>
                                            </>
                                        )}
                                        {selectedUser?.role === UserRole.SYSTEM_ADMIN && (
                                            <>
                                                <li>Full system administrative access will be lost.</li>
                                                <li>Critical system configurations may be inaccessible if they are the sole owner.</li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setShowDeleteModal(false)}
                                className="border-gray-200 text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDeleteUser}
                                disabled={deleting}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {deleting ? 'Deleting...' : 'Delete User'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite User Modal */}
            {showInviteModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowInviteModal(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Invite New User</h3>
                        <form onSubmit={handleInviteUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={inviteData.name}
                                    onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={inviteData.email}
                                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <Select
                                    value={inviteData.departmentId}
                                    onChange={(val) => setInviteData({ ...inviteData, departmentId: val })}
                                    options={[
                                        { value: '', label: 'Select Department...' },
                                        ...departments.map(d => ({ value: d.id, label: d.name }))
                                    ]}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <Select
                                    value={inviteData.role}
                                    onChange={(val) => setInviteData({ ...inviteData, role: val as UserRole })}
                                    options={[
                                        { value: UserRole.MEMBER, label: 'Team Member' },
                                        { value: UserRole.MANAGER, label: 'Manager' },
                                        { value: UserRole.SENIOR_MANAGER, label: 'Senior Manager' },
                                    ]}
                                    className="w-full"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowInviteModal(false)}
                                    className="border-gray-200 text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={inviting}
                                    className="bg-primary-600 hover:bg-primary-700 text-white"
                                >
                                    {inviting ? 'Sending...' : 'Send Invitation'}
                                </Button>
                            </div>
                        </form>
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
                                className={modalType === 'success' ? 'bg-primary-600 hover:bg-primary-600' : 'bg-gray-600 hover:bg-gray-700'}
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

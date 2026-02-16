import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, User as UserIcon, Shield, Mail, Building, Calendar, ChevronRight, Trash2, UserPlus, AlertTriangle, Check } from 'lucide-react';
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
                // Admin sees everyone EXCEPT other System Admins (optional)
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
                    accessibleUsers = [];
                }
            } else {
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

    const getDepartmentName = (dept: any) => {
        if (!dept) return null;
        if (typeof dept === 'string') return dept;
        return dept.name;
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const RoleBadge = ({ role }: { role: string }) => {
        const styles = {
            'SYSTEM_ADMIN': 'bg-purple-100 text-purple-700 ring-purple-500/10',
            'ADMIN': 'bg-purple-100 text-purple-700 ring-purple-500/10',
            'SENIOR_MANAGER': 'bg-indigo-100 text-indigo-700 ring-indigo-500/10',
            'MANAGER': 'bg-blue-100 text-blue-700 ring-blue-500/10',
            'MEMBER': 'bg-slate-100 text-slate-600 ring-slate-500/10',
        };
        const label = role === 'SYSTEM_ADMIN' ? 'Admin' : role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        return (
            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${styles[role as keyof typeof styles] || styles.MEMBER}`}>
                {label}
            </span>
        );
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles = {
            'ACTIVE': 'bg-green-50 text-green-700 ring-green-600/20',
            'PENDING': 'bg-amber-50 text-amber-700 ring-amber-600/20',
            'SUSPENDED': 'bg-red-50 text-red-700 ring-red-600/20',
        };
        return (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${styles[status as keyof typeof styles] || styles.ACTIVE}`}>
                {status}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-theme(spacing.20))] gap-8">
            {/* Left Sidebar: Navigation & Organization */}
            <div className="w-80 flex-shrink-0 flex flex-col gap-6">

                {/* Navigation Group */}
                <div className="space-y-1">
                    <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Settings</h3>
                    <button
                        onClick={() => setActiveTab('permissions')}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === 'permissions'
                            ? 'bg-white text-primary-700 shadow-sm ring-1 ring-gray-200'
                            : 'text-gray-600 hover:bg-gray-100/50 hover:text-gray-900'
                            }`}
                    >
                        <Shield className="h-4 w-4" />
                        <span>User Permissions</span>
                        {activeTab === 'permissions' && <ChevronRight className="h-4 w-4 ml-auto text-gray-400" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === 'profile'
                            ? 'bg-white text-primary-700 shadow-sm ring-1 ring-gray-200'
                            : 'text-gray-600 hover:bg-gray-100/50 hover:text-gray-900'
                            }`}
                    >
                        <UserIcon className="h-4 w-4" />
                        <span>My Profile</span>
                        {activeTab === 'profile' && <ChevronRight className="h-4 w-4 ml-auto text-gray-400" />}
                    </button>

                </div>

                {/* Organization List - Only show when in Permissions tab */}
                {activeTab === 'permissions' && (
                    <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-semibold text-gray-900">Team Members</h2>
                                {(currentUser?.role === UserRole.SYSTEM_ADMIN || currentUser?.role === UserRole.SENIOR_MANAGER) && (
                                    <button
                                        onClick={() => setShowInviteModal(true)}
                                        className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 p-1.5 rounded-md transition-colors"
                                        title="Invite User"
                                    >
                                        <UserPlus className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full rounded-lg border-0 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
                            {filteredUsers.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => setSelectedUser(user)}
                                    className={`group flex items-center gap-3 rounded-lg p-2.5 cursor-pointer transition-all ${selectedUser?.id === user.id
                                        ? 'bg-primary-50/60 ring-1 ring-primary-100'
                                        : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white font-medium text-xs shadow-sm ring-2 ring-white ${selectedUser?.id === user.id ? 'bg-primary-600' : 'bg-slate-400 group-hover:bg-slate-500 transition-colors'
                                        }`}>
                                        {getInitials(user.name)}
                                    </div>
                                    <div className="flex-1 overflow-hidden min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`truncate text-sm font-medium ${selectedUser?.id === user.id ? 'text-primary-900' : 'text-gray-900'
                                                }`}>
                                                {user.name}
                                            </p>
                                        </div>
                                        <p className="truncate text-xs text-gray-500">{getDepartmentName(user.department) || 'No Dept.'}</p>
                                    </div>
                                    {selectedUser?.id === user.id && (
                                        <ChevronRight className="h-4 w-4 text-primary-400" />
                                    )}
                                </div>
                            ))}
                            {filteredUsers.length === 0 && (
                                <div className="p-4 text-center text-sm text-gray-500">
                                    No members found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                {activeTab === 'permissions' && selectedUser ? (
                    <>
                        {/* Header Banner */}
                        <div className="relative bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 p-8">
                            <div className="flex items-start justify-between relative z-10">
                                <div className="flex gap-5">
                                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-white">
                                        {getInitials(selectedUser.name)}
                                    </div>
                                    <div className="pt-1">
                                        <h1 className="text-2xl font-bold text-gray-900">{selectedUser.name}</h1>
                                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <Mail className="h-3.5 w-3.5" />
                                                {selectedUser.email}
                                            </div>
                                            <div className="h-1 w-1 rounded-full bg-gray-300"></div>
                                            <div className="flex items-center gap-1.5">
                                                <Building className="h-3.5 w-3.5" />
                                                {getDepartmentName(selectedUser.department) || 'Global'}
                                            </div>
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                            <RoleBadge role={selectedUser.role} />
                                            <StatusBadge status={selectedUser.status || UserStatus.ACTIVE} />
                                        </div>
                                    </div>
                                </div>

                                {/* Header Actions */}
                                <div className="flex flex-col items-end gap-3">
                                    <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="px-3 py-1.5 border-r border-gray-100">
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Role Assignment</label>
                                            <Select
                                                value={roleValue}
                                                onChange={(val) => setRoleValue(val as UserRole)}
                                                options={[
                                                    { value: UserRole.MEMBER, label: 'Team Member' },
                                                    { value: UserRole.MANAGER, label: 'Manager' },
                                                    { value: UserRole.SENIOR_MANAGER, label: 'Senior Manager' },
                                                ]}
                                                triggerClassName="border-none p-0 h-auto text-sm font-semibold text-gray-900 focus:ring-0 w-32 bg-transparent"
                                                className="w-auto h-auto"
                                            />
                                        </div>
                                        <Button
                                            onClick={handleSaveChanges}
                                            disabled={saving || roleValue === selectedUser.role}
                                            className={`mx-1 ${roleValue !== selectedUser.role ? 'bg-primary-600 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}
                                            size="sm"
                                        >
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Decorative Pattern */}
                            <div className="absolute top-0 right-0 w-64 h-full opacity-[0.03] bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
                        </div>

                        {/* Scrolling Content */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column: Info & Permissions */}
                                <div className="lg:col-span-2 space-y-8">

                                    {/* Role Capabilities Card */}
                                    <section>
                                        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-primary-500" />
                                            Role Capabilities
                                        </h3>
                                        <div className={`rounded-xl border p-5 ${roleValue === UserRole.SYSTEM_ADMIN ? 'bg-purple-50/50 border-purple-100' :
                                            roleValue === UserRole.SENIOR_MANAGER ? 'bg-indigo-50/50 border-indigo-100' :
                                                roleValue === UserRole.MANAGER ? 'bg-blue-50/50 border-blue-100' :
                                                    'bg-gray-50/50 border-gray-100'
                                            }`}>
                                            <div className="flex items-start gap-4">
                                                <div className={`p-2 rounded-lg ${roleValue === UserRole.SYSTEM_ADMIN ? 'bg-purple-100 text-purple-600' :
                                                    roleValue === UserRole.SENIOR_MANAGER ? 'bg-indigo-100 text-indigo-600' :
                                                        roleValue === UserRole.MANAGER ? 'bg-blue-100 text-blue-600' :
                                                            'bg-white text-gray-500 border border-gray-200'
                                                    }`}>
                                                    <Shield className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 text-lg">
                                                        {roleValue === UserRole.SYSTEM_ADMIN ? 'System Administrator' :
                                                            roleValue === UserRole.SENIOR_MANAGER ? 'Senior Manager' :
                                                                roleValue === UserRole.MANAGER ? 'Manager' : 'Team Member'}
                                                    </h4>
                                                    <p className="text-sm text-gray-600 mt-1 mb-4">
                                                        {roleValue === UserRole.SYSTEM_ADMIN ? 'Full access to all system settings, users, and financial data.' :
                                                            roleValue === UserRole.SENIOR_MANAGER ? 'Can manage budget, suppliers, and approve high-value requests.' :
                                                                roleValue === UserRole.MANAGER ? 'Can approve team requests and manage direct reports.' :
                                                                    'Basic access to create requests and view own history.'}
                                                    </p>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                        {(roleValue === UserRole.SYSTEM_ADMIN || roleValue === UserRole.SENIOR_MANAGER || roleValue === UserRole.MANAGER) && (
                                                            <div className="flex items-center gap-2 text-gray-700">
                                                                <Check className="h-4 w-4 text-green-500" />
                                                                <span>Approve Requests</span>
                                                            </div>
                                                        )}
                                                        {(roleValue === UserRole.SYSTEM_ADMIN || roleValue === UserRole.SENIOR_MANAGER) && (
                                                            <div className="flex items-center gap-2 text-gray-700">
                                                                <Check className="h-4 w-4 text-green-500" />
                                                                <span>Manage Suppliers</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 text-gray-700">
                                                            <Check className="h-4 w-4 text-green-500" />
                                                            <span>Create Purchase Requests</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-gray-700">
                                                            <Check className="h-4 w-4 text-green-500" />
                                                            <span>View Own History</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                {/* Right Column: Meta & Actions */}
                                <div className="space-y-6">
                                    {/* User Meta Card */}
                                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 space-y-4">
                                        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-widest">Metadata</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <div className="text-xs text-gray-400 mb-0.5">User ID</div>
                                                <div className="text-xs font-mono text-gray-600 bg-white px-2 py-1 rounded border border-gray-200 inline-block">{selectedUser.id.split('-')[0]}...</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-400 mb-0.5">Joined</div>
                                                <div className="text-sm text-gray-700 flex items-center gap-2">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-400 mb-0.5">Last Active</div>
                                                <div className="text-sm text-gray-700">Today, 10:42 AM</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Admin Actions */}
                                    {currentUser?.role === UserRole.SYSTEM_ADMIN && selectedUser.id !== currentUser.id && (
                                        <div className="space-y-3 pt-4 border-t border-gray-100">
                                            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-widest">Danger Zone</h3>

                                            <button
                                                onClick={() => handleUpdateStatus(
                                                    selectedUser.status === UserStatus.SUSPENDED ? UserStatus.ACTIVE : UserStatus.SUSPENDED
                                                )}
                                                className={`w-full flex items-center justify-between p-3 rounded-lg border text-sm font-medium transition-colors ${selectedUser.status === UserStatus.SUSPENDED
                                                    ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                                    : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                                                    }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    {selectedUser.status === UserStatus.SUSPENDED ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                                    {selectedUser.status === UserStatus.SUSPENDED ? 'Activate User' : 'Suspend Access'}
                                                </span>
                                            </button>

                                            <button
                                                onClick={() => setShowDeleteModal(true)}
                                                className="w-full flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete User
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : activeTab === 'profile' && currentUser ? (
                    // My Profile View
                    <div className="flex-1 overflow-y-auto">
                        <div className="max-w-3xl mx-auto p-8 space-y-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                                <p className="text-gray-500 mt-1">Manage your account settings and preferences</p>
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-6">
                                <div className="h-24 w-24 rounded-full bg-primary-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-primary-50">
                                    {getInitials(currentUser.name)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{currentUser.name}</h2>
                                    <p className="text-gray-500">{currentUser.email}</p>
                                    <div className="flex items-center gap-2 mt-3">
                                        <RoleBadge role={currentUser.role} />
                                        <span className="text-xs text-gray-400">•</span>
                                        <span className="text-xs text-gray-500">{getDepartmentName(currentUser.department) || 'No Department'}</span>
                                    </div>
                                </div>
                                <div className="ml-auto">
                                    <Button variant="outline" size="sm">Edit Profile</Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                                    <h3 className="font-semibold text-gray-900 mb-4">Personal Info</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Full Name</label>
                                            <p className="text-sm text-gray-900 mt-1">{currentUser.name}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Email</label>
                                            <p className="text-sm text-gray-900 mt-1">{currentUser.email}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
                                            <p className="text-sm text-gray-400 mt-1 italic">Not set</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                                    <h3 className="font-semibold text-gray-900 mb-4">System Access</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Role</label>
                                            <p className="text-sm text-gray-900 mt-1">{currentUser.role.replace('_', ' ')}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Department</label>
                                            <p className="text-sm text-gray-900 mt-1">{getDepartmentName(currentUser.department) || 'None'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Timezone</label>
                                            <p className="text-sm text-gray-900 mt-1">London (GMT+1)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        Select a user to view details
                    </div>
                )}
            </div>

            {/* Invite User Modal */}
            {showInviteModal && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in"
                    onClick={() => setShowInviteModal(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Invite Team Member</h3>
                        <p className="text-sm text-gray-500 mb-6">Send an invitation email to add a new user.</p>

                        <form onSubmit={handleInviteUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={inviteData.name}
                                    onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    placeholder="e.g. Jane Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={inviteData.email}
                                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    placeholder="jane@company.com"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Department</label>
                                    <Select
                                        value={inviteData.departmentId}
                                        onChange={(val) => setInviteData({ ...inviteData, departmentId: val })}
                                        options={[
                                            { value: '', label: 'Select...' },
                                            ...departments.map(d => ({ value: d.id, label: d.name }))
                                        ]}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Role</label>
                                    <Select
                                        value={inviteData.role}
                                        onChange={(val) => setInviteData({ ...inviteData, role: val as UserRole })}
                                        options={[
                                            { value: UserRole.MEMBER, label: 'Member' },
                                            { value: UserRole.MANAGER, label: 'Manager' },
                                            { value: UserRole.SENIOR_MANAGER, label: 'Sr. Manager' },
                                        ]}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowInviteModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={inviting}
                                    className="bg-primary-600 hover:bg-primary-700 text-white"
                                >
                                    {inviting ? 'Sending...' : 'Send Invite'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete/Feedback Modals */}
            {/* ... (Keeping these simple/standard, but styled cleaner) ... */}
            {showDeleteModal && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => setShowDeleteModal(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                            <Trash2 className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete User?</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteUser} disabled={deleting}>
                                {deleting ? 'Deleting...' : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full flex items-start gap-4" onClick={e => e.stopPropagation()}>
                        <div className={`p-2 rounded-full ${modalType === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {modalType === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{modalType === 'success' ? 'Success' : 'Error'}</h3>
                            <p className="text-sm text-gray-500 mt-1">{modalMessage}</p>
                            <div className="mt-4 text-right">
                                <button onClick={() => setShowModal(false)} className="text-sm font-medium text-gray-500 hover:text-gray-900">Dismiss</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, CheckCircle, XCircle, User as UserIcon, Shield, Mail, Building, Calendar, ChevronRight, Trash2, UserPlus, AlertTriangle, Check, Copy, X } from 'lucide-react';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { UserPermissionsSkeleton } from '../components/skeletons/UserPermissionsSkeleton';
import { EditProfileModal } from '../components/users/EditProfileModal';
import { usersApi } from '../services/users.service';
import { departmentsApi, type Department } from '../services/departments.service';
import { useAuth } from '../hooks/useAuth';
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
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [modalType, setModalType] = useState<'success' | 'error'>('success');
    const [modalMessage, setModalMessage] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState<{
        name: string;
        email: string;
        role: UserRole;
        departmentName?: string;
        inviteLink?: string;
        statusMessage?: string;
    } | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);

    const { user: currentUser, isLoading: authLoading } = useAuth();
    const [departments, setDepartments] = useState<Department[]>([]);

    const extractInviteErrorMessage = (error: unknown): string => {
        if (typeof error === 'object' && error !== null && 'response' in error) {
            const response = (error as { response?: { data?: { error?: string } } }).response;
            if (response?.data?.error) return response.data.error;
        }
        return 'Failed to invite user.';
    };

    const dismissFeedbackModal = () => {
        setShowModal(false);
        setLinkCopied(false);
    };

    const openInviteModalFromSuccess = () => {
        dismissFeedbackModal();
        setInviteSuccess(null);
        setShowInviteModal(true);
    };

    const handleCopyInviteLink = async () => {
        if (!inviteSuccess?.inviteLink) return;
        try {
            await navigator.clipboard.writeText(inviteSuccess.inviteLink);
            setLinkCopied(true);
        } catch (error) {
            console.error('Failed to copy invitation link:', error);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            fetchUsers();
            fetchDepartments();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, authLoading]);

    useEffect(() => {
        if (!authLoading && currentUser && currentUser.role !== UserRole.SYSTEM_ADMIN && activeTab === 'permissions') {
            setActiveTab('profile');
        }
    }, [currentUser, authLoading, activeTab]);

    useEffect(() => {
        if (!showModal) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                dismissFeedbackModal();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showModal]);

    useEffect(() => {
        if (!showInviteModal) return;

        const previousOverflow = document.body.style.overflow;
        const previousPaddingRight = document.body.style.paddingRight;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.style.paddingRight = previousPaddingRight;
        };
    }, [showInviteModal]);

    useEffect(() => {
        if (!linkCopied) return;

        const timeoutId = window.setTimeout(() => setLinkCopied(false), 2200);
        return () => window.clearTimeout(timeoutId);
    }, [linkCopied]);

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
            setModalMessage(`Successfully updated ${updated.name} 's role to ${updated.role}`);
            setInviteSuccess(null);
            setShowModal(true);
        } catch (error) {
            console.error('Failed to update user:', error);
            setModalType('error');
            setModalMessage('Failed to update user permissions. Please try again.');
            setInviteSuccess(null);
            setShowModal(true);
        } finally {
            setSaving(false);
        }
    };

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        try {
            const response = await usersApi.invite(inviteData);
            const selectedDepartmentName = departments.find((department) => department.id === inviteData.departmentId)?.name;

            setModalType('success');
            setModalMessage(response?.message || 'Invitation sent successfully.');
            setInviteSuccess({
                name: inviteData.name,
                email: inviteData.email,
                role: inviteData.role,
                departmentName: selectedDepartmentName,
                inviteLink: response?.inviteLink,
                statusMessage: response?.message,
            });
            setLinkCopied(false);
            setShowInviteModal(false);
            setInviteData({ name: '', email: '', role: UserRole.MEMBER, departmentId: '' });
            fetchUsers();
            setShowModal(true);
        } catch (error: unknown) {
            console.error('Failed to invite user:', error);
            setModalType('error');
            setModalMessage(extractInviteErrorMessage(error));
            setInviteSuccess(null);
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
            setInviteSuccess(null);
            setShowModal(true);
        } catch (error) {
            console.error('Failed to update user status:', error);
            setModalType('error');
            setModalMessage('Failed to update status. Please try again.');
            setInviteSuccess(null);
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
            setInviteSuccess(null);
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
            setInviteSuccess(null);
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

    const getDepartmentName = (dept: unknown) => {
        if (!dept) return null;
        if (typeof dept === 'string') return dept;
        if (typeof dept === 'object' && 'name' in dept) {
            const name = (dept as { name?: string }).name;
            return name || null;
        }
        return null;
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

    const roleLibrary: Record<string, { title: string; summary: string; panel: string; capabilities: string[] }> = {
        [UserRole.SYSTEM_ADMIN]: {
            title: 'System Administrator',
            summary: 'Owns workspace governance, user access, and global purchasing controls.',
            panel: 'bg-gradient-to-br from-violet-50 to-fuchsia-50 border-violet-100',
            capabilities: ['Manage all users', 'Configure system settings', 'Approve all requests', 'Control supplier access'],
        },
        ADMIN: {
            title: 'Administrator',
            summary: 'Oversees operational configuration with broad management privileges.',
            panel: 'bg-gradient-to-br from-violet-50 to-fuchsia-50 border-violet-100',
            capabilities: ['Manage workspace users', 'Update role assignments', 'Review procurement activity', 'Control supplier access'],
        },
        [UserRole.SENIOR_MANAGER]: {
            title: 'Senior Manager',
            summary: 'Leads departmental operations, approvals, and spend governance.',
            panel: 'bg-gradient-to-br from-indigo-50 to-sky-50 border-indigo-100',
            capabilities: ['Approve high-value requests', 'Review team spend', 'Manage team permissions', 'Create purchase requests'],
        },
        [UserRole.MANAGER]: {
            title: 'Manager',
            summary: 'Manages day-to-day approvals and oversight for direct reports.',
            panel: 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100',
            capabilities: ['Approve team requests', 'View team activity', 'Create purchase requests', 'Manage own team members'],
        },
        [UserRole.MEMBER]: {
            title: 'Team Member',
            summary: 'Creates purchase requests and tracks personal request history.',
            panel: 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200',
            capabilities: ['Create purchase requests', 'Track own request status', 'View own history', 'Manage personal profile'],
        },
    };

    const selectedRoleKey = String(roleValue || selectedUser?.role || UserRole.MEMBER);
    const activeRoleMeta = roleLibrary[selectedRoleKey] || roleLibrary[UserRole.MEMBER];
    const totalMembers = users.length;
    const activeMembers = users.filter((member) => (member.status || UserStatus.ACTIVE) === UserStatus.ACTIVE).length;
    const pendingMembers = users.filter((member) => member.status === UserStatus.PENDING).length;
    const suspendedMembers = users.filter((member) => member.status === UserStatus.SUSPENDED).length;
    const canInviteUsers = currentUser?.role === UserRole.SYSTEM_ADMIN || currentUser?.role === UserRole.SENIOR_MANAGER;

    if (loading) {
        return <UserPermissionsSkeleton />;
    }

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-6 py-7 text-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.85)] sm:px-8">
                <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
                <div className="absolute -left-24 -bottom-24 h-60 w-60 rounded-full bg-indigo-300/15 blur-3xl" />
                <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Control Center</p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Workspace Settings</h1>
                        <p className="mt-2 max-w-2xl text-sm text-blue-100/85">
                            Manage member access, adjust permissions, and keep your teams structured with fewer clicks.
                        </p>
                    </div>
                    {activeTab === 'permissions' && (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-blue-100/80">Members</p>
                                <p className="mt-1 text-xl font-semibold">{totalMembers}</p>
                            </div>
                            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-blue-100/80">Active</p>
                                <p className="mt-1 text-xl font-semibold">{activeMembers}</p>
                            </div>
                            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-blue-100/80">Pending</p>
                                <p className="mt-1 text-xl font-semibold">{pendingMembers}</p>
                            </div>
                            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-blue-100/80">Suspended</p>
                                <p className="mt-1 text-xl font-semibold">{suspendedMembers}</p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px,minmax(0,1fr)]">
                <aside className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Settings</p>
                        {currentUser?.role === UserRole.SYSTEM_ADMIN && (
                            <button
                                onClick={() => setActiveTab('permissions')}
                                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-all ${activeTab === 'permissions'
                                    ? 'bg-gradient-to-r from-primary-50 to-blue-50 text-primary-800 ring-1 ring-primary-200'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                            >
                                <span className={`rounded-lg p-2 ${activeTab === 'permissions' ? 'bg-white text-primary-700' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                                    <Shield className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block font-medium">User Permissions</span>
                                    <span className="block text-xs text-slate-500">Roles, approvals, and access</span>
                                </span>
                                {activeTab === 'permissions' && <ChevronRight className="h-4 w-4 text-primary-500" />}
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`group mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-all ${activeTab === 'profile'
                                ? 'bg-gradient-to-r from-primary-50 to-blue-50 text-primary-800 ring-1 ring-primary-200'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <span className={`rounded-lg p-2 ${activeTab === 'profile' ? 'bg-white text-primary-700' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                                <UserIcon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-medium">My Profile</span>
                                <span className="block text-xs text-slate-500">Personal details and account</span>
                            </span>
                            {activeTab === 'profile' && <ChevronRight className="h-4 w-4 text-primary-500" />}
                        </button>
                    </div>

                    {activeTab === 'permissions' && (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-100 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-base font-semibold text-slate-900">Team Directory</h2>
                                        <p className="text-xs text-slate-500">{filteredUsers.length} visible users</p>
                                    </div>
                                    {canInviteUsers && (
                                        <button
                                            onClick={() => setShowInviteModal(true)}
                                            className="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
                                            title="Invite User"
                                        >
                                            <UserPlus className="h-3.5 w-3.5" />
                                            Invite
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-200"
                                    />
                                </div>
                            </div>

                            <div className="max-h-[48vh] overflow-y-auto p-2 custom-scrollbar xl:max-h-[calc(100vh-27.5rem)]">
                                {filteredUsers.map((member) => (
                                    <button
                                        key={member.id}
                                        onClick={() => setSelectedUser(member)}
                                        className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${selectedUser?.id === member.id
                                            ? 'bg-gradient-to-r from-primary-50 to-blue-50 ring-1 ring-primary-200'
                                            : 'hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-white ${selectedUser?.id === member.id ? 'bg-primary-600' : 'bg-slate-400'}`}>
                                            {getInitials(member.name)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className={`truncate text-sm font-medium ${selectedUser?.id === member.id ? 'text-primary-900' : 'text-slate-900'}`}>
                                                {member.name}
                                            </p>
                                            <p className="truncate text-xs text-slate-500">{getDepartmentName(member.department) || 'No Department'}</p>
                                        </div>
                                        <div className="hidden sm:block">
                                            <StatusBadge status={member.status || UserStatus.ACTIVE} />
                                        </div>
                                    </button>
                                ))}

                                {filteredUsers.length === 0 && (
                                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                                        <p className="text-sm font-medium text-slate-700">No members found</p>
                                        <p className="mt-1 text-xs text-slate-500">Try a different name or clear search.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </aside>

                <section className="min-h-[34rem] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    {activeTab === 'permissions' && selectedUser ? (
                        <div className="h-full overflow-y-auto">
                            <div className="space-y-6 p-6 md:p-8">
                                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-6">
                                    <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary-200/40 blur-3xl" />
                                    <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-blue-700 text-2xl font-bold text-white shadow-lg ring-4 ring-white">
                                                {getInitials(selectedUser.name)}
                                            </div>
                                            <div className="min-w-0">
                                                <h2 className="text-2xl font-semibold text-slate-900">{selectedUser.name}</h2>
                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1">
                                                        <Mail className="h-3.5 w-3.5" />
                                                        <span className="max-w-[20rem] truncate">{selectedUser.email}</span>
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1">
                                                        <Building className="h-3.5 w-3.5" />
                                                        {getDepartmentName(selectedUser.department) || 'Global'}
                                                    </span>
                                                </div>
                                                <div className="mt-3 flex items-center gap-2">
                                                    <RoleBadge role={selectedUser.role} />
                                                    <StatusBadge status={selectedUser.status || UserStatus.ACTIVE} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:w-[23rem]">
                                            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Role Assignment</label>
                                            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                                                <Select
                                                    value={roleValue}
                                                    onChange={(val) => setRoleValue(val as UserRole)}
                                                    options={[
                                                        { value: UserRole.MEMBER, label: 'Team Member' },
                                                        { value: UserRole.MANAGER, label: 'Manager' },
                                                        { value: UserRole.SENIOR_MANAGER, label: 'Senior Manager' },
                                                    ]}
                                                    className="w-full sm:flex-1"
                                                />
                                                <Button
                                                    onClick={handleSaveChanges}
                                                    disabled={saving || roleValue === selectedUser.role}
                                                    className={`${roleValue !== selectedUser.role ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-slate-100 text-slate-400'} sm:w-auto`}
                                                >
                                                    {saving ? 'Saving...' : 'Save'}
                                                </Button>
                                            </div>
                                            <p className={`mt-2 text-xs ${roleValue !== selectedUser.role ? 'text-primary-700' : 'text-slate-500'}`}>
                                                {roleValue !== selectedUser.role ? 'Role update pending. Save to apply changes.' : 'No unsaved role updates.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr),290px]">
                                    <div className="space-y-6">
                                        <div className={`rounded-2xl border p-6 ${activeRoleMeta.panel}`}>
                                            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                                                <Shield className="h-3.5 w-3.5" />
                                                Role Capabilities
                                            </div>
                                            <h3 className="text-xl font-semibold text-slate-900">{activeRoleMeta.title}</h3>
                                            <p className="mt-2 text-sm text-slate-600">{activeRoleMeta.summary}</p>
                                            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                {activeRoleMeta.capabilities.map((capability) => (
                                                    <div key={capability} className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/60 px-3 py-2 text-sm text-slate-700">
                                                        <Check className="h-4 w-4 text-emerald-500" />
                                                        <span>{capability}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 bg-white p-6">
                                            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Access Snapshot</h3>
                                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Department</p>
                                                    <p className="mt-1 text-sm font-semibold text-slate-900">{getDepartmentName(selectedUser.department) || 'Global'}</p>
                                                </div>
                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Status</p>
                                                    <p className="mt-1 text-sm font-semibold text-slate-900">{(selectedUser.status || UserStatus.ACTIVE).toLowerCase()}</p>
                                                </div>
                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Member Since</p>
                                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                                        {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Metadata</h3>
                                            <div className="mt-4 space-y-4">
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">User ID</p>
                                                    <p className="mt-1 inline-flex rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-700">
                                                        {selectedUser.id.split('-')[0]}...
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Joined</p>
                                                    <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                                                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                                                        {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Role Preview</p>
                                                    <p className="mt-1 text-sm font-medium text-slate-700">{activeRoleMeta.title}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {currentUser?.role === UserRole.SYSTEM_ADMIN && selectedUser.id !== currentUser.id && (
                                            <div className="rounded-2xl border border-red-100 bg-red-50/40 p-5">
                                                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">Danger Zone</h3>
                                                <div className="mt-3 space-y-2.5">
                                                    <button
                                                        onClick={() => handleUpdateStatus(
                                                            selectedUser.status === UserStatus.SUSPENDED ? UserStatus.ACTIVE : UserStatus.SUSPENDED
                                                        )}
                                                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${selectedUser.status === UserStatus.SUSPENDED
                                                            ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                                                            : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                            }`}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            {selectedUser.status === UserStatus.SUSPENDED ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                                            {selectedUser.status === UserStatus.SUSPENDED ? 'Activate User' : 'Suspend Access'}
                                                        </span>
                                                    </button>

                                                    <button
                                                        onClick={() => setShowDeleteModal(true)}
                                                        className="flex w-full items-center justify-between rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <Trash2 className="h-4 w-4" />
                                                            Delete User
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'profile' && currentUser ? (
                        <div className="h-full overflow-y-auto">
                            <div className="space-y-6 p-6 md:p-8">
                                <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-blue-50 p-6">
                                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-blue-700 text-2xl font-bold text-white shadow-lg ring-4 ring-white">
                                                {getInitials(currentUser.name)}
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">My Account</p>
                                                <h2 className="mt-1 text-2xl font-semibold text-slate-900">{currentUser.name}</h2>
                                                <p className="mt-1 text-sm text-slate-600">{currentUser.email}</p>
                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    <RoleBadge role={currentUser.role} />
                                                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                                                        {getDepartmentName(currentUser.department) || 'No Department'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="outline" onClick={() => setIsEditProfileOpen(true)} className="self-start md:self-auto">
                                            Edit Profile
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                                        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Personal Information</h3>
                                        <div className="mt-4 space-y-4">
                                            <div>
                                                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Full Name</p>
                                                <p className="mt-1 text-sm font-medium text-slate-900">{currentUser.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Email</p>
                                                <p className="mt-1 text-sm font-medium text-slate-900">{currentUser.email}</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Department</p>
                                                <p className="mt-1 text-sm font-medium text-slate-900">
                                                    {getDepartmentName(currentUser.department) || 'None'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                                        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">System Access</h3>
                                        <div className="mt-4 space-y-4">
                                            <div>
                                                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Role</p>
                                                <p className="mt-1 text-sm font-medium text-slate-900">{currentUser.role.replace('_', ' ')}</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Account Status</p>
                                                <p className="mt-1 text-sm font-medium text-slate-900">Active</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Timezone</p>
                                                <p className="mt-1 text-sm font-medium text-slate-900">Europe/London</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center p-8">
                            <div className="max-w-sm rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
                                <p className="text-base font-semibold text-slate-700">No user selected</p>
                                <p className="mt-2 text-sm text-slate-500">Choose a team member from the directory to view and edit permissions.</p>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {currentUser && (
                <EditProfileModal
                    isOpen={isEditProfileOpen}
                    onClose={() => setIsEditProfileOpen(false)}
                    currentUser={currentUser}
                />
            )}
            {/* Invite User Modal */}
            {showInviteModal && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
                    onClick={() => setShowInviteModal(false)}
                >
                    <div
                        className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_40px_95px_-45px_rgba(15,23,42,0.95)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50 px-6 py-5 sm:px-7">
                            <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-primary-200/30 blur-3xl" />
                            <button
                                type="button"
                                onClick={() => setShowInviteModal(false)}
                                className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close invite modal"
                            >
                                <X className="h-4 w-4" />
                            </button>
                            <div className="relative flex items-start gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 ring-1 ring-primary-200">
                                    <UserPlus className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700">Access Invite</p>
                                    <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Invite Team Member</h3>
                                    <p className="mt-1 text-sm text-slate-600">Send a secure invitation and assign the right role from the start.</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleInviteUser} className="space-y-5 p-6 sm:p-7">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                                        Full Name <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            required
                                            value={inviteData.name}
                                            onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-primary-300 focus:ring-4 focus:ring-primary-100/70"
                                            placeholder="e.g. Jane Doe"
                                        />
                                    </div>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                                        Email Address <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="email"
                                            required
                                            value={inviteData.email}
                                            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-primary-300 focus:ring-4 focus:ring-primary-100/70"
                                            placeholder="jane@company.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                                        Department
                                    </label>
                                    <Select
                                        value={inviteData.departmentId}
                                        onChange={(val) => setInviteData({ ...inviteData, departmentId: val })}
                                        options={[
                                            { value: '', label: 'Select department...' },
                                            ...departments.map((department) => ({ value: department.id, label: department.name }))
                                        ]}
                                        className="w-full"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                                        Role
                                    </label>
                                    <Select
                                        value={inviteData.role}
                                        onChange={(val) => setInviteData({ ...inviteData, role: val as UserRole })}
                                        options={[
                                            { value: UserRole.MEMBER, label: 'Member' },
                                            { value: UserRole.MANAGER, label: 'Manager' },
                                            { value: UserRole.SENIOR_MANAGER, label: 'Senior Manager' },
                                        ]}
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                                <p className="text-xs text-slate-600">
                                    The invitee will receive an email with secure onboarding access and role-based permissions.
                                </p>
                            </div>

                            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowInviteModal(false)}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={inviting}
                                    className="w-full bg-primary-600 text-white hover:bg-primary-700 sm:w-auto"
                                >
                                    {inviting ? 'Sending Invite...' : 'Send Invite'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
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
                <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={dismissFeedbackModal}>
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={dismissFeedbackModal}
                            className="absolute top-3 right-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            aria-label="Close message"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        {modalType === 'success' && inviteSuccess ? (
                            <>
                                <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                                <div className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle className="h-6 w-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-lg font-semibold text-slate-900">Invitation sent</h3>
                                            <p className="text-sm text-slate-600 mt-1 leading-6">
                                                {inviteSuccess.statusMessage || 'Your invite email has been delivered to the recipient.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 space-y-2.5">
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Recipient</span>
                                            <span className="text-sm font-medium text-slate-900 text-right">{inviteSuccess.name}</span>
                                        </div>
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Email</span>
                                            <span className="text-sm text-slate-700 text-right break-all">{inviteSuccess.email}</span>
                                        </div>
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Role</span>
                                            <span className="text-sm text-slate-700 text-right">{inviteSuccess.role.replace('_', ' ')}</span>
                                        </div>
                                        {inviteSuccess.departmentName && (
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Department</span>
                                                <span className="text-sm text-slate-700 text-right">{inviteSuccess.departmentName}</span>
                                            </div>
                                        )}
                                    </div>

                                    {inviteSuccess.inviteLink && (
                                        <button
                                            type="button"
                                            onClick={handleCopyInviteLink}
                                            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
                                        >
                                            <Copy className="h-4 w-4" />
                                            {linkCopied ? 'Link copied to clipboard' : 'Copy invite link'}
                                        </button>
                                    )}

                                    <div className="mt-6 flex items-center justify-end gap-3">
                                        <Button variant="ghost" onClick={dismissFeedbackModal}>
                                            Done
                                        </Button>
                                        <Button
                                            onClick={openInviteModalFromSuccess}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        >
                                            Invite Another
                                        </Button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="p-6 flex items-start gap-4">
                                <div className={`p-2.5 rounded-xl ${modalType === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {modalType === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-slate-900">{modalType === 'success' ? 'Success' : 'Error'}</h3>
                                    <p className="text-sm text-slate-600 mt-1 break-words">{modalMessage}</p>
                                    <div className="mt-5 flex justify-end">
                                        <Button variant="outline" size="sm" onClick={dismissFeedbackModal}>
                                            Okay
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

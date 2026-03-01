import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, User as UserIcon, Mail, Building2, Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import type { User, UpdateUserInput } from '../../types/api';
import { usersApi } from '../../services/users.service';
import { useAppDispatch } from '../../store/hooks';
import { checkAuth } from '../../store/slices/authSlice';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
}

export const EditProfileModal = ({ isOpen, onClose, currentUser }: EditProfileModalProps) => {
    const [name, setName] = useState(currentUser.name);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    const dispatch = useAppDispatch();

    useEffect(() => {
        if (!isOpen) return;
        setName(currentUser.name);
        setError(null);
        setShowSuccess(false);
    }, [isOpen, currentUser]);

    useEffect(() => {
        if (!isOpen) return;

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
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const updates: UpdateUserInput = {
                name: name.trim(),
            };

            await usersApi.update(currentUser.id, updates);

            // Refresh global auth state
            await dispatch(checkAuth()).unwrap();

            setShowSuccess(true);
        } catch (err: unknown) {
            console.error('Failed to update profile:', err);
            if (typeof err === 'object' && err !== null && 'response' in err) {
                const response = (err as { response?: { data?: { error?: string } } }).response;
                setError(response?.data?.error || 'Failed to update profile');
            } else {
                setError('Failed to update profile');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const getDepartmentName = (department: unknown): string => {
        if (!department) return 'Not assigned';
        if (typeof department === 'string') return department;
        if (typeof department === 'object' && 'name' in department) {
            const nameValue = (department as { name?: string }).name;
            return nameValue || 'Not assigned';
        }
        return 'Not assigned';
    };

    const toTitleCase = (value: string) =>
        value
            .toLowerCase()
            .split(' ')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');

    const roleLabel = toTitleCase(String(currentUser.role || '').replace(/_/g, ' '));
    const initials = currentUser.name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    const hasChanges = name.trim() !== currentUser.name.trim();

    if (showSuccess) {
        return createPortal(
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={onClose}>
                <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white text-center shadow-[0_40px_90px_-45px_rgba(15,23,42,0.95)]" onClick={(e) => e.stopPropagation()}>
                    <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                    <div className="p-6">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                            <CheckCircle2 className="h-7 w-7" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900">Profile Updated</h3>
                        <p className="mt-2 text-sm text-slate-600">
                            Your profile changes were saved successfully.
                        </p>
                        <Button className="mt-6 w-full bg-primary-600 text-white hover:bg-primary-700" onClick={onClose}>
                            Done
                        </Button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_40px_95px_-45px_rgba(15,23,42,0.95)]" onClick={(e) => e.stopPropagation()}>
                <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50 px-6 py-5 sm:px-7">
                    <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary-200/30 blur-3xl" />
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Close edit profile modal"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <div className="relative flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 ring-1 ring-primary-200">
                            <span className="text-sm font-semibold">{initials}</span>
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700">Account Settings</p>
                            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Edit Profile</h2>
                            <p className="mt-1 text-sm text-slate-600">Update your name and review account details linked to your workspace access.</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex max-h-[min(88vh,42rem)] flex-col">
                    <div className="space-y-6 overflow-y-auto p-6 sm:p-7">
                        {error && (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                                Full Name <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-primary-300 focus:ring-4 focus:ring-primary-100/70"
                                    placeholder="Enter your full name"
                                    required
                                    minLength={2}
                                />
                            </div>
                            <p className="mt-1.5 text-xs text-slate-500">This name appears across requests, approvals, and audit logs.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    <Mail className="h-3.5 w-3.5" />
                                    Email
                                </p>
                                <p className="mt-2 break-all text-sm font-medium text-slate-900">{currentUser.email}</p>
                                <p className="mt-2 text-xs text-slate-500">Read-only field</p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    <Building2 className="h-3.5 w-3.5" />
                                    Department
                                </p>
                                <p className="mt-2 text-sm font-medium text-slate-900">{getDepartmentName(currentUser.department)}</p>
                                <p className="mt-2 text-xs text-slate-500">Contact admin to change</p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    <Shield className="h-3.5 w-3.5" />
                                    Role
                                </p>
                                <p className="mt-2 text-sm font-medium text-slate-900">{roleLabel}</p>
                                <p className="mt-2 text-xs text-slate-500">Managed by workspace policies</p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Note</p>
                            <p className="mt-1.5 text-sm text-slate-600">
                                Profile name updates are applied immediately and reflected across your procurement activity.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !hasChanges || name.trim().length < 2}
                            className="bg-primary-600 text-white hover:bg-primary-700"
                        >
                            {loading ? (
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save } from 'lucide-react';
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

    const dispatch = useAppDispatch();

    useEffect(() => {
        if (isOpen) {
            setName(currentUser.name);
            setError(null);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, currentUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const updates: UpdateUserInput = {
                name: name.trim(),
            };

            // Only add password if changing
            // Note: The backend update endpoint might not support password update directly via updateUser 
            // depending on implementation. Let's assume simplest case: only Name for now based on plan.
            // If plan was just name, let's stick to name. The prompt mentioned "Edit functionality profile here".
            // Usually profile edit includes name. Password change is often separate.
            // I'll include Name editing first.

            await usersApi.update(currentUser.id, updates);

            // Refresh global auth state
            await dispatch(checkAuth()).unwrap();

            onClose();
        } catch (err: any) {
            console.error('Failed to update profile:', err);
            setError(err.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="border-b px-6 py-4 flex items-center justify-between bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-900">Edit Profile</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                            placeholder="Enter your full name"
                            required
                            minLength={2}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                        <input
                            type="email"
                            value={currentUser.email}
                            disabled
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Department</label>
                        <input
                            type="text"
                            value={typeof currentUser.department === 'object' ? (currentUser.department as any)?.name : (currentUser.department || 'None')}
                            disabled
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1">Contact admin to change department.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                        <input
                            type="text"
                            value={currentUser.role}
                            disabled
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-primary-600 hover:bg-primary-700 text-white">
                            {loading ? (
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
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

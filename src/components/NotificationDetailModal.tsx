import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink } from 'lucide-react';
import type { Notification } from '../services/notification.service';

interface NotificationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    notification: Notification | null;
    onNavigate?: (notification: Notification) => void;
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
    isOpen,
    onClose,
    notification,
    onNavigate,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen || !notification) return null;

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'REQUEST_APPROVED':
                return '✅';
            case 'REQUEST_REJECTED':
                return '❌';
            case 'BUDGET_WARNING':
                return '⚠️';
            case 'BUDGET_CRITICAL':
                return '🚨';
            case 'BUDGET_EXCEEDED':
                return '🔥';
            case 'CONTRACT_EXPIRING':
                return '📄';
            case 'SYSTEM_ALERT':
                return '🔔';
            default:
                return '📬';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'REQUEST_APPROVED':
                return 'bg-green-100 text-green-800';
            case 'REQUEST_REJECTED':
                return 'bg-red-100 text-red-800';
            case 'BUDGET_WARNING':
                return 'bg-yellow-100 text-yellow-800';
            case 'BUDGET_CRITICAL':
                return 'bg-orange-100 text-orange-800';
            case 'BUDGET_EXCEEDED':
                return 'bg-red-100 text-red-800';
            case 'CONTRACT_EXPIRING':
                return 'bg-blue-100 text-blue-800';
            case 'SYSTEM_ALERT':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-primary-100 text-primary-800';
        }
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(date));
    };

    const handleNavigate = () => {
        if (onNavigate) {
            onNavigate(notification);
            onClose();
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                ref={modalRef}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-8">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 text-5xl">
                            {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getTypeColor(notification.type)}`}>
                                    {notification.type.replace(/_/g, ' ')}
                                </span>
                                {!notification.read && (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                                        New
                                    </span>
                                )}
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-1">
                                {notification.title}
                            </h2>
                            <p className="text-sm text-white/80">
                                {formatDate(notification.createdAt)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                            Message
                        </h3>
                        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {notification.message}
                        </p>
                    </div>

                    {/* Metadata */}
                    {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                                Details
                            </h3>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                {Object.entries(notification.metadata).map(([key, value]) => (
                                    <div key={key} className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-600 capitalize">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                                        </span>
                                        <span className="text-sm text-gray-900 font-semibold">
                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                        >
                            Close
                        </button>
                        {notification.metadata?.requestId && (
                            <button
                                onClick={handleNavigate}
                                className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <span>View Request</span>
                                <ExternalLink className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    BadgeAlert,
    Ban,
    Bell,
    BellRing,
    Check,
    CheckCheck,
    ChevronRight,
    CircleAlert,
    CircleCheckBig,
    CircleDollarSign,
    CircleX,
    ClipboardList,
    Clock3,
    PackageCheck,
    ShieldAlert,
    X,
    type LucideIcon,
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { NotificationDetailModal } from './NotificationDetailModal';
import type { Notification } from '../services/notification.service';

interface NotificationVisual {
    icon: LucideIcon;
    label: string;
    iconClass: string;
    labelClass: string;
}

const getNotificationVisual = (type: string): NotificationVisual => {
    const normalizedType = type.replace(/-/g, '_').toUpperCase();

    switch (normalizedType) {
        case 'REQUEST_CREATED':
            return {
                icon: ClipboardList,
                label: 'Request',
                iconClass: 'bg-blue-100 text-blue-700',
                labelClass: 'border-blue-200 bg-blue-50 text-blue-700',
            };
        case 'REQUEST_APPROVED':
            return {
                icon: CircleCheckBig,
                label: 'Approved',
                iconClass: 'bg-emerald-100 text-emerald-700',
                labelClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
            };
        case 'REQUEST_REJECTED':
            return {
                icon: CircleX,
                label: 'Rejected',
                iconClass: 'bg-red-100 text-red-700',
                labelClass: 'border-red-200 bg-red-50 text-red-700',
            };
        case 'ORDER_CREATED':
            return {
                icon: PackageCheck,
                label: 'Order',
                iconClass: 'bg-indigo-100 text-indigo-700',
                labelClass: 'border-indigo-200 bg-indigo-50 text-indigo-700',
            };
        case 'SPENDING_THRESHOLD':
            return {
                icon: CircleDollarSign,
                label: 'Spending',
                iconClass: 'bg-amber-100 text-amber-700',
                labelClass: 'border-amber-200 bg-amber-50 text-amber-700',
            };
        case 'BUDGET_WARNING':
            return {
                icon: CircleAlert,
                label: 'Budget',
                iconClass: 'bg-amber-100 text-amber-700',
                labelClass: 'border-amber-200 bg-amber-50 text-amber-700',
            };
        case 'BUDGET_CRITICAL':
            return {
                icon: BadgeAlert,
                label: 'Critical',
                iconClass: 'bg-orange-100 text-orange-700',
                labelClass: 'border-orange-200 bg-orange-50 text-orange-700',
            };
        case 'BUDGET_EXCEEDED':
            return {
                icon: Ban,
                label: 'Exceeded',
                iconClass: 'bg-red-100 text-red-700',
                labelClass: 'border-red-200 bg-red-50 text-red-700',
            };
        case 'CONTRACT_EXPIRING':
            return {
                icon: Clock3,
                label: 'Contract',
                iconClass: 'bg-violet-100 text-violet-700',
                labelClass: 'border-violet-200 bg-violet-50 text-violet-700',
            };
        case 'SYSTEM_ALERT':
            return {
                icon: ShieldAlert,
                label: 'System',
                iconClass: 'bg-slate-100 text-slate-700',
                labelClass: 'border-slate-200 bg-slate-50 text-slate-700',
            };
        default:
            return {
                icon: BellRing,
                label: 'Alert',
                iconClass: 'bg-gray-100 text-gray-700',
                labelClass: 'border-gray-200 bg-gray-50 text-gray-700',
            };
    }
};

export default function NotificationBell() {
    const navigate = useNavigate();
    const {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        clearNotification,
    } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const unreadOnly = useMemo(() => notifications.filter((notification) => !notification.read), [notifications]);
    const visibleNotifications = useMemo(() => {
        if (activeFilter === 'unread') {
            return unreadOnly;
        }
        return notifications;
    }, [activeFilter, notifications, unreadOnly]);

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
        setSelectedNotification(notification);
        setIsDetailModalOpen(true);
        setIsOpen(false);
    };

    const handleNavigateFromModal = (notification: Notification) => {
        if (notification.metadata?.requestId) {
            navigate(`/requests/${notification.metadata.requestId}`);
        }
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const notifDate = new Date(date);
        const diffMs = now.getTime() - notifDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    const formatExactTime = (date: Date) =>
        new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Open notifications"
                className={`relative rounded-xl p-2.5 transition-all ${isOpen
                        ? 'bg-primary-50 text-primary-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 z-50 mt-3 w-[calc(100vw-2rem)] max-w-[27rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
                    <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-primary-50/40 px-4 pb-3 pt-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-semibold text-slate-900">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                                            {unreadCount} unread
                                        </span>
                                    )}
                                </div>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {notifications.length > 0 ? 'Updates from requests, budgets, and orders.' : 'You are all caught up.'}
                                </p>
                            </div>
                            <button
                                onClick={markAllAsRead}
                                disabled={unreadCount === 0}
                                className="flex items-center gap-1 rounded-lg border border-primary-200 bg-white px-2.5 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
                            >
                                <CheckCheck className="h-3 w-3" />
                                Mark all read
                            </button>
                    </div>
                        <div className="mt-3 inline-flex rounded-lg bg-slate-100 p-1">
                            <button
                                onClick={() => setActiveFilter('all')}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${activeFilter === 'all'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                All ({notifications.length})
                            </button>
                            <button
                                onClick={() => setActiveFilter('unread')}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${activeFilter === 'unread'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Unread ({unreadOnly.length})
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[26rem] space-y-2 overflow-y-auto bg-slate-50/50 p-3">
                        {isLoading ? (
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                                Loading notifications...
                            </div>
                        ) : visibleNotifications.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-slate-500">
                                <BellRing className="mx-auto mb-2 h-9 w-9 text-slate-300" />
                                <p className="text-sm font-medium text-slate-600">
                                    {activeFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    New updates will appear here.
                                </p>
                            </div>
                        ) : (
                            visibleNotifications.map((notification) => {
                                const visual = getNotificationVisual(notification.type);
                                const Icon = visual.icon;

                                return (
                                    <article
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`group cursor-pointer rounded-xl border bg-white p-3.5 transition-all hover:-translate-y-px hover:border-primary-200 hover:shadow-sm ${notification.read
                                            ? 'border-slate-200'
                                            : 'border-primary-200 shadow-[inset_3px_0_0_0_rgb(59,130,246)]'
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${visual.iconClass}`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="truncate text-sm font-semibold text-slate-900">
                                                    {notification.title}
                                                </p>
                                                {!notification.read && (
                                                    <span className="rounded-md bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700">
                                                        New
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-xs leading-5 text-slate-600">
                                                {notification.message}
                                            </p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${visual.labelClass}`}>
                                                    {visual.label}
                                                </span>
                                                <span className="text-[11px] text-slate-500">
                                                    {formatTime(new Date(notification.createdAt))}
                                                </span>
                                                <span className="text-[11px] text-slate-300">•</span>
                                                <span className="text-[11px] text-slate-400">{formatExactTime(new Date(notification.createdAt))}</span>
                                            </div>
                                            <div className="mt-2 flex items-center justify-end text-xs font-medium text-primary-700 opacity-0 transition-opacity group-hover:opacity-100">
                                                View details <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            {!notification.read && (
                                                <button
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        markAsRead(notification.id);
                                                    }}
                                                    title="Mark as read"
                                                    className="rounded-md p-1 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    clearNotification(notification.id);
                                                }}
                                                title="Dismiss notification"
                                                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </article>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            <NotificationDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                notification={selectedNotification}
                onNavigate={handleNavigateFromModal}
            />
        </div>
    );
}

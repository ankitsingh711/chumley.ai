import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    BadgeAlert,
    Ban,
    BellRing,
    Check,
    CircleAlert,
    CircleCheckBig,
    CircleDollarSign,
    CircleX,
    ClipboardList,
    Clock3,
    Copy,
    ExternalLink,
    Info,
    PackageCheck,
    ShieldAlert,
    X,
    type LucideIcon,
} from 'lucide-react';
import type { Notification } from '../services/notification.service';

interface NotificationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    notification: Notification | null;
    onNavigate?: (notification: Notification) => void;
}

interface NotificationVisual {
    icon: LucideIcon;
    label: string;
    iconClass: string;
    labelClass: string;
    headerClass: string;
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
                headerClass: 'from-blue-50 via-white to-slate-50',
            };
        case 'REQUEST_APPROVED':
            return {
                icon: CircleCheckBig,
                label: 'Approved',
                iconClass: 'bg-emerald-100 text-emerald-700',
                labelClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
                headerClass: 'from-emerald-50 via-white to-slate-50',
            };
        case 'REQUEST_REJECTED':
            return {
                icon: CircleX,
                label: 'Rejected',
                iconClass: 'bg-red-100 text-red-700',
                labelClass: 'border-red-200 bg-red-50 text-red-700',
                headerClass: 'from-red-50 via-white to-slate-50',
            };
        case 'ORDER_CREATED':
            return {
                icon: PackageCheck,
                label: 'Order',
                iconClass: 'bg-indigo-100 text-indigo-700',
                labelClass: 'border-indigo-200 bg-indigo-50 text-indigo-700',
                headerClass: 'from-indigo-50 via-white to-slate-50',
            };
        case 'SPENDING_THRESHOLD':
            return {
                icon: CircleDollarSign,
                label: 'Spending',
                iconClass: 'bg-amber-100 text-amber-700',
                labelClass: 'border-amber-200 bg-amber-50 text-amber-700',
                headerClass: 'from-amber-50 via-white to-slate-50',
            };
        case 'BUDGET_WARNING':
            return {
                icon: CircleAlert,
                label: 'Budget',
                iconClass: 'bg-amber-100 text-amber-700',
                labelClass: 'border-amber-200 bg-amber-50 text-amber-700',
                headerClass: 'from-amber-50 via-white to-slate-50',
            };
        case 'BUDGET_CRITICAL':
            return {
                icon: BadgeAlert,
                label: 'Critical',
                iconClass: 'bg-orange-100 text-orange-700',
                labelClass: 'border-orange-200 bg-orange-50 text-orange-700',
                headerClass: 'from-orange-50 via-white to-slate-50',
            };
        case 'BUDGET_EXCEEDED':
            return {
                icon: Ban,
                label: 'Exceeded',
                iconClass: 'bg-red-100 text-red-700',
                labelClass: 'border-red-200 bg-red-50 text-red-700',
                headerClass: 'from-red-50 via-white to-slate-50',
            };
        case 'CONTRACT_EXPIRING':
            return {
                icon: Clock3,
                label: 'Contract',
                iconClass: 'bg-violet-100 text-violet-700',
                labelClass: 'border-violet-200 bg-violet-50 text-violet-700',
                headerClass: 'from-violet-50 via-white to-slate-50',
            };
        case 'SYSTEM_ALERT':
            return {
                icon: ShieldAlert,
                label: 'System',
                iconClass: 'bg-slate-100 text-slate-700',
                labelClass: 'border-slate-200 bg-slate-50 text-slate-700',
                headerClass: 'from-slate-100 via-white to-slate-50',
            };
        case 'SUPPLIER_REQUEST':
            return {
                icon: ClipboardList,
                label: 'Supplier',
                iconClass: 'bg-amber-100 text-amber-700',
                labelClass: 'border-amber-200 bg-amber-50 text-amber-700',
                headerClass: 'from-amber-50 via-white to-slate-50',
            };
        default:
            return {
                icon: BellRing,
                label: 'Alert',
                iconClass: 'bg-gray-100 text-gray-700',
                labelClass: 'border-gray-200 bg-gray-50 text-gray-700',
                headerClass: 'from-gray-100 via-white to-slate-50',
            };
    }
};

const formatMetadataKey = (key: string) =>
    key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());

const formatMetadataValue = (key: string, value: unknown) => {
    if (value === null || typeof value === 'undefined') {
        return '-';
    }

    const keyLooksLikeAmount = /(amount|total|cost|price|value)/i.test(key);
    if (keyLooksLikeAmount) {
        const numeric = typeof value === 'number' ? value : Number(value);
        if (!Number.isNaN(numeric)) {
            return new Intl.NumberFormat('en-GB', {
                style: 'currency',
                currency: 'GBP',
                maximumFractionDigits: 2,
            }).format(numeric);
        }
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
};

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
    isOpen,
    onClose,
    notification,
    onNavigate,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
    const visual = getNotificationVisual(notification.type);
    const Icon = visual.icon;
    const metadataEntries = Object.entries(notification.metadata ?? {});

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-GB', {
            dateStyle: 'long',
            timeStyle: 'short',
        }).format(new Date(date));
    };

    const copyMetadataValue = async (key: string, value: unknown) => {
        if (value === null || typeof value === 'undefined') return;

        try {
            await navigator.clipboard.writeText(String(value));
            setCopiedKey(key);
            window.setTimeout(() => {
                setCopiedKey((current) => (current === key ? null : current));
            }, 1400);
        } catch (error) {
            console.error('Failed to copy metadata value', error);
        }
    };

    const hasRequestLink = Boolean(notification.metadata?.requestId);
    const hasSupplierLink = Boolean(notification.metadata?.supplierId);
    const hasNavigationTarget = hasRequestLink || hasSupplierLink;
    const hasMetadata = metadataEntries.length > 0;

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
                className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.25)] animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`relative border-b border-slate-200 bg-gradient-to-br px-6 py-6 sm:px-7 ${visual.headerClass}`}>
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 rounded-lg border border-slate-200 bg-white/80 p-1.5 text-slate-500 transition-colors hover:text-slate-700"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="flex items-start gap-4 pr-10">
                        <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${visual.iconClass}`}>
                            <Icon className="h-7 w-7" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${visual.labelClass}`}>
                                    {visual.label}
                                </span>
                                {!notification.read && (
                                    <span className="rounded-full bg-primary-100 px-2.5 py-1 text-xs font-semibold text-primary-700">
                                        New
                                    </span>
                                )}
                            </div>
                            <h2 className="text-2xl font-bold leading-tight text-slate-900 sm:text-[32px]">
                                {notification.title}
                            </h2>
                            <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                                <Clock3 className="h-4 w-4" />
                                <span>{formatDate(new Date(notification.createdAt))}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-5 bg-white px-6 py-6 sm:px-7">
                    <section className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Message
                        </h3>
                        <p className="mt-2 text-[22px] leading-snug text-slate-900 sm:text-[30px]">
                            {notification.message}
                        </p>
                    </section>

                    {hasMetadata && (
                        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <Info className="h-4 w-4 text-slate-500" />
                                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                    Details
                                </h3>
                            </div>
                            <div className="space-y-2">
                                {metadataEntries.map(([key, value]) => {
                                    const formattedValue = formatMetadataValue(key, value);
                                    const isIdValue = /(^|_)id$/i.test(key);
                                    const isCopyable = typeof value !== 'object' && value !== null && typeof value !== 'undefined';

                                    return (
                                        <div
                                            key={key}
                                            className="group flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-primary-200"
                                        >
                                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                {formatMetadataKey(key)}
                                            </span>
                                            <div className="flex min-w-0 items-center gap-1">
                                                <span className={`break-all text-right text-sm font-semibold text-slate-900 ${isIdValue ? 'font-mono text-[13px]' : ''}`}>
                                                    {formattedValue}
                                                </span>
                                                {isCopyable && (
                                                    <button
                                                        onClick={() => copyMetadataValue(key, value)}
                                                        className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                                        title={copiedKey === key ? 'Copied' : 'Copy'}
                                                    >
                                                        {copiedKey === key ? (
                                                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-200"
                        >
                            Close
                        </button>
                        {hasNavigationTarget && (
                            <button
                                onClick={handleNavigate}
                                className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 font-medium text-white transition-colors hover:bg-primary-700"
                            >
                                <span>{hasRequestLink ? 'View Request' : 'View Supplier'}</span>
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

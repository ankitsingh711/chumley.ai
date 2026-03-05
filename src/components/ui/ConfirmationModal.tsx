import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Button } from './Button';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    isLoading?: boolean;
    showCancel?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'warning',
    isLoading = false,
    showCancel = true
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isLoading) onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, isLoading, onClose]);

    if (!isOpen) return null;

    const stylesByVariant = {
        danger: {
            icon: AlertCircle,
            iconClass: 'bg-rose-100 text-rose-600 ring-8 ring-rose-50',
            borderClass: 'border-rose-100',
            stripClass: 'bg-gradient-to-r from-rose-500 to-rose-400',
            confirmButtonClass: '!bg-rose-600 hover:!bg-rose-700 focus-visible:!ring-rose-500 !text-white',
        },
        warning: {
            icon: AlertTriangle,
            iconClass: 'bg-amber-100 text-amber-700 ring-8 ring-amber-50',
            borderClass: 'border-amber-100',
            stripClass: 'bg-gradient-to-r from-amber-500 to-amber-400',
            confirmButtonClass: '!bg-amber-500 hover:!bg-amber-600 focus-visible:!ring-amber-500 !text-white',
        },
        info: {
            icon: Info,
            iconClass: 'bg-sky-100 text-sky-700 ring-8 ring-sky-50',
            borderClass: 'border-sky-100',
            stripClass: 'bg-gradient-to-r from-sky-500 to-sky-400',
            confirmButtonClass: '!bg-sky-600 hover:!bg-sky-700 focus-visible:!ring-sky-500 !text-white',
        },
        success: {
            icon: CheckCircle,
            iconClass: 'bg-emerald-100 text-emerald-700 ring-8 ring-emerald-50',
            borderClass: 'border-emerald-100',
            stripClass: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
            confirmButtonClass: '!bg-emerald-600 hover:!bg-emerald-700 focus-visible:!ring-emerald-500 !text-white',
        },
    } as const;

    const currentStyle = stylesByVariant[variant];
    const Icon = currentStyle.icon;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px] animate-in fade-in duration-200"
            onClick={() => !isLoading && onClose()}
        >
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                className={`w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl ${currentStyle.borderClass} animate-in zoom-in-95 duration-200`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`h-1 w-full ${currentStyle.stripClass}`} />

                <div className="p-6">
                    <div className="flex justify-center">
                        <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-full ${currentStyle.iconClass}`}>
                            <Icon className="h-6 w-6" />
                        </div>
                    </div>

                    <h3 id={titleId} className="text-center text-xl font-semibold text-gray-900">
                        {title}
                    </h3>

                    <p id={descriptionId} className="mt-3 text-center text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
                        {message}
                    </p>

                    <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        {showCancel && (
                            <Button
                                variant="outline"
                                onClick={onClose}
                                disabled={isLoading}
                                className="w-full border-gray-300 bg-white text-gray-700 hover:bg-gray-50 sm:w-auto sm:min-w-[110px]"
                            >
                                {cancelText}
                            </Button>
                        )}
                        <Button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`w-full sm:w-auto sm:min-w-[150px] ${currentStyle.confirmButtonClass}`}
                        >
                            {isLoading ? 'Processing...' : confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
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

    if (!isOpen) return null;

    const getIcon = () => {
        switch (variant) {
            case 'danger':
                return <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4"><AlertTriangle className="h-6 w-6" /></div>;
            case 'warning':
                return <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 mb-4"><AlertTriangle className="h-6 w-6" /></div>;
            default:
                return null;
        }
    };

    const getConfirmButtonClass = () => {
        switch (variant) {
            case 'danger': return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
            case 'warning': return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 text-white'; // Ensure text contrast
            default: return 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500';
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                ref={modalRef}
                className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 text-center">
                    <div className="flex justify-center">
                        {getIcon()}
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {title}
                    </h3>

                    <p className="text-sm text-gray-500 mb-8 whitespace-pre-wrap">
                        {message}
                    </p>

                    <div className="flex gap-3 justify-center">
                        {showCancel && (
                            <Button
                                variant="outline"
                                onClick={onClose}
                                disabled={isLoading}
                                className="bg-white"
                            >
                                {cancelText}
                            </Button>
                        )}
                        <Button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`${getConfirmButtonClass()} min-w-[100px]`}
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

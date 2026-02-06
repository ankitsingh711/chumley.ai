import { useState, useRef, useEffect } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Calendar } from './Calendar';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface DatePickerProps {
    value?: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    label?: string;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
    className?: string;
    minDate?: string;
    maxDate?: string;
}

export function DatePicker({
    value,
    onChange,
    label,
    placeholder = "Select date",
    error,
    disabled = false,
    className
}: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Convert string value to Date object for Calendar
    const dateValue = value ? parseISO(value) : undefined;
    const isDateValid = dateValue && isValid(dateValue);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (date: Date) => {
        // Format to YYYY-MM-DD for form state
        onChange(format(date, 'yyyy-MM-dd'));
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
    };

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}

            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    "flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm transition-all outline-none",
                    isOpen ? "border-primary-500 ring-2 ring-primary-100" : "border-gray-200 hover:border-gray-300",
                    disabled && "cursor-not-allowed opacity-50 bg-gray-50",
                    error && "border-red-500 hover:border-red-500 focus:border-red-500 ring-red-100",
                    !isDateValid && "text-gray-500"
                )}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <CalendarIcon className={cn("h-4 w-4 shrink-0", isDateValid ? "text-primary-600" : "text-gray-400")} />
                    <span className="truncate">
                        {isDateValid ? format(dateValue!, 'MMM d, yyyy') : placeholder}
                    </span>
                </div>

                {filterParams(value) && !disabled ? (
                    <div onClick={handleClear} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                        <X className="h-3 w-3" />
                    </div>
                ) : null}
            </div>

            {error && (
                <p className="mt-1 text-xs text-red-500">{error}</p>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 mt-2 p-0 shadow-xl rounded-xl"
                    >
                        <Calendar
                            value={dateValue}
                            onChange={handleSelect}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Helper to check if value exists (simple check avoiding direct imports for this tiny logic if not needed)
function filterParams(v: any) {
    return v !== null && v !== undefined && v !== '';
}

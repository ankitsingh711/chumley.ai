import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils'; // Assuming you have a utility for merging classes

interface Option {
    value: string;
    label: string;
}

interface SelectProps {
    value?: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    label?: string;
    description?: string;
    error?: string;
    disabled?: boolean;
    className?: string;
}

export function Select({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    label,
    description,
    error,
    disabled = false,
    className
}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}

            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    "flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500",
                    disabled && "cursor-not-allowed opacity-50 bg-gray-50",
                    error && "border-red-500 hover:border-red-500 focus:border-red-500 focus:ring-red-100",
                    !selectedOption && "text-gray-500"
                )}
                disabled={disabled}
            >
                <span className="truncate">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {description && !error && (
                <p className="mt-1 text-xs text-gray-500">{description}</p>
            )}

            {error && (
                <p className="mt-1 text-xs text-red-500">{error}</p>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 mt-2 w-full min-w-[200px] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl ring-1 ring-black/5 py-1"
                    >
                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {options.map((option) => (
                                <div
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm outline-none transition-colors",
                                        option.value === value
                                            ? "bg-primary-50 text-primary-900 font-medium"
                                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <span className="flex-1 truncate">{option.label}</span>
                                    {option.value === value && (
                                        <Check className="h-4 w-4 text-primary-600 ml-2" />
                                    )}
                                </div>
                            ))}
                            {options.length === 0 && (
                                <div className="px-3 py-3 text-sm text-gray-400 text-center">
                                    No options found
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

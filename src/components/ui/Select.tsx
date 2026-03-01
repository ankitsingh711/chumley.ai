import { useState, useRef, useEffect, useMemo, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

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
    triggerClassName?: string;
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
    className,
    triggerClassName
}: SelectProps) {
    const DROPDOWN_GAP = 8;
    const VIEWPORT_PADDING = 12;
    const DROPDOWN_HEADER_HEIGHT = 38;
    const DEFAULT_LIST_HEIGHT = 256;
    const MIN_LIST_HEIGHT = 120;

    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [dropdownPosition, setDropdownPosition] = useState({
        top: 0,
        left: 0,
        width: 0,
        listMaxHeight: DEFAULT_LIST_HEIGHT,
    });
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const updateDropdownPosition = () => {
        const trigger = triggerRef.current;
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const availableBelow = viewportHeight - rect.bottom - DROPDOWN_GAP - VIEWPORT_PADDING;
        const availableAbove = rect.top - DROPDOWN_GAP - VIEWPORT_PADDING;

        const openUpward = availableBelow < 220 && availableAbove > availableBelow;
        const usableSpace = openUpward ? availableAbove : availableBelow;
        const listMaxHeight = Math.max(
            MIN_LIST_HEIGHT,
            Math.min(DEFAULT_LIST_HEIGHT, usableSpace - DROPDOWN_HEADER_HEIGHT)
        );

        const panelHeight = DROPDOWN_HEADER_HEIGHT + listMaxHeight;
        const unclampedTop = openUpward
            ? rect.top - panelHeight - DROPDOWN_GAP
            : rect.bottom + DROPDOWN_GAP;

        const maxTop = viewportHeight - VIEWPORT_PADDING - panelHeight;
        const top = Math.max(VIEWPORT_PADDING, Math.min(unclampedTop, maxTop));

        const left = Math.max(
            VIEWPORT_PADDING,
            Math.min(rect.left, viewportWidth - VIEWPORT_PADDING - rect.width)
        );

        setDropdownPosition({
            top,
            left,
            width: rect.width,
            listMaxHeight,
        });
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedInsideTrigger = containerRef.current?.contains(target);
            const clickedInsideDropdown = dropdownRef.current?.contains(target);
            if (!clickedInsideTrigger && !clickedInsideDropdown) {
                setIsOpen(false);
                setActiveIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const handlePositionUpdate = () => updateDropdownPosition();
        handlePositionUpdate();
        const rafId = window.requestAnimationFrame(handlePositionUpdate);

        window.addEventListener('resize', handlePositionUpdate);
        window.addEventListener('scroll', handlePositionUpdate, true);
        return () => {
            window.cancelAnimationFrame(rafId);
            window.removeEventListener('resize', handlePositionUpdate);
            window.removeEventListener('scroll', handlePositionUpdate, true);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || activeIndex < 0) return;
        optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                setActiveIndex(-1);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    const selectedOption = useMemo(() => options.find((opt) => opt.value === value), [options, value]);

    const getPreferredActiveIndex = () => {
        const selectedIndex = options.findIndex((option) => option.value === value);
        return selectedIndex >= 0 ? selectedIndex : (options.length > 0 ? 0 : -1);
    };

    const openDropdown = () => {
        updateDropdownPosition();
        setActiveIndex(getPreferredActiveIndex());
        setIsOpen(true);
    };

    const closeDropdown = () => {
        setIsOpen(false);
        setActiveIndex(-1);
    };

    const handleSelect = (selectedValue: string) => {
        onChange(selectedValue);
        closeDropdown();
    };

    const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!isOpen) {
                openDropdown();
                return;
            }

            if (options.length === 0) return;

            setActiveIndex((current) => {
                if (current < 0) return 0;
                if (event.key === 'ArrowDown') return (current + 1) % options.length;
                return (current - 1 + options.length) % options.length;
            });
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!isOpen) {
                openDropdown();
                return;
            }

            if (activeIndex >= 0 && options[activeIndex]) {
                handleSelect(options[activeIndex].value);
            }
            return;
        }

        if (event.key === 'Escape') {
            closeDropdown();
        }
    };

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            {label && (
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {label}
                </label>
            )}

            <button
                ref={triggerRef}
                type="button"
                onClick={() => {
                    if (disabled) return;
                    if (isOpen) {
                        closeDropdown();
                        return;
                    }
                    openDropdown();
                }}
                onKeyDown={handleTriggerKeyDown}
                className={cn(
                    "group flex min-h-[46px] w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-left text-sm text-slate-900 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-all duration-200 hover:border-slate-300 hover:shadow-[0_10px_25px_-20px_rgba(15,23,42,0.5)] focus:outline-none focus:ring-4 focus:ring-primary-100/60",
                    triggerClassName,
                    disabled && "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70",
                    error && "border-rose-300 hover:border-rose-300 focus:ring-rose-100",
                    isOpen && "border-primary-300 shadow-[0_16px_35px_-24px_rgba(37,99,235,0.5)]",
                    !selectedOption && "text-slate-400"
                )}
                disabled={disabled}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <span className="truncate">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span className={cn(
                    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition-colors",
                    isOpen && "border-primary-200 bg-primary-50 text-primary-600"
                )}>
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
                </span>
            </button>

            {description && !error && (
                <p className="mt-1.5 text-xs text-slate-500">{description}</p>
            )}

            {error && (
                <p className="mt-1.5 text-xs text-rose-600">{error}</p>
            )}

            {isOpen && typeof document !== 'undefined' && createPortal(
                <motion.div
                    ref={dropdownRef}
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="fixed z-[120] min-w-[200px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_65px_-35px_rgba(15,23,42,0.65)] ring-1 ring-slate-900/5"
                    role="listbox"
                    style={{
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        width: dropdownPosition.width,
                    }}
                >
                    <div className="border-b border-slate-100 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Options</p>
                    </div>
                    <div className="custom-scrollbar overflow-y-auto p-2" style={{ maxHeight: dropdownPosition.listMaxHeight }}>
                        {options.map((option, index) => {
                            const isSelected = option.value === value;
                            const isActive = index === activeIndex;

                            return (
                                <button
                                    key={option.value}
                                    ref={(node) => {
                                        optionRefs.current[index] = node;
                                    }}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    className={cn(
                                        "mb-1 flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-all last:mb-0",
                                        isSelected && "border-primary-200 bg-primary-50/80 text-primary-800",
                                        !isSelected && "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50",
                                        isActive && !isSelected && "border-slate-200 bg-slate-50"
                                    )}
                                    role="option"
                                    aria-selected={isSelected}
                                >
                                    <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
                                    {isSelected && (
                                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                                            <Check className="h-3.5 w-3.5" />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                        {options.length === 0 && (
                            <div className="px-3 py-4 text-center text-sm text-slate-400">
                                No options found
                            </div>
                        )}
                    </div>
                </motion.div>,
                document.body
            )}
        </div>
    );
}

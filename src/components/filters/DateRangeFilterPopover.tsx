import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, CalendarDays, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { DatePicker } from '../ui/DatePicker';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

type DateRangeValue = { start?: string; end?: string };
type DateRangeDraft = { start: string; end: string };

export interface DateRangePreset {
    id: string;
    label: string;
    helperText?: string;
    range: { start: string; end: string };
}

interface DateRangeFilterPopoverProps {
    isOpen: boolean;
    anchorRef: React.RefObject<HTMLElement | null>;
    activeRange: DateRangeValue;
    draftRange: DateRangeDraft;
    onDraftRangeChange: (range: DateRangeDraft) => void;
    onApply: (range: { start: string; end: string }) => void;
    onClear: () => void;
    onClose: () => void;
    presets: DateRangePreset[];
    title?: string;
    clearLabel?: string;
    applyLabel?: string;
}

const formatRangeLabel = (range: DateRangeValue) => {
    if (!range.start && !range.end) return 'All time';

    const startLabel = range.start
        ? new Date(range.start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Beginning';
    const endLabel = range.end
        ? new Date(range.end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Today';

    return `${startLabel} - ${endLabel}`;
};

export function DateRangeFilterPopover({
    isOpen,
    anchorRef,
    activeRange,
    draftRange,
    onDraftRangeChange,
    onApply,
    onClear,
    onClose,
    presets,
    title = 'Filter by Date',
    clearLabel = 'Clear',
    applyLabel = 'Apply Range',
}: DateRangeFilterPopoverProps) {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 420 });

    const customError = useMemo(() => {
        if (!draftRange.start || !draftRange.end) return '';
        return draftRange.start <= draftRange.end ? '' : 'Start date must be before end date.';
    }, [draftRange.end, draftRange.start]);

    const activePresetId = useMemo(() => {
        const activeStart = activeRange.start || '';
        const activeEnd = activeRange.end || '';

        return presets.find((preset) => preset.range.start === activeStart && preset.range.end === activeEnd)?.id;
    }, [activeRange.end, activeRange.start, presets]);

    useEffect(() => {
        if (!isOpen) return;

        const updatePosition = () => {
            const anchor = anchorRef.current;
            if (!anchor) return;

            const rect = anchor.getBoundingClientRect();
            const viewportPadding = 12;
            const width = Math.min(420, window.innerWidth - viewportPadding * 2);

            let left = rect.right - width;
            left = Math.max(viewportPadding, Math.min(left, window.innerWidth - width - viewportPadding));

            const estimatedHeight = 520;
            const belowTop = rect.bottom + 10;
            const fitsBelow = belowTop + estimatedHeight <= window.innerHeight - viewportPadding;
            const top = fitsBelow
                ? belowTop
                : Math.max(viewportPadding, rect.top - estimatedHeight - 10);

            setPosition({ top, left, width });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [anchorRef, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            if (popoverRef.current?.contains(target)) return;
            if (anchorRef.current?.contains(target)) return;

            onClose();
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [anchorRef, isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div
            ref={popoverRef}
            className="fixed z-[260]"
            style={{ top: position.top, left: position.left, width: position.width }}
        >
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5">
                <div className="border-b border-gray-100 bg-gradient-to-r from-white via-primary-50/35 to-white p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-700">
                                <Calendar className="h-3.5 w-3.5" />
                                Date Filter
                            </p>
                            <h3 className="mt-2 text-base font-semibold text-gray-900">{title}</h3>
                            <p className="mt-1 text-xs text-gray-500">Current: {formatRangeLabel(activeRange)}</p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                            aria-label="Close date filter"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="space-y-4 p-4">
                    <section>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Quick Picks</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            {presets.map((preset) => {
                                const isActive = activePresetId === preset.id;

                                return (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => onApply(preset.range)}
                                        className={cn(
                                            'rounded-xl border px-3 py-2 text-left transition',
                                            isActive
                                                ? 'border-primary-300 bg-primary-50 text-primary-700 shadow-sm'
                                                : 'border-gray-200 bg-white text-gray-700 hover:border-primary-200 hover:bg-primary-50/30',
                                        )}
                                    >
                                        <span className="text-sm font-semibold">{preset.label}</span>
                                        <span className="mt-0.5 block text-[11px] text-gray-500">
                                            {preset.helperText || 'Preset range'}
                                        </span>
                                        {isActive && (
                                            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary-700">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Active
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="border-t border-gray-100 pt-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Custom Range</p>

                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <DatePicker
                                value={draftRange.start}
                                onChange={(value) => onDraftRangeChange({ ...draftRange, start: value })}
                                placeholder="Start date"
                                className="w-full"
                            />
                            <DatePicker
                                value={draftRange.end}
                                onChange={(value) => onDraftRangeChange({ ...draftRange, end: value })}
                                placeholder="End date"
                                className="w-full"
                            />
                        </div>

                        {customError && (
                            <p className="mt-2 text-xs font-medium text-red-600">{customError}</p>
                        )}

                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={onClear}
                                className="w-full"
                            >
                                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                {clearLabel}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => onApply({ start: draftRange.start, end: draftRange.end })}
                                disabled={!draftRange.start || !draftRange.end || Boolean(customError)}
                                className="w-full bg-primary-700 hover:bg-primary-800"
                            >
                                <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                                {applyLabel}
                            </Button>
                        </div>
                    </section>
                </div>
            </div>
        </div>,
        document.body,
    );
}

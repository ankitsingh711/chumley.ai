import { useState } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    setMonth,
    setYear,
    getYear,
    getMonth
} from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarProps {
    value?: Date;
    onChange: (date: Date) => void;
    className?: string;
}

export function Calendar({ value, onChange, className }: CalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(value || new Date());
    const [view, setView] = useState<'days' | 'months' | 'years'>('days');

    // Generate days for the grid
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    // Quick selectors
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // Generate years (10 years back, 10 years forward window, centred on current view)
    const currentYear = getYear(currentMonth);
    const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);

    const onDateClick = (day: Date) => {
        onChange(day);
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    // Grid Generation logic using date-fns
    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate
    });

    return (
        <div className={cn("p-4 bg-white rounded-xl shadow-lg border border-gray-100 w-[320px]", className)}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div
                    className="flex items-center gap-1 font-bold text-gray-800 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                    onClick={() => setView(view === 'days' ? 'months' : 'days')}
                >
                    {format(currentMonth, 'MMMM yyyy')}
                    <ChevronDown className={cn("h-4 w-4 transition-transform", view !== 'days' && "rotate-180")} />
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentMonth(new Date())} className="text-xs font-medium text-primary-600 hover:text-primary-700 px-2">
                        Today
                    </button>
                    <div className="flex bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                        <button onClick={prevMonth} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button onClick={nextMonth} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="relative h-[280px]">
                <AnimatePresence mode='wait'>
                    {view === 'days' && (
                        <motion.div
                            key="days"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0"
                        >
                            {/* Days Header */}
                            <div className="grid grid-cols-7 mb-2">
                                {weekDays.map(d => (
                                    <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
                                        {d}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-y-1 gap-x-1">
                                {calendarDays.map((day) => {
                                    const isSelected = value ? isSameDay(day, value) : false;
                                    const isCurrentMonth = isSameMonth(day, currentMonth);
                                    const isTodayDate = isToday(day);

                                    return (
                                        <div
                                            key={day.toISOString()}
                                            onClick={() => onDateClick(day)}
                                            className={cn(
                                                "h-9 w-9 flex items-center justify-center text-sm rounded-full cursor-pointer transition-all relative",
                                                !isCurrentMonth && "text-gray-300",
                                                isCurrentMonth && "text-gray-700 hover:bg-gray-100",
                                                isSelected && "bg-primary-600 text-white hover:bg-primary-700 shadow-md font-medium",
                                                isTodayDate && !isSelected && "text-primary-600 font-bold bg-primary-50 ring-1 ring-primary-200"
                                            )}
                                        >
                                            {format(day, 'd')}
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {view === 'months' && (
                        <motion.div
                            key="months"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="grid grid-cols-2 gap-2 absolute inset-0 overflow-y-auto content-start"
                        >
                            {months.map((month, index) => (
                                <button
                                    key={month}
                                    onClick={() => {
                                        setCurrentMonth(setMonth(currentMonth, index));
                                        setView('years');
                                    }}
                                    className={cn(
                                        "p-3 rounded-lg text-sm text-left font-medium transition-colors border border-transparent",
                                        index === getMonth(currentMonth)
                                            ? "bg-primary-50 text-primary-700 border-primary-100"
                                            : "hover:bg-gray-50 text-gray-600"
                                    )}
                                >
                                    {month}
                                </button>
                            ))}
                        </motion.div>
                    )}

                    {view === 'years' && (
                        <motion.div
                            key="years"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="grid grid-cols-4 gap-2 absolute inset-0 overflow-y-auto content-start"
                        >
                            {years.map((year) => (
                                <button
                                    key={year}
                                    onClick={() => {
                                        setCurrentMonth(setYear(currentMonth, year));
                                        setView('days');
                                    }}
                                    className={cn(
                                        "p-2 rounded-lg text-sm transition-colors border border-transparent",
                                        year === getYear(currentMonth)
                                            ? "bg-primary-50 text-primary-700 border-primary-100 font-bold"
                                            : "hover:bg-gray-50 text-gray-600"
                                    )}
                                >
                                    {year}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {value && (
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                    <span className="text-gray-500">Selected</span>
                    <span className="font-semibold text-gray-900">{format(value, 'MMM d, yyyy')}</span>
                </div>
            )}
        </div>
    );
}

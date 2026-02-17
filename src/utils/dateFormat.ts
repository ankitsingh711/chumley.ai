/**
 * Format a date to a localized string with both date and time
 * @param date - Date string or Date object
 * @param options - Optional formatting options
 * @returns Formatted date and time string
 */
export function formatDateTime(
    date: string | Date,
    options?: {
        dateStyle?: 'short' | 'medium' | 'long' | 'full';
        timeStyle?: 'short' | 'medium' | 'long' | 'full';
    }
): string {
    return new Date(date).toLocaleString('en-GB', {
        dateStyle: options?.dateStyle || 'short',
        timeStyle: options?.timeStyle || 'short',
        ...options
    });
}

/**
 * Format a date to just the date portion
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-GB');
}

/**
 * Format a date to just the time portion
 * @param date - Date string or Date object
 * @returns Formatted time string
 */
export function formatTime(date: string | Date): string {
    return new Date(date).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Get separate date and time strings for multi-line display
 * @param date - Date string or Date object
 * @returns Object with separate date and time strings
 */
export function getDateAndTime(date: string | Date): { date: string; time: string } {
    return {
        date: formatDate(date),
        time: formatTime(date)
    };
}

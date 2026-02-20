// Aggregation helpers for hardcoded financial data
import { data2025 } from './financialData';
import { dataHistorical } from './financialDataHistorical';

export interface FinancialEntry {
    date: string;
    category: string;
    subCategory: string;
    amount: number;
}

// Combine all data
const allRawData = [...dataHistorical, ...data2025];

// Parse into structured entries
const allEntries: FinancialEntry[] = allRawData.map(([date, category, subCategory, amount]) => ({
    date, category, subCategory, amount,
}));

/**
 * Get total spend per category (top-level department) across all time
 * Returns Record<categoryName, totalAmount>
 */
export function getCategorySpendTotals(timeframe?: number | string, departmentFilter?: string): Record<string, number> {
    const result: Record<string, number> = {};
    let entries = timeframe ? filterByTimeframe(allEntries, timeframe) : allEntries;
    if (departmentFilter) {
        entries = entries.filter(e => e.category.toLowerCase() === departmentFilter.toLowerCase());
    }
    entries.forEach(e => {
        result[e.category] = (result[e.category] || 0) + e.amount;
    });
    return result;
}

/**
 * Get breakdown for a specific category (department)
 * Returns array of { category: subCategoryName, amount }
 */
export function getCategoryBreakdown(categoryName: string, timeframe?: number | string): { category: string; amount: number }[] {
    const entries = timeframe ? filterByTimeframe(allEntries, timeframe) : allEntries;
    const subTotals: Record<string, number> = {};
    entries
        .filter(e => e.category === categoryName)
        .forEach(e => {
            const sub = e.subCategory || 'General';
            subTotals[sub] = (subTotals[sub] || 0) + e.amount;
        });
    return Object.entries(subTotals)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
}

/**
 * Get monthly spend for a specific category
 * Returns array of { month, amount } sorted chronologically
 */
export function getMonthlyCategorySpend(categoryName: string): { month: string; amount: number }[] {
    const monthTotals: Record<string, number> = {};
    allEntries
        .filter(e => e.category === categoryName)
        .forEach(e => {
            monthTotals[e.date] = (monthTotals[e.date] || 0) + e.amount;
        });
    return Object.entries(monthTotals)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => parseDate(a.month).getTime() - parseDate(b.month).getTime());
}

/**
 * Get total spend across all categories
 */
export function getTotalSpend(timeframe?: number | string, departmentFilter?: string): number {
    let entries = timeframe ? filterByTimeframe(allEntries, timeframe) : allEntries;
    if (departmentFilter) {
        entries = entries.filter(e => e.category.toLowerCase() === departmentFilter.toLowerCase());
    }
    return entries.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Get monthly overall spend
 */
export function getMonthlySpend(): { month: string; spend: number }[] {
    const monthTotals: Record<string, number> = {};
    allEntries.forEach(e => {
        monthTotals[e.date] = (monthTotals[e.date] || 0) + e.amount;
    });
    return Object.entries(monthTotals)
        .map(([month, spend]) => ({ month, spend }))
        .sort((a, b) => parseDate(a.month).getTime() - parseDate(b.month).getTime());
}

/**
 * Get all unique category names
 */
export function getAllCategories(): string[] {
    return [...new Set(allEntries.map(e => e.category))].sort();
}

// --- Helpers ---

function filterByTimeframe(entries: FinancialEntry[], timeframe: number | string): FinancialEntry[] {
    if (typeof timeframe === 'number') {
        const suffix = String(timeframe).slice(-2);
        return entries.filter(e => e.date.endsWith(`-${suffix}`));
    }
    // If it's a string, it maps to exactly a specific month (e.g. "Jan-25")
    return entries.filter(e => e.date === timeframe);
}

function parseDate(dateStr: string): Date {
    const [mon, yr] = dateStr.split('-');
    const months: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const fullYear = Number(yr) < 50 ? 2000 + Number(yr) : 1900 + Number(yr);
    return new Date(fullYear, months[mon] || 0, 1);
}

export { allEntries };

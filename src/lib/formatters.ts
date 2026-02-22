/**
 * Utility formatting functions — testable & reusable
 */

/** Format a number as Euro currency: 1234.5 → "1 234,50 €" */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

/** Format an ISO date string or Date to French locale: "2024-01-15" → "15 janv. 2024" */
export function formatDate(date: string | Date): string {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(d);
}

/** Format a ratio as percentage: 0.756 → "75.6%" */
export function formatPercent(value: number, decimals = 1): string {
    return `${(value * 100).toFixed(decimals)}%`;
}

/** Format a number with thousand separators: 1234567 → "1 234 567" */
export function formatNumber(value: number): string {
    return new Intl.NumberFormat("fr-FR").format(value);
}

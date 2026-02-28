/**
 * Format a number for dashboard display (e.g. 1500 → "1.5k").
 */
export const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '0';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toLocaleString();
};

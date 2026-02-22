/**
 * Financial calculation functions — testable & reusable
 */

/**
 * Calculate TTC from HT and TVA rate.
 * @param ht  - Amount excluding tax (HT)
 * @param tva - Tax rate as a percentage, e.g. 20 for 20%
 */
export function calcTTC(ht: number, tva: number): number {
    return Math.round(ht * (1 + tva / 100) * 100) / 100;
}

/**
 * Calculate HT from TTC and TVA rate.
 * @param ttc - Amount including tax (TTC)
 * @param tva - Tax rate as a percentage, e.g. 20 for 20%
 */
export function calcHT(ttc: number, tva: number): number {
    return Math.round((ttc / (1 + tva / 100)) * 100) / 100;
}

/**
 * Calculate the TVA amount from HT.
 * @param ht  - Amount excluding tax (HT)
 * @param tva - Tax rate as a percentage, e.g. 20 for 20%
 */
export function calcTVAAmount(ht: number, tva: number): number {
    return Math.round(ht * (tva / 100) * 100) / 100;
}

/**
 * Calculate conversion rate (devis → commandes).
 * @param converted - Number of converted items
 * @param total     - Total items
 */
export function calcConversionRate(converted: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((converted / total) * 10000) / 10000; // 4 decimal precision
}

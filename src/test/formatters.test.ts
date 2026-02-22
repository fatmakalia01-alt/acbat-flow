import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, formatPercent, formatNumber } from "@/lib/formatters";

describe("formatCurrency", () => {
    it("formats zero correctly", () => {
        expect(formatCurrency(0)).toBe("0,00 €");
    });

    it("formats a positive integer", () => {
        expect(formatCurrency(1000)).toBe("1 000,00 €");
    });

    it("formats a decimal value", () => {
        expect(formatCurrency(1234.5)).toBe("1 234,50 €");
    });

    it("formats a negative value", () => {
        expect(formatCurrency(-500)).toBe("-500,00 €");
    });

    it("rounds to 2 decimal places", () => {
        expect(formatCurrency(9.999)).toBe("10,00 €");
    });
});

describe("formatDate", () => {
    it("returns em-dash for invalid date", () => {
        expect(formatDate("not-a-date")).toBe("—");
    });

    it("formats a valid ISO date string", () => {
        const result = formatDate("2024-01-15");
        expect(result).toContain("2024");
        expect(result).toContain("15");
    });

    it("formats a Date object", () => {
        const d = new Date(2024, 5, 1); // June 1, 2024
        const result = formatDate(d);
        expect(result).toContain("2024");
        expect(result).toContain("1");
    });
});

describe("formatPercent", () => {
    it("formats 0 as '0.0%'", () => {
        expect(formatPercent(0)).toBe("0.0%");
    });

    it("formats 1 as '100.0%'", () => {
        expect(formatPercent(1)).toBe("100.0%");
    });

    it("formats 0.756 correctly", () => {
        expect(formatPercent(0.756)).toBe("75.6%");
    });

    it("respects custom decimal count", () => {
        expect(formatPercent(0.5, 0)).toBe("50%");
        expect(formatPercent(0.1234, 2)).toBe("12.34%");
    });
});

describe("formatNumber", () => {
    it("formats large numbers with French separators", () => {
        // French thousand separator is a narrow no-break space or regular space
        const result = formatNumber(1234567);
        expect(result).toContain("1");
        expect(result).toContain("234");
        expect(result).toContain("567");
    });

    it("formats zero", () => {
        expect(formatNumber(0)).toBe("0");
    });
});

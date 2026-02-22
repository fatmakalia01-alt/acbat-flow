import { describe, it, expect } from "vitest";
import { calcTTC, calcHT, calcTVAAmount, calcConversionRate } from "@/lib/calculations";

describe("calcTTC", () => {
    it("calculates TTC with 20% TVA", () => {
        expect(calcTTC(1000, 20)).toBe(1200);
    });

    it("calculates TTC with 10% TVA", () => {
        expect(calcTTC(500, 10)).toBe(550);
    });

    it("calculates TTC with 0% TVA", () => {
        expect(calcTTC(250, 0)).toBe(250);
    });

    it("handles decimal HT values", () => {
        expect(calcTTC(99.99, 20)).toBe(119.99);
    });

    it("calculates TTC with 5.5% TVA", () => {
        expect(calcTTC(100, 5.5)).toBe(105.5);
    });
});

describe("calcHT", () => {
    it("calculates HT from TTC with 20% TVA", () => {
        expect(calcHT(1200, 20)).toBe(1000);
    });

    it("calculates HT from TTC with 10% TVA", () => {
        expect(calcHT(550, 10)).toBe(500);
    });

    it("calculates HT from TTC with 0% TVA", () => {
        expect(calcHT(250, 0)).toBe(250);
    });

    it("roundtrips correctly: calcHT(calcTTC(x)) === x", () => {
        const ht = 345.67;
        const tva = 20;
        const ttc = calcTTC(ht, tva);
        expect(calcHT(ttc, tva)).toBe(ht);
    });
});

describe("calcTVAAmount", () => {
    it("calculates TVA amount at 20%", () => {
        expect(calcTVAAmount(1000, 20)).toBe(200);
    });

    it("calculates TVA amount at 5.5%", () => {
        expect(calcTVAAmount(100, 5.5)).toBe(5.5);
    });

    it("returns 0 for 0% TVA", () => {
        expect(calcTVAAmount(500, 0)).toBe(0);
    });

    it("TTC = HT + TVAAmount", () => {
        const ht = 800;
        const tva = 20;
        expect(calcTVAAmount(ht, tva) + ht).toBe(calcTTC(ht, tva));
    });
});

describe("calcConversionRate", () => {
    it("returns 0 for 0 total", () => {
        expect(calcConversionRate(5, 0)).toBe(0);
    });

    it("returns 1 for 100% conversion", () => {
        expect(calcConversionRate(10, 10)).toBe(1);
    });

    it("calculates 50% conversion", () => {
        expect(calcConversionRate(5, 10)).toBe(0.5);
    });

    it("calculates partial conversion", () => {
        expect(calcConversionRate(3, 7)).toBeCloseTo(0.4286, 3);
    });
});

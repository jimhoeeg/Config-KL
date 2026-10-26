import { describe, expect, it } from "vitest";
import { computeHeatDemand } from "@/lib/engine/heatDemand";
import { computeEconomy, currentHeatingCost, priceRange, scopFor, subsidyFor } from "@/lib/engine/pricing";
import { recommend } from "@/lib/engine/recommend";
import { evaluate, headlineEconomy } from "@/lib/engine";
import { cfg, oilHouse } from "./fixtures";

describe("priceRange", () => {
  it("keeps air-to-water inside the configured interval", () => {
    for (const area of [60, 140, 300]) {
      const a = { ...oilHouse, areaM2: area };
      const r = recommend(a, cfg);
      const p = priceRange(r.primary, a, r.heat, cfg);
      expect(p.low).toBeGreaterThanOrEqual(cfg.prices.airToWater.min);
      expect(p.high).toBeLessThanOrEqual(cfg.prices.airToWater.max);
      expect(p.high).toBeGreaterThan(p.low);
    }
  });

  it("adds oil tank removal for oil houses", () => {
    const a = { ...oilHouse, areaM2: 100, yearBuilt: 1990 };
    const r = recommend(a, cfg);
    const withOil = priceRange(r.primary, a, r.heat, cfg);
    const withGas = priceRange(r.primary, { ...a, heating: "gas" }, r.heat, cfg);
    expect(withOil.low - withGas.low).toBe(cfg.prices.complexity.oilTankRemoval);
  });

  it("adds extra indoor units for multisplit air-to-air", () => {
    const a = { ...oilHouse, heating: "elvarme" as const, emitter: "elpaneler" as const, areaM2: 200 };
    const r = recommend(a, cfg);
    expect(r.primary.indoorUnits).toBe(3);
    expect(priceRange(r.primary, a, r.heat, cfg)).toEqual({ low: 15000 + 2 * 8000, high: 30000 + 2 * 12000 });
  });
});

describe("subsidyFor", () => {
  it("gives Varmepumpepuljen to air-to-water but not air-to-air or sommerhus", () => {
    const r = recommend(oilHouse, cfg);
    expect(subsidyFor(r.primary, oilHouse, cfg)).toBe(27000);
    expect(subsidyFor(r.alternatives[1], oilHouse, cfg)).toBe(0);
    expect(subsidyFor(r.primary, { ...oilHouse, segment: "sommerhus" }, cfg)).toBe(0);
  });
});

describe("scopFor", () => {
  it("adds the ground source bonus, capped", () => {
    const heat = computeHeatDemand({ emitter: "gulvvarme" }, cfg);
    const option = { type: "jordvarme" as const, title: "", summary: "", why: [], caveats: [] };
    expect(scopFor(option, heat, cfg)).toBe(5);
  });
});

describe("computeEconomy", () => {
  it("computes a full economy for the oil house", () => {
    const ev = evaluate(oilHouse, cfg);
    const e = headlineEconomy(ev)!;
    expect(e.solution).toBe("luft_til_vand");
    expect(e.subsidy).toBe(27000);
    expect(e.netPrice.low).toBe(e.price.low - 27000);
    expect(e.annualSaving).toBeGreaterThan(0);
    expect(e.newRunningCost).toBeLessThan(e.currentCost);
    expect(e.payback!.low).toBeLessThan(e.payback!.high);
    expect(e.co2ReductionKg).toBeGreaterThan(0);
    expect(e.service.total).toBe(10000);
    // running cost = demand / SCOP(mellem 3.5) × 2.50
    expect(e.newRunningCost).toBe(Math.round((26090 / 3.5) * 2.5 / 100) * 100);
  });

  it("returns null for non heat-pump options", () => {
    const r = recommend({ ...oilHouse, heating: "fjernvarme" }, cfg);
    expect(computeEconomy(r.primary, oilHouse, r.heat, cfg)).toBeNull();
  });

  it("uses the first heat-pump alternative as headline when the primary is not a heat pump", () => {
    const ev = evaluate({ ...oilHouse, fjernvarmeAvailable: "ja" }, cfg);
    expect(ev.primaryEconomy).toBeNull();
    expect(headlineEconomy(ev)?.solution).toBe("luft_til_vand");
  });

  it("keeps the uncovered share on the current heating for air-to-air", () => {
    const a = { ...oilHouse, heating: "elvarme" as const, emitter: "elpaneler" as const, areaM2: 80 };
    const e = headlineEconomy(evaluate(a, cfg))!;
    expect(e.coverage).toBe(0.6);
    expect(e.currentCost).toBeGreaterThan(e.newRunningCost);
  });
});

describe("currentHeatingCost", () => {
  it("prices oil by litres", () => {
    expect(currentHeatingCost(8500, { heating: "olie" }, cfg)).toBeCloseTo(1000 * 13);
  });
  it("prices electric heating by kWh", () => {
    expect(currentHeatingCost(10000, { heating: "elvarme" }, cfg)).toBe(25000);
  });
});

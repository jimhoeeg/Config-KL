import { describe, expect, it } from "vitest";
import { flattenSection, parseSection } from "@/lib/admin/configForm";
import { defaultConfig, mergeConfig } from "@/lib/config/defaults";

describe("config form", () => {
  it("round-trips a section through flatten/parse", () => {
    const fields = flattenSection(defaultConfig.prices);
    const map = new Map(fields.map((f) => [f.path, f.value]));
    const { value, errors } = parseSection("prices", (p) => map.get(p) ?? null);
    expect(errors).toEqual([]);
    expect(value).toEqual(defaultConfig.prices);
  });

  it("coerces numbers with Danish decimal comma and rejects bad JSON", () => {
    const { value, errors } = parseSection("energy", (p) => (p === "electricityPrice" ? "2,75" : null));
    expect((value as typeof defaultConfig.energy).electricityPrice).toBe(2.75);
    expect(errors).toEqual([]);
    const bad = parseSection("serviceArea", (p) => (p === "ranges" ? "not json" : null));
    expect(bad.errors.length).toBe(1);
  });

  it("deep-merges overrides onto defaults", () => {
    const cfg = mergeConfig({ prices: { airToAir: { low: 18000 } } });
    expect(cfg.prices.airToAir.low).toBe(18000);
    expect(cfg.prices.airToAir.high).toBe(defaultConfig.prices.airToAir.high);
    expect(cfg.energy).toEqual(defaultConfig.energy);
  });
});

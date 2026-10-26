import { describe, expect, it } from "vitest";
import {
  actualHeatFromConsumption,
  computeHeatDemand,
  eraFor,
  estimateFlowTemp,
  insulationModifier,
  roundToStandardSize,
} from "@/lib/engine/heatDemand";
import { cfg, oilHouse } from "./fixtures";

describe("eraFor", () => {
  it("maps build years to eras at the boundaries", () => {
    expect(eraFor(1959)).toBe("pre1960");
    expect(eraFor(1960)).toBe("from1960to1979");
    expect(eraFor(1979)).toBe("from1960to1979");
    expect(eraFor(1980)).toBe("from1980to2005");
    expect(eraFor(2005)).toBe("from1980to2005");
    expect(eraFor(2006)).toBe("from2006");
  });
});

describe("insulationModifier", () => {
  it("is 1 with no answers", () => {
    expect(insulationModifier({}, cfg)).toBe(1);
  });
  it("adds up component adjustments", () => {
    // dobbelt 0 + lidt 0.04 + delvist 0.03 + lidt 0.02
    expect(insulationModifier(oilHouse, cfg)).toBe(1.09);
  });
  it("clamps to the configured max", () => {
    expect(insulationModifier({ windows: "enkelt", roof: "ingen", walls: "uisoleret", draughts: "meget" }, cfg)).toBe(1.3);
  });
});

describe("computeHeatDemand", () => {
  it("estimates from area × era × insulation + hot water", () => {
    const r = computeHeatDemand(oilHouse, cfg);
    // 140 × 150 × 1.09 = 22,890 + 4 × 800 = 26,090
    expect(r.source).toBe("estimate");
    expect(r.annualKwh).toBe(26090);
    expect(r.hotWaterKwh).toBe(3200);
    expect(r.rawKw).toBe(13.05);
    expect(r.sizeKw).toBe(14);
  });

  it("prefers actual oil consumption when entered", () => {
    const a = { ...oilHouse, knowsConsumption: true, consumptionValue: 2000, consumptionUnit: "liter_olie" as const };
    // 2000 l × 10 kWh × 0.85
    expect(actualHeatFromConsumption(a, cfg)).toBe(17000);
    const r = computeHeatDemand(a, cfg);
    expect(r.source).toBe("actual");
    expect(r.annualKwh).toBe(17000);
    expect(r.sizeKw).toBe(10);
  });

  it("converts gas m³ with boiler efficiency", () => {
    const a = { heating: "gas" as const, knowsConsumption: true, consumptionValue: 1500, consumptionUnit: "m3_gas" as const };
    expect(actualHeatFromConsumption(a, cfg)).toBe(Math.round(1500 * 11 * 0.95));
  });

  it("multiplies old heat pump electricity by its SCOP", () => {
    const a = { heating: "gammel_varmepumpe" as const, knowsConsumption: true, consumptionValue: 6000, consumptionUnit: "kwh" as const };
    expect(actualHeatFromConsumption(a, cfg)).toBe(15000);
  });

  it("ignores consumption when the user says they do not know it", () => {
    const a = { ...oilHouse, knowsConsumption: false, consumptionValue: 2000, consumptionUnit: "liter_olie" as const };
    expect(computeHeatDemand(a, cfg).source).toBe("estimate");
  });
});

describe("roundToStandardSize", () => {
  it("rounds up and caps at the largest size", () => {
    expect(roundToStandardSize(3.2, cfg.heatDemand.standardSizesKw)).toBe(4);
    expect(roundToStandardSize(8, cfg.heatDemand.standardSizesKw)).toBe(8);
    expect(roundToStandardSize(30, cfg.heatDemand.standardSizesKw)).toBe(16);
  });
});

describe("estimateFlowTemp", () => {
  it("is low for underfloor heating", () => {
    expect(estimateFlowTemp({ emitter: "gulvvarme" }, cfg)).toBe("lav");
  });
  it("is low-medium for large radiators", () => {
    expect(estimateFlowTemp({ emitter: "radiatorer", radiatorSize: "store" }, cfg)).toBe("lav_mellem");
  });
  it("is high for small radiators in a poorly insulated house", () => {
    expect(estimateFlowTemp({ emitter: "radiatorer", radiatorSize: "smaa", windows: "enkelt", roof: "ingen" }, cfg)).toBe("hoej");
  });
  it("drops a level when the house is warm at low temperatures", () => {
    expect(estimateFlowTemp({ emitter: "radiatorer", radiatorSize: "standard", warmAtLowTemp: "ja" }, cfg)).toBe("lav_mellem");
  });
});

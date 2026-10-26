import type { AppConfig } from "@/lib/config/defaults";
import type { Answers } from "@/lib/schema/answers";

export type Era = "pre1960" | "from1960to1979" | "from1980to2005" | "from2006";
export type FlowTemp = "lav" | "lav_mellem" | "mellem" | "hoej";

export interface HeatDemandResult {
  /** Total annual heat demand (space heating + hot water), kWh. */
  annualKwh: number;
  /** Where the number came from. */
  source: "actual" | "estimate";
  era: Era;
  eraFactor: number;
  insulationModifier: number;
  hotWaterKwh: number;
  /** Required heat output, kW (rounded up to a standard size). */
  sizeKw: number;
  /** Unrounded kW for transparency. */
  rawKw: number;
  flowTemp: FlowTemp;
}

const DEFAULT_AREA = 140;
const DEFAULT_YEAR = 1975;
const DEFAULT_HOUSEHOLD = 2;

export function eraFor(year: number): Era {
  if (year < 1960) return "pre1960";
  if (year < 1980) return "from1960to1979";
  if (year <= 2005) return "from1980to2005";
  return "from2006";
}

export function insulationModifier(a: Answers, cfg: AppConfig): number {
  const adj = cfg.heatDemand.insulationAdjustments;
  const sum =
    (a.windows ? adj.windows[a.windows] : 0) +
    (a.roof ? adj.roof[a.roof] : 0) +
    (a.walls ? adj.walls[a.walls] : 0) +
    (a.draughts ? adj.draughts[a.draughts] : 0);
  const { insulationModifierMin: min, insulationModifierMax: max } = cfg.heatDemand;
  return round2(clamp(1 + sum, min, max));
}

export function isInsulationReasonable(a: Answers, cfg: AppConfig): boolean {
  return insulationModifier(a, cfg) <= cfg.heatDemand.reasonableInsulationMax;
}

/**
 * Converts entered annual consumption to delivered heat (kWh).
 * Returns null when nothing usable was entered.
 */
export function actualHeatFromConsumption(a: Answers, cfg: AppConfig): number | null {
  if (!a.knowsConsumption || !a.consumptionValue || !a.consumptionUnit || !a.heating) return null;
  const hd = cfg.heatDemand;
  const raw = a.consumptionValue * hd.fuelKwhPerUnit[a.consumptionUnit];
  if (a.heating === "gammel_varmepumpe") return Math.round(raw * hd.oldHeatPumpScop);
  const eff = hd.boilerEfficiency[a.heating] ?? 1;
  return Math.round(raw * eff);
}

/**
 * Estimates the flow temperature the house needs. This is the key driver of
 * air-to-water efficiency: big emitters and good insulation → low flow temp.
 */
export function estimateFlowTemp(a: Answers, cfg: AppConfig): FlowTemp {
  if (a.emitter === "gulvvarme") return "lav";
  const poorInsulation = !isInsulationReasonable(a, cfg);
  let level: number; // 0 = lav … 3 = hoej
  if (a.emitter === "mix") level = 1;
  else if (a.radiatorSize === "store") level = 1;
  else if (a.radiatorSize === "smaa") level = 3;
  else level = 2;
  if (a.warmAtLowTemp === "ja") level -= 1;
  if (a.warmAtLowTemp === "nej") level += 1;
  if (poorInsulation) level += 1;
  const levels: FlowTemp[] = ["lav", "lav_mellem", "mellem", "hoej"];
  return levels[clamp(level, 0, 3)];
}

export function roundToStandardSize(kw: number, sizes: number[]): number {
  const sorted = [...sizes].sort((x, y) => x - y);
  return sorted.find((s) => s >= kw) ?? sorted[sorted.length - 1];
}

export function computeHeatDemand(a: Answers, cfg: AppConfig): HeatDemandResult {
  const hd = cfg.heatDemand;
  const area = a.areaM2 ?? DEFAULT_AREA;
  const era = eraFor(a.yearBuilt ?? DEFAULT_YEAR);
  const eraFactor = hd.eraFactors[era];
  const modifier = insulationModifier(a, cfg);

  const actual = actualHeatFromConsumption(a, cfg);
  let annualKwh: number;
  let hotWaterKwh = 0;
  if (actual !== null) {
    annualKwh = actual;
  } else {
    hotWaterKwh = (a.householdSize ?? DEFAULT_HOUSEHOLD) * hd.hotWaterKwhPerPerson[a.hotWater ?? "mix"];
    annualKwh = Math.round(area * eraFactor * modifier + hotWaterKwh);
  }

  const rawKw = round2(annualKwh / hd.fullLoadHours);
  return {
    annualKwh,
    source: actual !== null ? "actual" : "estimate",
    era,
    eraFactor,
    insulationModifier: modifier,
    hotWaterKwh,
    rawKw,
    sizeKw: roundToStandardSize(rawKw, hd.standardSizesKw),
    flowTemp: estimateFlowTemp(a, cfg),
  };
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

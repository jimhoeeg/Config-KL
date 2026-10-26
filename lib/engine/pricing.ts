import type { AppConfig } from "@/lib/config/defaults";
import type { Answers } from "@/lib/schema/answers";
import { clamp, type HeatDemandResult } from "./heatDemand";
import { isHeatPump, type SolutionOption } from "./recommend";

export interface Range {
  low: number;
  high: number;
}

export interface Economy {
  solution: SolutionOption["type"];
  price: Range;
  subsidy: number;
  /** Possible tax value of håndværkerfradrag – shown separately, NOT deducted from net price. */
  possibleDeductionValue: number;
  netPrice: Range;
  scop: number;
  /** Current annual heating cost (estimated). */
  currentCost: number;
  /** Annual running cost after the heat pump (incl. any remaining existing heating). */
  newRunningCost: number;
  annualSaving: number;
  /** Years; null when there is no saving. */
  payback: Range | null;
  co2ReductionKg: number;
  service: { perYear: number; years: number; total: number };
  /** Net price + service + running cost over the service period. */
  totalCostOfOwnership: Range;
  coverage: number;
}

/** Price interval for a solution before subsidies. */
export function priceRange(option: SolutionOption, a: Answers, heat: HeatDemandResult, cfg: AppConfig): Range {
  const p = cfg.prices;
  if (option.type === "luft_til_luft") {
    const extra = Math.max(0, (option.indoorUnits ?? 1) - 1);
    return {
      low: p.airToAir.low + extra * p.airToAir.extraUnitLow,
      high: p.airToAir.high + extra * p.airToAir.extraUnitHigh,
    };
  }
  if (option.type === "luft_til_vand" || option.type === "jordvarme") {
    const band = option.type === "luft_til_vand" ? p.airToWater : p.groundSource;
    const pos = clamp((heat.sizeKw - p.sizingKwRange.min) / (p.sizingKwRange.max - p.sizingKwRange.min), 0, 1);
    let low = band.min + pos * (band.max - band.min - band.bandWidth);
    let high = low + band.bandWidth;

    const c = p.complexity;
    if (a.heating === "olie") {
      low += c.oilTankRemoval;
      high += c.oilTankRemoval;
    }
    if ((a.householdSize ?? 0) >= 5 || a.hotWater === "karbad") {
      low += c.hotWaterTank;
      high += c.hotWaterTank;
    }
    // Electrical upgrade is uncertain until inspection → widen the top of the range only.
    if ((a.yearBuilt ?? 9999) < p.electricalUpgradeBeforeYear) high += c.electricalUpgrade;

    high = Math.min(high, band.max);
    low = Math.min(low, high - band.bandWidth / 2);
    return { low: roundTo(low, 1000), high: roundTo(high, 1000) };
  }
  return { low: 0, high: 0 };
}

export function scopFor(option: SolutionOption, heat: HeatDemandResult, cfg: AppConfig): number {
  const s = cfg.scop;
  if (option.type === "luft_til_luft") return s.airToAir;
  const air = s.airToWater[heat.flowTemp];
  if (option.type === "jordvarme") return Math.min(s.groundSourceMax, air + s.groundSourceBonus);
  return air;
}

/** Estimated cost of delivering `kwh` of heat with the current heating system. */
export function currentHeatingCost(kwh: number, a: Answers, cfg: AppConfig): number {
  const { fuelKwhPerUnit: perUnit, boilerEfficiency: eff, oldHeatPumpScop } = cfg.heatDemand;
  const { fuelPrices: f, electricityPrice: el } = cfg.energy;
  switch (a.heating) {
    case "olie":
      return (kwh / (perUnit.liter_olie * eff.olie)) * f.olie_per_liter;
    case "gas":
      return (kwh / (perUnit.m3_gas * eff.gas)) * f.gas_per_m3;
    case "traepiller":
      return (kwh / (perUnit.kg_traepiller * eff.traepiller)) * f.traepiller_per_kg;
    case "fjernvarme":
      return kwh * f.fjernvarme_per_kwh;
    case "gammel_varmepumpe":
      return (kwh / oldHeatPumpScop) * el;
    case "elvarme":
    default:
      return kwh * el;
  }
}

/** kg CO₂ for delivering `kwh` of heat with the current system. */
export function currentHeatingCo2(kwh: number, a: Answers, cfg: AppConfig): number {
  const { boilerEfficiency: eff, oldHeatPumpScop } = cfg.heatDemand;
  const co2 = cfg.energy.co2PerKwh;
  switch (a.heating) {
    case "olie":
      return (kwh / eff.olie) * co2.olie;
    case "gas":
      return (kwh / eff.gas) * co2.gas;
    case "traepiller":
      return (kwh / eff.traepiller) * co2.traepiller;
    case "fjernvarme":
      return kwh * co2.fjernvarme;
    case "gammel_varmepumpe":
      return (kwh / oldHeatPumpScop) * co2.el;
    case "elvarme":
    default:
      return kwh * co2.el;
  }
}

export function subsidyFor(option: SolutionOption, a: Answers, cfg: AppConfig): number {
  if (option.type !== "luft_til_vand" && option.type !== "jordvarme") return 0;
  const isSommerhus = a.segment === "sommerhus" || a.houseType === "sommerhus";
  if (isSommerhus && !cfg.subsidies.varmepumpepuljenAppliesToSommerhus) return 0;
  return cfg.subsidies.varmepumpepuljen;
}

export function computeEconomy(option: SolutionOption, a: Answers, heat: HeatDemandResult, cfg: AppConfig): Economy | null {
  if (!isHeatPump(option.type)) return null;

  const price = priceRange(option, a, heat, cfg);
  const subsidy = subsidyFor(option, a, cfg);
  const adults = Math.min(2, Math.max(1, a.householdSize ?? 2));
  const s = cfg.subsidies;
  const deductibleLabour = Math.min(price.low * cfg.prices.laborShare, s.craftsmanDeductionPerPerson * adults);
  const possibleDeductionValue = roundTo(deductibleLabour * s.deductionTaxValue, 100);
  const netPrice = { low: Math.max(0, price.low - subsidy), high: Math.max(0, price.high - subsidy) };

  const scop = scopFor(option, heat, cfg);
  const el = cfg.energy.electricityPrice;
  const coverage =
    option.type === "luft_til_luft"
      ? (option.indoorUnits ?? 1) > 1
        ? cfg.heatDemand.airToAirCoverage.multi
        : cfg.heatDemand.airToAirCoverage.single
      : 1;

  const covered = heat.annualKwh * coverage;
  const remaining = heat.annualKwh - covered;
  const currentCost = currentHeatingCost(heat.annualKwh, a, cfg);
  const newRunningCost = (covered / scop) * el + currentHeatingCost(remaining, a, cfg);
  const annualSaving = currentCost - newRunningCost;

  const co2Now = currentHeatingCo2(heat.annualKwh, a, cfg);
  const co2After = (covered / scop) * cfg.energy.co2PerKwh.el + currentHeatingCo2(remaining, a, cfg);

  const svc = cfg.service;
  const serviceTotal = svc.pricePerYear * svc.years;
  const runningOverPeriod = newRunningCost * svc.years;

  return {
    solution: option.type,
    price,
    subsidy,
    possibleDeductionValue,
    netPrice,
    scop,
    currentCost: roundTo(currentCost, 100),
    newRunningCost: roundTo(newRunningCost, 100),
    annualSaving: roundTo(annualSaving, 100),
    payback:
      annualSaving > 0
        ? { low: round1(netPrice.low / annualSaving), high: round1(netPrice.high / annualSaving) }
        : null,
    co2ReductionKg: Math.max(0, roundTo(co2Now - co2After, 10)),
    service: { perYear: svc.pricePerYear, years: svc.years, total: serviceTotal },
    totalCostOfOwnership: {
      low: roundTo(netPrice.low + serviceTotal + runningOverPeriod, 1000),
      high: roundTo(netPrice.high + serviceTotal + runningOverPeriod, 1000),
    },
    coverage,
  };
}

function roundTo(v: number, step: number): number {
  return Math.round(v / step) * step;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

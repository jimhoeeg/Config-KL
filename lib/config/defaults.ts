/**
 * All business constants for Varmepumperådgiveren live here.
 *
 * These are the *defaults*. At runtime they are deep-merged with the rows in
 * the Supabase `config` table (one row per top-level section), so KL Køleteknik
 * can calibrate every value from /admin/config without a deploy.
 *
 * Money is in DKK incl. VAT. Energy in kWh.
 */

export const defaultConfig = {
  heatDemand: {
    /** kWh per m² per year by building era (space heating). */
    eraFactors: {
      pre1960: 180,
      from1960to1979: 150,
      from1980to2005: 110,
      from2006: 70,
    },
    /** Insulation modifier = 1 + sum of adjustments below, clamped to [min, max]. */
    insulationAdjustments: {
      windows: { enkelt: 0.12, dobbelt: 0, tre_lag: -0.06 },
      roof: { ingen: 0.1, lidt: 0.04, god: -0.05, ved_ikke: 0 },
      walls: { uisoleret: 0.08, delvist: 0.03, isoleret: -0.05, ved_ikke: 0 },
      draughts: { meget: 0.05, lidt: 0.02, nej: 0 },
    },
    insulationModifierMin: 0.8,
    insulationModifierMax: 1.3,
    /** Modifier at or below this counts as "reasonable insulation" in scoring. */
    reasonableInsulationMax: 1.1,
    /** "Insulate first" when modifier >= this AND the house is built before 1960. */
    insulateFirstModifier: 1.25,
    insulateFirstBeforeYear: 1960,
    /**
     * Domestic hot water added to the estimated demand (kWh per person per year).
     * Only used when actual consumption is NOT entered. Set to 0 to use the pure
     * area × era × insulation formula.
     */
    hotWaterKwhPerPerson: { brusere: 800, mix: 1000, karbad: 1250 },
    /** Conversion of entered consumption to delivered heat. */
    fuelKwhPerUnit: { liter_olie: 10, m3_gas: 11, kg_traepiller: 4.8, kwh: 1 },
    boilerEfficiency: { olie: 0.85, gas: 0.95, traepiller: 0.8, elvarme: 1, fjernvarme: 1 },
    /** Seasonal COP assumed for an existing old heat pump (kWh electricity → heat). */
    oldHeatPumpScop: 2.5,
    /** Sizing: kW ≈ annual demand ÷ full-load hours, rounded up to a standard size. */
    fullLoadHours: 2000,
    standardSizesKw: [4, 6, 8, 10, 12, 14, 16],
    /** Air-to-air: one indoor unit covers roughly this many m² (open plan). */
    airToAirM2PerUnit: 90,
    airToAirMaxUnits: 4,
    /** Share of the heat demand an air-to-air solution covers (rest stays on existing heating). */
    airToAirCoverage: { single: 0.6, multi: 0.8 },
    /** Ground source becomes the primary pick above this demand when the plot is large. */
    groundSourceMinKwh: 20000,
  },

  scop: {
    /** Air-to-water SCOP by estimated flow temperature. */
    airToWater: { lav: 4.5, lav_mellem: 4.0, mellem: 3.5, hoej: 3.0 },
    airToAir: 4.5,
    /** Ground source is more stable; add this to the air-to-water SCOP (capped). */
    groundSourceBonus: 0.5,
    groundSourceMax: 5.0,
  },

  prices: {
    airToAir: { low: 15000, high: 30000, extraUnitLow: 8000, extraUnitHigh: 12000 },
    airToWater: { min: 100000, max: 165000, bandWidth: 25000 },
    groundSource: { min: 150000, max: 250000, bandWidth: 50000 },
    /** Complexity add-ons for air-to-water / ground source (capped at max). */
    complexity: { oilTankRemoval: 5000, electricalUpgrade: 8000, hotWaterTank: 10000 },
    /** Electrical upgrade is assumed likely (added to the high end) for houses built before this year. */
    electricalUpgradeBeforeYear: 1975,
    /** kW range used to position the price inside the min–max interval. */
    sizingKwRange: { min: 4, max: 16 },
    /** Estimated labour share of the installation price (for the deduction estimate). */
    laborShare: 0.3,
  },

  subsidies: {
    /** Varmepumpepuljen 2026 – fixed, tax-free. Air-to-water and ground source only. */
    varmepumpepuljen: 27000,
    varmepumpepuljenAppliesToSommerhus: false,
    /** Shown price for a house already on district heating: assume no subsidy unless confirmed. */
    varmepumpepuljenAppliesToFjernvarme: false,
    /** Håndværkerfradrag 2026: max deductible labour per adult. */
    craftsmanDeductionPerPerson: 9000,
    /** Approximate tax value of a deduction. */
    deductionTaxValue: 0.26,
  },

  energy: {
    electricityPrice: 2.5,
    fuelPrices: { olie_per_liter: 13.0, gas_per_m3: 8.5, traepiller_per_kg: 3.0, fjernvarme_per_kwh: 0.9 },
    /** kg CO₂ per kWh of fuel/electricity consumed. */
    co2PerKwh: { olie: 0.267, gas: 0.204, el: 0.12, traepiller: 0.03, fjernvarme: 0.05 },
  },

  service: {
    pricePerYear: 2000,
    years: 5,
  },

  serviceArea: {
    /** Inclusive postal-code ranges. Default: Zealand, Lolland-Falster, Møn and the small islands (excl. Bornholm). */
    ranges: [
      [1000, 3699],
      [4000, 4999],
    ] as [number, number][],
    include: [] as string[],
    exclude: [] as string[],
  },

  contact: {
    companyName: "KL Køleteknik",
    phone: "",
    website: "https://klkoleteknik.dk",
  },

  trustpilot: {
    /** Link to the Trustpilot profile. Strip is hidden when empty. */
    profileUrl: "",
    score: null as number | null,
    reviewCount: null as number | null,
    /** Only add real, verbatim reviews here. */
    reviews: [] as { author: string; text: string; stars: number }[],
  },
};

export type AppConfig = typeof defaultConfig;
export type ConfigSection = keyof AppConfig;
export const configSections = Object.keys(defaultConfig) as ConfigSection[];

/** Deep-merge DB overrides onto defaults. Arrays and primitives replace; objects merge. */
export function mergeConfig(overrides: Partial<Record<string, unknown>>): AppConfig {
  return deepMerge(structuredClone(defaultConfig), overrides) as AppConfig;
}

function deepMerge(target: unknown, source: unknown): unknown {
  if (!isPlainObject(target) || !isPlainObject(source)) return source === undefined ? target : source;
  const out: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    out[key] = key in target ? deepMerge(target[key], value) : value;
  }
  return out;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

import type { AppConfig } from "@/lib/config/defaults";
import type { Answers, Engagement } from "@/lib/schema/answers";
import { isInsulationReasonable } from "./heatDemand";
import { isHeatPump, type Recommendation, type SolutionOption } from "./recommend";

export const SCORING_MODEL_VERSION = "1.0.0";

export type Tier = "A" | "B" | "C" | "D";
export type LeadFlag = "fjernvarme" | "fjernvarme_tilgaengelig" | "outside_area";

export interface ScoreLine {
  label: string;
  points: number;
}

export interface LeadScore {
  total: number;
  fit: number;
  value: number;
  intent: number;
  dataQuality: number;
  tier: Tier;
  disqualified: boolean;
  flags: LeadFlag[];
  breakdown: { fit: ScoreLine[]; value: ScoreLine[]; intent: ScoreLine[]; dataQuality: ScoreLine[] };
  modelVersion: string;
}

export interface ScoringInput {
  answers: Answers;
  recommendation: Recommendation;
  contact: { email?: string; phone?: string; wantsInspection: boolean };
  engagement: Engagement;
}

const heatingPoints: Record<string, number> = {
  olie: 15,
  elvarme: 13,
  gas: 12,
  gammel_varmepumpe: 8,
  traepiller: 7,
  fjernvarme: 0,
};

const timelinePoints: Record<string, number> = {
  inden_3_mdr: 12,
  "3_6_mdr": 8,
  "6_12_mdr": 4,
  undersoeger: 1,
};

export function isValidDanishPhone(phone?: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/[\s\-().]/g, "").replace(/^(\+45|0045)/, "");
  return /^[2-9]\d{7}$/.test(digits);
}

export function isValidEmail(email?: string): boolean {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function isInServiceArea(postalCode: string | undefined, cfg: AppConfig): boolean {
  if (!postalCode) return false;
  const code = postalCode.trim();
  const area = cfg.serviceArea;
  if (area.exclude.includes(code)) return false;
  if (area.include.includes(code)) return true;
  const n = Number(code);
  return Number.isFinite(n) && area.ranges.some(([from, to]) => n >= from && n <= to);
}

/** The heat pump the value score is based on: the primary, or the first heat-pump alternative. */
export function valueOption(rec: Recommendation): SolutionOption | undefined {
  if (isHeatPump(rec.primary.type)) return rec.primary;
  return rec.alternatives.find((o) => isHeatPump(o.type));
}

export function tierFor(total: number): Tier {
  if (total >= 75) return "A";
  if (total >= 50) return "B";
  if (total >= 25) return "C";
  return "D";
}

/** Pure lead scoring for private homes and holiday homes. */
export function scoreLead(input: ScoringInput, cfg: AppConfig): LeadScore {
  const { answers: a, recommendation: rec, contact, engagement } = input;
  const flags: LeadFlag[] = [];

  // Fit (max 40)
  const fit: ScoreLine[] = [];
  if (a.heating === "fjernvarme") flags.push("fjernvarme");
  if (a.fjernvarmeAvailable === "ja" && a.heating !== "fjernvarme") flags.push("fjernvarme_tilgaengelig");
  const heatingPts = a.fjernvarmeAvailable === "ja" ? 0 : a.heating ? heatingPoints[a.heating] : 0;
  fit.push({ label: `Nuværende opvarmning: ${a.heating ?? "ukendt"}${a.fjernvarmeAvailable === "ja" ? " (fjernvarme mulig)" : ""}`, points: heatingPts });

  let emitterPts = 6;
  let emitterLabel = "Standardradiatorer";
  if (a.emitter === "elpaneler") {
    emitterPts = 3;
    emitterLabel = "Intet vandbåret system";
  } else if (a.emitter === "gulvvarme" || a.emitter === "mix" || a.radiatorSize === "store") {
    emitterPts = 10;
    emitterLabel = "Vandbåret med store radiatorer/gulvvarme";
  }
  fit.push({ label: emitterLabel, points: emitterPts });

  const reasonable = isInsulationReasonable(a, cfg);
  fit.push({ label: reasonable ? "Isolering rimelig eller bedre" : "Dårlig isolering", points: reasonable ? 8 : 3 });

  const inArea = isInServiceArea(a.address?.postalCode, cfg);
  if (!inArea) flags.push("outside_area");
  fit.push({ label: inArea ? "Inden for serviceområdet" : "Uden for serviceområdet", points: inArea ? 7 : 0 });

  // Value (max 25)
  const value: ScoreLine[] = [];
  const opt = valueOption(rec);
  let solutionPts = 0;
  if (opt?.type === "jordvarme") solutionPts = 25;
  else if (opt?.type === "luft_til_vand") solutionPts = 20;
  else if (opt?.type === "luft_til_luft") solutionPts = (opt.indoorUnits ?? 1) > 1 ? 10 : 6;
  value.push({ label: `Løsning: ${opt?.title ?? "ingen varmepumpe"}`, points: solutionPts });
  if (a.serviceInterest) value.push({ label: "Interesse for serviceabonnement", points: 3 });

  // Intent (max 25)
  const intent: ScoreLine[] = [];
  intent.push({ label: `Tidshorisont: ${a.timeline ?? "ikke oplyst"}`, points: a.timeline ? timelinePoints[a.timeline] : 0 });
  intent.push(
    contact.wantsInspection
      ? { label: "Har booket besigtigelse", points: 10 }
      : { label: "Har bedt om rapport", points: 4 },
  );
  if (engagement.cardsOpened >= 3 || engagement.secondsSpent > 180) {
    intent.push({ label: `Engageret (${engagement.cardsOpened} videnskort, ${Math.round(engagement.secondsSpent / 60)} min.)`, points: 3 });
  }

  // Data quality (max 10)
  const dataQuality: ScoreLine[] = [];
  if (isValidDanishPhone(contact.phone)) dataQuality.push({ label: "Gyldigt telefonnummer", points: 4 });
  if (isValidEmail(contact.email)) dataQuality.push({ label: "Gyldig e-mail", points: 3 });
  if (a.knowsConsumption && a.consumptionValue) dataQuality.push({ label: "Faktisk forbrug oplyst", points: 3 });

  const sum = (lines: ScoreLine[], max: number) => Math.min(max, lines.reduce((s, l) => s + l.points, 0));
  const fitTotal = sum(fit, 40);
  const valueTotal = sum(value, 25);
  const intentTotal = sum(intent, 25);
  const dqTotal = sum(dataQuality, 10);
  const total = fitTotal + valueTotal + intentTotal + dqTotal;

  const disqualified = a.heating === "fjernvarme";
  let tier: Tier = disqualified ? "D" : tierFor(total);
  if (!inArea && (tier === "A" || tier === "B")) tier = "C";

  return {
    total,
    fit: fitTotal,
    value: valueTotal,
    intent: intentTotal,
    dataQuality: dqTotal,
    tier,
    disqualified,
    flags,
    breakdown: { fit, value, intent, dataQuality },
    modelVersion: SCORING_MODEL_VERSION,
  };
}

export const tierDescriptions: Record<Tier, string> = {
  A: "Varm – ring inden for 24 timer",
  B: "Lun – ring inden for 3 dage + e-mail-opfølgning",
  C: "Pleje – nurture-forløb",
  D: "Kun oplysende opfølgning",
};

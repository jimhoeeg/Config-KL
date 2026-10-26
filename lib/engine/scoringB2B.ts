import type { AppConfig } from "@/lib/config/defaults";
import type { Answers } from "@/lib/schema/answers";
import { isInServiceArea, isValidDanishPhone, isValidEmail, tierFor, type LeadFlag, type ScoreLine, type Tier } from "./scoring";

export const B2B_SCORING_MODEL_VERSION = "b2b-1.0.0";

export interface B2BLeadScore {
  total: number;
  need: number;
  size: number;
  urgency: number;
  dataQuality: number;
  tier: Tier;
  flags: LeadFlag[];
  breakdown: { need: ScoreLine[]; size: ScoreLine[]; urgency: ScoreLine[]; dataQuality: ScoreLine[] };
  modelVersion: string;
}

const needPoints: Record<string, number> = { proceskoeling: 30, frys: 30, koeling: 25, varme: 20, service: 15 };
const sizePoints: Record<string, number> = { lille: 8, mellem: 14, stor: 20 };
const urgencyPoints: Record<string, number> = { akut: 30, inden_3_mdr: 20, senere: 8 };

/** Separate scoring for business leads (0–100). The highest-value need counts. */
export function scoreB2BLead(a: Answers, contact: { email?: string; phone?: string }, cfg: AppConfig): B2BLeadScore {
  const flags: LeadFlag[] = [];
  const needs = a.businessNeeds ?? [];
  const bestNeed = needs.reduce<string | undefined>((best, n) => (!best || needPoints[n] > needPoints[best] ? n : best), undefined);

  const need: ScoreLine[] = [{ label: `Behov: ${needs.join(", ") || "ikke oplyst"}`, points: bestNeed ? needPoints[bestNeed] : 0 }];
  const size: ScoreLine[] = [{ label: `Størrelse: ${a.businessSize ?? "ikke oplyst"}`, points: a.businessSize ? sizePoints[a.businessSize] : 0 }];
  const urgency: ScoreLine[] = [
    { label: `Hast: ${a.businessUrgency ?? "ikke oplyst"}`, points: a.businessUrgency ? urgencyPoints[a.businessUrgency] : 0 },
  ];
  const dataQuality: ScoreLine[] = [];
  if (isValidDanishPhone(contact.phone)) dataQuality.push({ label: "Gyldigt telefonnummer", points: 8 });
  if (isValidEmail(contact.email)) dataQuality.push({ label: "Gyldig e-mail", points: 6 });
  if (a.companyName?.trim() || a.cvr?.trim()) dataQuality.push({ label: "Firmanavn/CVR oplyst", points: 6 });

  const sum = (l: ScoreLine[]) => l.reduce((s, x) => s + x.points, 0);
  const total = Math.min(100, sum(need) + sum(size) + sum(urgency) + sum(dataQuality));

  const inArea = isInServiceArea(a.address?.postalCode, cfg);
  if (!inArea) flags.push("outside_area");
  let tier = tierFor(total);
  if (!inArea && (tier === "A" || tier === "B")) tier = "C";

  return {
    total,
    need: sum(need),
    size: sum(size),
    urgency: sum(urgency),
    dataQuality: sum(dataQuality),
    tier,
    flags,
    breakdown: { need, size, urgency, dataQuality },
    modelVersion: B2B_SCORING_MODEL_VERSION,
  };
}

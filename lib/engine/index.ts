import type { AppConfig } from "@/lib/config/defaults";
import type { Answers } from "@/lib/schema/answers";
import { computeEconomy, type Economy } from "./pricing";
import { recommend, type Recommendation } from "./recommend";

export interface Evaluation {
  recommendation: Recommendation;
  /** Economy for the primary (null when primary is not a heat pump). */
  primaryEconomy: Economy | null;
  /** Economy per alternative, same order as recommendation.alternatives. */
  alternativeEconomies: (Economy | null)[];
}

/** Runs the full engine. Pure: same input → same output. Safe to run in the browser. */
export function evaluate(a: Answers, cfg: AppConfig): Evaluation {
  const recommendation = recommend(a, cfg);
  return {
    recommendation,
    primaryEconomy: computeEconomy(recommendation.primary, a, recommendation.heat, cfg),
    alternativeEconomies: recommendation.alternatives.map((o) => computeEconomy(o, a, recommendation.heat, cfg)),
  };
}

/** The economy shown in the result step: primary, or first heat-pump alternative. */
export function headlineEconomy(ev: Evaluation): Economy | null {
  return ev.primaryEconomy ?? ev.alternativeEconomies.find((e) => e !== null) ?? null;
}

export * from "./heatDemand";
export * from "./recommend";
export * from "./pricing";
export * from "./scoring";
export * from "./scoringB2B";
export * from "./talkingPoints";

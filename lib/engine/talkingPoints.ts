import type { Answers } from "@/lib/schema/answers";
import type { Economy } from "./pricing";
import type { Recommendation } from "./recommend";
import type { LeadScore } from "./scoring";

/** Suggested talking points for KL Køleteknik's first call, generated from the answers. */
export function talkingPoints(a: Answers, rec: Recommendation, economy: Economy | null, score?: LeadScore): string[] {
  const p: string[] = [];
  if (rec.reason === "fjernvarme_installeret") p.push("Har fjernvarme – vær ærlig om, at varmepumpe sjældent kan betale sig. Tilbyd evt. luft-til-luft til køling.");
  if (rec.reason === "fjernvarme_tilgaengelig") p.push("Fjernvarme er mulig på adressen – spørg om de har fået et tilbud på tilslutning, og sammenlign ærligt.");
  if (rec.reason === "isoler_foerst") p.push("Stort varmetab – tal om loftisolering/tætning først, og om en mindre varmepumpe bagefter.");

  if (a.heating === "olie") p.push("Oliefyr: nævn fjernelse/afblænding af olietank og at besparelsen typisk er størst her.");
  if (a.heating === "gas") p.push("Naturgas: nævn afmelding af gasmåler og stigende gasafgifter.");
  if (a.heating === "elvarme") p.push("Elvarme: hurtig tilbagebetaling – undersøg om de kun vil have luft-til-luft eller overvejer vandbårent system.");
  if (a.heating === "gammel_varmepumpe") p.push("Har en ældre varmepumpe – spørg til alder, mærke og fejl. Mulighed for service i stedet for udskiftning?");

  if (economy && economy.subsidy > 0) p.push(`Varmepumpepuljen (${economy.subsidy.toLocaleString("da-DK")} kr.): mind kunden om at søge FØR der underskrives en bindende aftale.`);
  if (a.radiatorSize === "smaa" || a.warmAtLowTemp === "nej") p.push("Små radiatorer/høj fremløbstemperatur – vurder udskiftning af enkelte radiatorer for bedre SCOP.");
  if (a.neighbourDistance === "under_3" || a.noiseSensitive) p.push("Støj er et hensyn – medbring datablad med lydniveau og forslag til placering/afskærmning.");
  if (a.knowsConsumption) p.push(`Har oplyst faktisk forbrug (${a.consumptionValue} ${a.consumptionUnit}) – god basis for dimensionering.`);
  else p.push("Forbrug er estimeret – bed om årsopgørelse inden besigtigelse.");
  if (a.serviceInterest) p.push("Interesseret i serviceabonnement (Tryghed i 5 år) – tilbyd det sammen med tilbuddet.");
  if (a.bbrPrefilled === false && a.yearBuilt) p.push("Data er indtastet manuelt – bekræft byggeår og areal.");
  if (score?.flags.includes("outside_area")) p.push("Adressen ligger uden for serviceområdet – afklar om opgaven skal tages eller henvises.");
  if (a.timeline === "inden_3_mdr") p.push("Ønsker at komme i gang inden for 3 måneder – tilbyd hurtig besigtigelse.");
  return p;
}

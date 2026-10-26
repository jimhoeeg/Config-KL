import type { Answers } from "@/lib/schema/answers";

export type StepId =
  | "start"
  | "huset"
  | "opvarmning"
  | "klimaskaerm"
  | "varmeafgivelse"
  | "grund"
  | "anbefaling"
  | "oekonomi"
  | "virksomhed"
  | "behov"
  | "kontakt";

export interface StepMeta {
  id: StepId;
  title: string;
  /** Knowledge-card step number (matches knowledge_cards.step). */
  cardStep?: number;
}

export const homeFlow: StepMeta[] = [
  { id: "start", title: "Start", cardStep: 0 },
  { id: "huset", title: "Huset", cardStep: 1 },
  { id: "opvarmning", title: "Opvarmning", cardStep: 2 },
  { id: "klimaskaerm", title: "Klimaskærm", cardStep: 3 },
  { id: "varmeafgivelse", title: "Radiatorer og vand", cardStep: 4 },
  { id: "grund", title: "Grund og placering", cardStep: 5 },
  { id: "anbefaling", title: "Anbefaling", cardStep: 6 },
  { id: "oekonomi", title: "Økonomi og rapport", cardStep: 7 },
];

export const businessFlow: StepMeta[] = [
  { id: "start", title: "Start", cardStep: 0 },
  { id: "virksomhed", title: "Virksomheden" },
  { id: "behov", title: "Behov" },
  { id: "kontakt", title: "Kontakt" },
];

export function flowFor(a: Answers): StepMeta[] {
  return a.segment === "erhverv" ? businessFlow : homeFlow;
}

const waterBased = (a: Answers) => a.emitter === "radiatorer" || a.emitter === "gulvvarme" || a.emitter === "mix";

/** Is every required question on this step answered? */
export function isStepComplete(id: StepId, a: Answers): boolean {
  switch (id) {
    case "start":
      return !!a.segment;
    case "huset":
      return !!(a.address?.text && /^\d{4}$/.test(a.address.postalCode ?? "") && a.areaM2 && a.yearBuilt && a.houseType && a.floors);
    case "opvarmning":
      return !!(
        a.heating &&
        (a.heating === "fjernvarme" || a.fjernvarmeAvailable) &&
        a.knowsConsumption !== undefined &&
        (!a.knowsConsumption || (a.consumptionValue && a.consumptionUnit))
      );
    case "klimaskaerm":
      return !!(a.windows && a.roof && a.walls && a.draughts);
    case "varmeafgivelse":
      return !!(
        a.emitter &&
        (a.emitter === "gulvvarme" || a.emitter === "elpaneler" || a.radiatorSize) &&
        (!waterBased(a) || a.warmAtLowTemp) &&
        a.householdSize &&
        a.hotWater
      );
    case "grund":
      return !!(a.garden && a.outdoorPlacement && a.neighbourDistance && a.noiseSensitive !== undefined);
    case "virksomhed":
      return !!(a.businessType && a.address?.text && /^\d{4}$/.test(a.address.postalCode ?? ""));
    case "behov":
      return !!(a.businessNeeds?.length && a.businessSize && a.businessUrgency);
    default:
      return true;
  }
}

/** Default consumption unit for the chosen heating type. */
export function defaultUnitFor(heating: Answers["heating"]): Answers["consumptionUnit"] {
  switch (heating) {
    case "olie":
      return "liter_olie";
    case "gas":
      return "m3_gas";
    case "traepiller":
      return "kg_traepiller";
    default:
      return "kwh";
  }
}

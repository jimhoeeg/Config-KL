import type { Answers } from "@/lib/schema/answers";
import { label } from "./labels";

export interface ProfileRow {
  group: string;
  label: string;
  value: string;
}

/** Human-readable house profile, used by the sidebar, emails, report and admin. */
export function profileRows(a: Answers): ProfileRow[] {
  const rows: ProfileRow[] = [];
  const add = (group: string, l: string, v: string | number | undefined | null) => {
    if (v !== undefined && v !== null && v !== "" && v !== "–") rows.push({ group, label: l, value: String(v) });
  };

  if (a.segment === "erhverv") {
    add("Virksomhed", "Firma", a.companyName);
    add("Virksomhed", "CVR", a.cvr);
    add("Virksomhed", "Adresse", a.address?.text);
    add("Virksomhed", "Type", a.businessType && label("businessType", a.businessType));
    add("Behov", "Behov", a.businessNeeds?.map((n) => label("businessNeeds", n)).join(", "));
    add("Behov", "Størrelse", a.businessSize && label("businessSize", a.businessSize));
    add("Behov", "Hast", a.businessUrgency && label("businessUrgency", a.businessUrgency));
    add("Anlæg", "Eksisterende anlæg", a.businessExisting);
    add("Anlæg", "Kølemiddel", a.businessRefrigerant);
    return rows;
  }

  add("Huset", "Adresse", a.address?.text);
  add("Huset", "Type", a.houseType && label("houseType", a.houseType));
  add("Huset", "Opvarmet areal", a.areaM2 && `${a.areaM2} m²`);
  add("Huset", "Byggeår", a.yearBuilt);
  add("Huset", "Etager", a.floors);
  add("Opvarmning", "Nuværende", a.heating && label("heating", a.heating));
  add("Opvarmning", "Fjernvarme mulig", a.fjernvarmeAvailable && label("yesNoUnknown", a.fjernvarmeAvailable));
  if (a.knowsConsumption && a.consumptionValue && a.consumptionUnit) {
    add("Opvarmning", "Årligt forbrug", `${a.consumptionValue.toLocaleString("da-DK")} ${label("consumptionUnit", a.consumptionUnit)}`);
  }
  add("Klimaskærm", "Vinduer", a.windows && label("windows", a.windows));
  add("Klimaskærm", "Loft", a.roof && label("roof", a.roof));
  add("Klimaskærm", "Vægge", a.walls && label("walls", a.walls));
  add("Klimaskærm", "Træk", a.draughts && label("draughts", a.draughts));
  add("Varmeafgivelse", "System", a.emitter && label("emitter", a.emitter));
  add("Varmeafgivelse", "Radiatorer", a.radiatorSize && label("radiatorSize", a.radiatorSize));
  add("Varmeafgivelse", "Varmt ved lav temp.", a.warmAtLowTemp && label("yesNoUnknown", a.warmAtLowTemp));
  add("Varmeafgivelse", "Personer", a.householdSize);
  add("Varmeafgivelse", "Varmt vand", a.hotWater && label("hotWater", a.hotWater));
  add("Grund", "Grund", a.garden && label("garden", a.garden));
  add("Grund", "Plads til udedel", a.outdoorPlacement && label("outdoorPlacement", a.outdoorPlacement));
  add("Grund", "Afstand til nabo", a.neighbourDistance && label("neighbourDistance", a.neighbourDistance));
  if (a.noiseSensitive !== undefined) add("Grund", "Støjfølsom", a.noiseSensitive ? "Ja" : "Nej");
  return rows;
}

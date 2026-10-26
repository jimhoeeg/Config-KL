import { defaultConfig } from "@/lib/config/defaults";
import type { Answers } from "@/lib/schema/answers";

export const cfg = structuredClone(defaultConfig);

/** A typical 1970s parcelhus on oil with radiators near Roskilde. */
export const oilHouse: Answers = {
  segment: "privat",
  address: { text: "Testvej 1, 4000 Roskilde", postalCode: "4000" },
  areaM2: 140,
  yearBuilt: 1972,
  houseType: "parcelhus",
  floors: 1,
  heating: "olie",
  fjernvarmeAvailable: "nej",
  windows: "dobbelt",
  roof: "lidt",
  walls: "delvist",
  draughts: "lidt",
  emitter: "radiatorer",
  radiatorSize: "standard",
  warmAtLowTemp: "ved_ikke",
  householdSize: 4,
  hotWater: "brusere",
  garden: "mellem",
  outdoorPlacement: "let",
  neighbourDistance: "3_til_10",
  noiseSensitive: false,
  timeline: "inden_3_mdr",
};

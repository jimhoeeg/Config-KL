import type { AppConfig } from "@/lib/config/defaults";
import type { Answers } from "@/lib/schema/answers";
import { computeHeatDemand, type FlowTemp, type HeatDemandResult } from "./heatDemand";

export type HeatPumpType = "luft_til_luft" | "luft_til_vand" | "jordvarme";
export type SolutionType = HeatPumpType | "ikke_egnet" | "ikke_endnu";

export interface SolutionOption {
  type: SolutionType;
  title: string;
  summary: string;
  /** "Hvorfor" – built from the user's answers. */
  why: string[];
  caveats: string[];
  sizeKw?: number;
  /** Air-to-air only. */
  indoorUnits?: number;
}

export interface Recommendation {
  primary: SolutionOption;
  alternatives: SolutionOption[];
  heat: HeatDemandResult;
  /** Placement / noise / practical warnings. */
  warnings: string[];
  reason?: "fjernvarme_installeret" | "fjernvarme_tilgaengelig" | "isoler_foerst";
}

export const solutionTitles: Record<SolutionType, string> = {
  luft_til_luft: "Luft-til-luft varmepumpe",
  luft_til_vand: "Luft-til-vand varmepumpe",
  jordvarme: "Jordvarme",
  ikke_egnet: "En varmepumpe er nok ikke det bedste valg",
  ikke_endnu: "Ikke endnu – isolér først",
};

export const flowTempLabels: Record<FlowTemp, string> = {
  lav: "lav (ca. 35 °C)",
  lav_mellem: "lav til middel (ca. 45 °C)",
  mellem: "middel (ca. 50 °C)",
  hoej: "høj (ca. 55 °C)",
};

const heatingLabels: Record<string, string> = {
  olie: "oliefyr",
  gas: "naturgas",
  elvarme: "elvarme",
  traepiller: "træpillefyr",
  fjernvarme: "fjernvarme",
  gammel_varmepumpe: "en ældre varmepumpe",
};

export function isHeatPump(t: SolutionType): t is HeatPumpType {
  return t === "luft_til_luft" || t === "luft_til_vand" || t === "jordvarme";
}

export function airToAirUnits(a: Answers, cfg: AppConfig): number {
  const area = a.areaM2 ?? 100;
  const byArea = Math.ceil(area / cfg.heatDemand.airToAirM2PerUnit);
  const byFloors = a.floors ?? 1;
  return Math.min(cfg.heatDemand.airToAirMaxUnits, Math.max(1, byArea, byFloors));
}

export function recommend(a: Answers, cfg: AppConfig): Recommendation {
  const heat = computeHeatDemand(a, cfg);
  const warnings = placementWarnings(a);
  const waterBased = a.emitter === "radiatorer" || a.emitter === "gulvvarme" || a.emitter === "mix";
  const isSommerhus = a.segment === "sommerhus" || a.houseType === "sommerhus";
  const heatingLabel = a.heating ? heatingLabels[a.heating] : undefined;

  const l2l = airToAir(a, cfg, heat, isSommerhus);
  const l2v = airToWater(a, heat, heatingLabel);
  const ground = groundSource(a, heat);
  const l2lSupplement: SolutionOption = {
    ...l2l,
    title: "Luft-til-luft som supplement",
    summary: "En billig måde at flytte en del af varmeforbruget over på en varmepumpe – dit nuværende anlæg klarer resten og det varme vand.",
    why: [
      "Den laveste investering, hvis du ikke er klar til at skifte hele varmeanlægget.",
      "Overtager typisk varmen i stue og køkken og kan også køle om sommeren.",
      "Giver ikke tilskud fra Varmepumpepuljen og laver ikke varmt brugsvand.",
    ],
  };

  // Pick the heat pump that fits the house best.
  let best: SolutionOption;
  const alternatives: SolutionOption[] = [];
  if (isSommerhus) {
    best = l2l;
    if (waterBased) alternatives.push(l2v);
  } else if (!waterBased) {
    best = l2l;
    if (a.emitter === "elpaneler") {
      alternatives.push({
        ...l2v,
        why: [
          "Giver både rumvarme og varmt vand, og du kan søge Varmepumpepuljen.",
          "Kræver at der etableres et vandbåret system (radiatorer eller gulvvarme) – det er en større investering.",
        ],
      });
    }
  } else if (a.garden === "stor" && heat.annualKwh >= cfg.heatDemand.groundSourceMinKwh) {
    best = ground;
    alternatives.push(l2v);
  } else {
    best = l2v;
    if (a.garden === "stor" || a.garden === "mellem") alternatives.push(ground);
    alternatives.push(l2lSupplement);
  }

  // Honesty rule 1: district heating installed → a heat pump is rarely the right call.
  if (a.heating === "fjernvarme") {
    return {
      heat,
      warnings: [],
      reason: "fjernvarme_installeret",
      primary: {
        type: "ikke_egnet",
        title: solutionTitles.ikke_egnet,
        summary: "Du har allerede fjernvarme. Det er typisk både billigere og grønnere end en varmepumpe, og et skifte tjener sig sjældent hjem.",
        why: [
          "Fjernvarme har lave driftsomkostninger og kræver næsten ingen vedligeholdelse.",
          "Du skal ofte betale en udtrædelsesafgift og fortsat bidrage til nettet, hvis du melder dig ud.",
          "Et skifte til varmepumpe kræver en ny investering på typisk 100.000 kr. eller mere.",
        ],
        caveats: ["Vil du have køling om sommeren, kan en lille luft-til-luft-varmepumpe stadig give mening – men ikke for at spare på varmen."],
      },
      // Transparency: still show what the best heat pump would cost, so the customer can judge for themselves.
      alternatives: [best, ...alternatives].slice(0, 2).map(withoutSubsidyPromise),
    };
  }

  // Honesty rule 2: district heating available on the street → explain before selling a heat pump.
  if (a.fjernvarmeAvailable === "ja") {
    return {
      heat,
      warnings,
      reason: "fjernvarme_tilgaengelig",
      primary: {
        type: "ikke_egnet",
        title: "Undersøg fjernvarme først",
        summary: "Du oplyser, at der er fjernvarme i dit område. Tjek prisen på tilslutning hos dit lokale fjernvarmeværk – det er ofte det billigste valg på lang sigt.",
        why: [
          "Fjernvarme har typisk lavere samlede omkostninger end en varmepumpe over 15–20 år.",
          "Nogle værker tilbyder gratis eller billig tilslutning i udbygningsområder.",
          "Vil du hellere være uafhængig af fjernvarmen, er varmepumpen nedenfor det bedste alternativ for dit hus.",
        ],
        caveats: [],
      },
      alternatives: [best, ...alternatives].slice(0, 2),
    };
  }

  // Honesty rule 3: very poorly insulated old house → fix the envelope first.
  const hd = cfg.heatDemand;
  if (
    heat.insulationModifier >= hd.insulateFirstModifier &&
    (a.yearBuilt ?? 9999) < hd.insulateFirstBeforeYear &&
    best.type !== "luft_til_luft"
  ) {
    return {
      heat,
      warnings,
      reason: "isoler_foerst",
      primary: {
        type: "ikke_endnu",
        title: solutionTitles.ikke_endnu,
        summary: "Dit hus taber meget varme. Hvis du isolerer først, kan du vælge en mindre og billigere varmepumpe, som samtidig kører mere effektivt.",
        why: [
          `Huset er fra før ${hd.insulateFirstBeforeYear}, og dine svar om vinduer, loft og vægge peger på et stort varmetab.`,
          "Et stort varmetab kræver høj fremløbstemperatur, og så falder varmepumpens effektivitet (SCOP).",
          "Loftisolering, tætningslister og nye vinduer er ofte de billigste kWh, du kan spare.",
        ],
        caveats: ["Vi kan gerne vurdere både isolering og varmepumpe ved samme besigtigelse."],
      },
      alternatives: [best, ...alternatives].slice(0, 2),
    };
  }

  return { heat, warnings, primary: best, alternatives: alternatives.slice(0, 2) };
}

function airToAir(a: Answers, cfg: AppConfig, heat: HeatDemandResult, isSommerhus: boolean): SolutionOption {
  const units = airToAirUnits(a, cfg);
  const why: string[] = [];
  if (isSommerhus) why.push("Til sommerhuse er luft-til-luft den mest udbredte løsning: billig i drift og kan holde huset frostfrit, når I ikke er der.");
  if (a.emitter === "elpaneler") why.push("Du har elpaneler i dag. En luft-til-luft-varmepumpe giver ca. 3–5 gange så meget varme pr. kWh – det er den hurtigste vej til en lavere elregning.");
  if (a.emitter !== "elpaneler" && !isSommerhus) why.push("Dit hus har ikke et vandbåret varmesystem, så luft-til-luft er den enkle og billige løsning.");
  if (units > 1) why.push(`Med ${a.areaM2 ?? "dit"} m² ${a.floors && a.floors > 1 ? `fordelt på ${a.floors} etager ` : ""}skal der sandsynligvis ${units} indedele til, for at varmen fordeles godt.`);
  why.push("Kan også køle om sommeren.");
  return {
    type: "luft_til_luft",
    title: units > 1 ? `Luft-til-luft (multisplit, ${units} indedele)` : solutionTitles.luft_til_luft,
    summary: "Varmer luften direkte i rummet. Billig at installere, men den kan ikke lave varmt brugsvand.",
    why,
    caveats: ["Kan ikke opvarme brugsvand – det klares fortsat af din nuværende vandvarmer.", "Varmen fordeles bedst i åbne rum; lukkede værelser bliver ofte køligere."],
    sizeKw: heat.sizeKw,
    indoorUnits: units,
  };
}

function airToWater(a: Answers, heat: HeatDemandResult, heatingLabel?: string): SolutionOption {
  const why: string[] = [];
  if (heatingLabel && (a.heating === "olie" || a.heating === "gas" || a.heating === "traepiller")) {
    why.push(`Du har ${heatingLabel} og et vandbåret system i dag – en luft-til-vand-varmepumpe kan kobles direkte på dine eksisterende ${a.emitter === "gulvvarme" ? "gulvvarmeslanger" : "radiatorer"}.`);
  } else if (a.heating === "gammel_varmepumpe") {
    why.push("En ny varmepumpe er markant mere effektiv end modeller fra for 10–15 år siden.");
  } else {
    why.push("Luft-til-vand giver både rumvarme og varmt brugsvand og passer til dit vandbårne system.");
  }
  if (heat.flowTemp === "lav" || heat.flowTemp === "lav_mellem") {
    why.push(`Dit hus ser ud til at kunne nøjes med en ${flowTempLabels[heat.flowTemp]} fremløbstemperatur – det er ideelt for en luft-til-vand-varmepumpe.`);
  } else {
    why.push(`Dit hus kræver formentlig en ${flowTempLabels[heat.flowTemp]} fremløbstemperatur. Det virker fint, men større radiatorer eller lidt ekstra isolering vil hæve effektiviteten.`);
  }
  why.push("Du kan søge Varmepumpepuljen – husk at søge, før du skriver under.");
  return {
    type: "luft_til_vand",
    title: solutionTitles.luft_til_vand,
    summary: "Henter varme fra udeluften og sender den ud i dine radiatorer eller gulvvarme – og laver varmt brugsvand.",
    why,
    caveats: ["Udedelen skal placeres med omtanke for støj og naboer."],
    sizeKw: heat.sizeKw,
  };
}

function groundSource(a: Answers, heat: HeatDemandResult): SolutionOption {
  const why = [
    "Jorden har en stabil temperatur året rundt, så jordvarme har den højeste effektivitet – også på de koldeste dage.",
    "Ingen udedel, så der er ingen støj ved naboskel.",
  ];
  if (a.garden === "stor") why.unshift("Du har en stor grund, så der er plads til jordslanger.");
  if (heat.annualKwh >= 20000) why.push("Dit varmebehov er højt, så den ekstra effektivitet betyder mere over anlæggets levetid.");
  return {
    type: "jordvarme",
    title: solutionTitles.jordvarme,
    summary: "Henter varme fra jorden via nedgravede slanger. Højere anskaffelsespris, men lavest driftsudgift og lang levetid.",
    why,
    caveats: ["Kræver gravearbejde på grunden – typisk 1,5–2 gange husets opvarmede areal til vandrette jordslanger.", "Prisen er et skøn og skal bekræftes ved besigtigelse."],
    sizeKw: heat.sizeKw,
  };
}

/** For a house on district heating we cannot promise the subsidy – replace that line with a caveat. */
function withoutSubsidyPromise(o: SolutionOption): SolutionOption {
  return {
    ...o,
    why: o.why.filter((w) => !w.includes("Varmepumpepuljen")),
    caveats: [...o.caveats, "Det er ikke sikkert, at du kan få tilskud fra Varmepumpepuljen, når du skifter fra fjernvarme – tjek de gældende regler."],
  };
}

function placementWarnings(a: Answers): string[] {
  const w: string[] = [];
  if (a.neighbourDistance === "under_3") w.push("Der er under 3 meter til naboskel. Udedelen skal placeres og eventuelt afskærmes, så støjkravene overholdes.");
  if (a.noiseSensitive) w.push("Du har oplyst, at støj er et vigtigt hensyn. Vi anbefaler et lavstøjsmodel og en placering væk fra soveværelser.");
  if (a.outdoorPlacement === "svaert") w.push("Det kan være svært at finde en placering til udedelen – det vurderer vi ved besigtigelsen.");
  return w;
}

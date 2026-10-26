/** Danish display labels for every answer option. Shared by UI, emails, report and admin. */

export const labels = {
  segment: { privat: "Privat bolig", sommerhus: "Sommerhus", erhverv: "Erhverv" },
  houseType: { parcelhus: "Parcelhus", raekkehus: "Rækkehus", landhus: "Landhus", sommerhus: "Sommerhus" },
  heating: {
    olie: "Oliefyr",
    gas: "Naturgas",
    elvarme: "Elvarme (paneler)",
    traepiller: "Træpillefyr",
    fjernvarme: "Fjernvarme",
    gammel_varmepumpe: "Ældre varmepumpe",
  },
  yesNoUnknown: { ja: "Ja", nej: "Nej", ved_ikke: "Ved ikke" },
  consumptionUnit: { liter_olie: "liter olie", m3_gas: "m³ gas", kwh: "kWh", kg_traepiller: "kg træpiller" },
  windows: { enkelt: "Et lag glas", dobbelt: "To lag (termo)", tre_lag: "Tre lag" },
  roof: { ingen: "Ingen/meget lidt", lidt: "Lidt (under 15 cm)", god: "God (over 20 cm)", ved_ikke: "Ved ikke" },
  walls: { uisoleret: "Uisolerede", delvist: "Delvist isolerede", isoleret: "Godt isolerede", ved_ikke: "Ved ikke" },
  draughts: { meget: "Ja, en del", lidt: "Lidt", nej: "Nej" },
  emitter: { radiatorer: "Radiatorer", gulvvarme: "Gulvvarme", mix: "Både radiatorer og gulvvarme", elpaneler: "Elpaneler (intet vandbåret)" },
  radiatorSize: { store: "Store/dobbelte", standard: "Almindelige", smaa: "Små eller få", ved_ikke: "Ved ikke" },
  hotWater: { brusere: "Mest brusebad", mix: "Lidt af hvert", karbad: "Ofte karbad" },
  garden: { lille: "Lille (under 300 m²)", mellem: "Mellem (300–600 m²)", stor: "Stor (over 600 m²)" },
  outdoorPlacement: { let: "Ja, der er god plads", muligt: "Sikkert, men lidt trangt", svaert: "Det bliver svært" },
  neighbourDistance: { under_3: "Under 3 m", "3_til_10": "3–10 m", over_10: "Over 10 m" },
  timeline: { inden_3_mdr: "Inden for 3 måneder", "3_6_mdr": "Om 3–6 måneder", "6_12_mdr": "Om 6–12 måneder", undersoeger: "Jeg undersøger bare" },
  contactPreference: { telefon: "Telefon", email: "E-mail", sms: "SMS" },
  businessType: { butik: "Butik", produktion: "Produktion", lager: "Lager", kontor: "Kontor", foedevarer: "Fødevarer", andet: "Andet" },
  businessNeeds: { varme: "Opvarmning", koeling: "Køling", frys: "Frys", proceskoeling: "Proceskøling", service: "Service af eksisterende anlæg" },
  businessSize: { lille: "Lille (under 300 m²)", mellem: "Mellem (300–2.000 m²)", stor: "Stor (over 2.000 m²)" },
  businessUrgency: { akut: "Akut", inden_3_mdr: "Inden for 3 måneder", senere: "Senere" },
  leadStatus: { new: "Ny", contacted: "Kontaktet", inspection_booked: "Besigtigelse booket", won: "Vundet", lost: "Tabt" },
} as const;

export function label<G extends keyof typeof labels>(group: G, value: string | undefined | null): string {
  if (!value) return "–";
  return (labels[group] as Record<string, string>)[value] ?? value;
}

export const eraLabels = {
  pre1960: "før 1960",
  from1960to1979: "1960–1979",
  from1980to2005: "1980–2005",
  from2006: "efter 2006",
} as const;

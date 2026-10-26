import { z } from "zod";

/**
 * Answer schema shared by the wizard UI, the engine and the server actions.
 * Every field is optional while the user is filling in the flow; the engine
 * falls back to sensible defaults for anything missing.
 */

export const segments = ["privat", "sommerhus", "erhverv"] as const;
export const houseTypes = ["parcelhus", "raekkehus", "landhus", "sommerhus"] as const;
export const heatingTypes = ["olie", "gas", "elvarme", "traepiller", "fjernvarme", "gammel_varmepumpe"] as const;
export const yesNoUnknown = ["ja", "nej", "ved_ikke"] as const;
export const consumptionUnits = ["liter_olie", "m3_gas", "kwh", "kg_traepiller"] as const;
export const windowTypes = ["enkelt", "dobbelt", "tre_lag"] as const;
export const roofInsulation = ["ingen", "lidt", "god", "ved_ikke"] as const;
export const wallInsulation = ["uisoleret", "delvist", "isoleret", "ved_ikke"] as const;
export const draughtLevels = ["meget", "lidt", "nej"] as const;
export const emitterTypes = ["radiatorer", "gulvvarme", "mix", "elpaneler"] as const;
export const radiatorSizes = ["store", "standard", "smaa", "ved_ikke"] as const;
export const hotWaterProfiles = ["brusere", "mix", "karbad"] as const;
export const gardenSizes = ["lille", "mellem", "stor"] as const;
export const placementOptions = ["let", "muligt", "svaert"] as const;
export const neighbourDistances = ["under_3", "3_til_10", "over_10"] as const;
export const timelines = ["inden_3_mdr", "3_6_mdr", "6_12_mdr", "undersoeger"] as const;
export const contactPreferences = ["telefon", "email", "sms"] as const;

// Erhverv (B2B)
export const businessTypes = ["butik", "produktion", "lager", "kontor", "foedevarer", "andet"] as const;
export const businessNeeds = ["varme", "koeling", "frys", "proceskoeling", "service"] as const;
export const businessSizes = ["lille", "mellem", "stor"] as const;
export const businessUrgency = ["akut", "inden_3_mdr", "senere"] as const;

export const addressSchema = z.object({
  text: z.string(),
  id: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
});

export const answersSchema = z.object({
  segment: z.enum(segments).optional(),

  // Step 1 – Huset
  address: addressSchema.optional(),
  areaM2: z.number().min(10).max(2000).optional(),
  yearBuilt: z.number().int().min(1700).max(2100).optional(),
  houseType: z.enum(houseTypes).optional(),
  floors: z.number().int().min(1).max(5).optional(),
  bbrPrefilled: z.boolean().optional(),

  // Step 2 – Opvarmning
  heating: z.enum(heatingTypes).optional(),
  fjernvarmeAvailable: z.enum(yesNoUnknown).optional(),
  knowsConsumption: z.boolean().optional(),
  consumptionValue: z.number().min(0).max(1_000_000).optional(),
  consumptionUnit: z.enum(consumptionUnits).optional(),

  // Step 3 – Klimaskærm
  windows: z.enum(windowTypes).optional(),
  roof: z.enum(roofInsulation).optional(),
  walls: z.enum(wallInsulation).optional(),
  draughts: z.enum(draughtLevels).optional(),

  // Step 4 – Varmeafgivelse og varmt vand
  emitter: z.enum(emitterTypes).optional(),
  radiatorSize: z.enum(radiatorSizes).optional(),
  warmAtLowTemp: z.enum(yesNoUnknown).optional(),
  householdSize: z.number().int().min(1).max(15).optional(),
  hotWater: z.enum(hotWaterProfiles).optional(),

  // Step 5 – Grund og placering
  garden: z.enum(gardenSizes).optional(),
  outdoorPlacement: z.enum(placementOptions).optional(),
  neighbourDistance: z.enum(neighbourDistances).optional(),
  noiseSensitive: z.boolean().optional(),

  // Step 7 – Intent
  timeline: z.enum(timelines).optional(),
  serviceInterest: z.boolean().optional(),

  // Erhverv
  businessType: z.enum(businessTypes).optional(),
  businessNeeds: z.array(z.enum(businessNeeds)).optional(),
  businessSize: z.enum(businessSizes).optional(),
  businessUrgency: z.enum(businessUrgency).optional(),
  businessExisting: z.string().max(500).optional(),
  businessRefrigerant: z.string().max(100).optional(),
  companyName: z.string().max(200).optional(),
  cvr: z.string().max(20).optional(),
});

export type Answers = z.infer<typeof answersSchema>;
export type Segment = (typeof segments)[number];
export type Heating = (typeof heatingTypes)[number];
export type Emitter = (typeof emitterTypes)[number];

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Skriv dit navn").max(200),
  email: z.string().trim().email("Ugyldig e-mail").max(200),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  contactConsent: z.literal(true, { message: "Du skal give samtykke til, at vi må kontakte dig" }),
  marketingConsent: z.boolean(),
  wantsInspection: z.boolean(),
  preferredDate: z.string().max(40).optional().or(z.literal("")),
  contactPreference: z.enum(contactPreferences).optional(),
  message: z.string().max(2000).optional().or(z.literal("")),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** Engagement signals collected by the client (used for scoring). */
export const engagementSchema = z.object({
  cardsOpened: z.number().int().min(0).max(1000),
  secondsSpent: z.number().min(0).max(86400),
});
export type Engagement = z.infer<typeof engagementSchema>;

"use server";

import { z } from "zod";
import { getConfig } from "@/lib/data/content";
import { businessConfirmationEmail, customerReportEmail, internalLeadEmail } from "@/lib/email/templates";
import { internalRecipients, sendEmail } from "@/lib/email/send";
import { evaluate, headlineEconomy, scoreB2BLead, scoreLead, talkingPoints, type Evaluation } from "@/lib/engine";
import { CONSENT_TEXT_VERSION } from "@/lib/format";
import { answersSchema, contactSchema, engagementSchema, type Answers } from "@/lib/schema/answers";
import { getSupabase } from "@/lib/supabase/server";

const submitSchema = z.object({
  sessionId: z.string().uuid().optional(),
  answers: answersSchema,
  contact: contactSchema,
  engagement: engagementSchema,
  /** Honeypot – real users never fill this in. */
  website: z.string().optional(),
});

export type SubmitResult =
  | { ok: true; reportToken: string | null; emailSent: boolean }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Creates a lead: recomputes the recommendation and score on the server (the
 * client is never trusted for these), stores everything, and sends the customer
 * report + the internal notification.
 */
export async function submitLead(input: unknown): Promise<SubmitResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.slice(-1).join(".")] = issue.message;
    return { ok: false, error: "Tjek venligst de markerede felter.", fieldErrors };
  }
  const { sessionId, answers: a, contact, engagement, website } = parsed.data;
  if (website) return { ok: true, reportToken: null, emailSent: false };
  const cfg = await getConfig();
  const isB2B = a.segment === "erhverv";

  const evaluation: Evaluation | null = isB2B ? null : evaluate(a, cfg);
  const score = isB2B
    ? scoreB2BLead(a, contact, cfg)
    : scoreLead({ answers: a, recommendation: evaluation!.recommendation, contact, engagement }, cfg);
  const economy = evaluation ? headlineEconomy(evaluation) : null;
  const points = evaluation
    ? talkingPoints(a, evaluation.recommendation, economy, "fit" in score ? score : undefined)
    : b2bTalkingPoints(a);

  const db = getSupabase();
  let leadId: string | null = null;
  let reportToken: string | null = null;

  if (db) {
    const { data: lead, error } = await db
      .from("leads")
      .insert({
        session_id: sessionId ?? null,
        name: contact.name,
        email: contact.email,
        phone: contact.phone || null,
        segment: a.segment ?? "privat",
        contact_consent: contact.contactConsent,
        marketing_consent: contact.marketingConsent,
        consent_text_version: CONSENT_TEXT_VERSION,
        contact_preference: contact.contactPreference ?? null,
        preferred_date: contact.preferredDate || null,
        timeline: isB2B ? (a.businessUrgency ?? null) : (a.timeline ?? null),
        wants_inspection: contact.wantsInspection,
        wants_service: !!a.serviceInterest,
        message: contact.message || null,
        flags: score.flags,
      })
      .select("id, report_token")
      .single();
    if (error || !lead) {
      console.error("[lead] insert failed:", error?.message);
      return { ok: false, error: "Vi kunne desværre ikke gemme dine oplysninger. Prøv igen om lidt, eller ring til os." };
    }
    leadId = lead.id;
    reportToken = lead.report_token;

    const rec = evaluation?.recommendation;
    const results = await Promise.all([
      db.from("lead_profiles").insert(profileColumns(lead.id, a)),
      db.from("lead_scores").insert({
        lead_id: lead.id,
        total: score.total,
        fit: "fit" in score ? score.fit : score.need,
        value: "value" in score ? score.value : score.size,
        intent: "intent" in score ? score.intent : score.urgency,
        data_quality: score.dataQuality,
        tier: score.tier,
        disqualified: "disqualified" in score ? score.disqualified : false,
        breakdown: score.breakdown,
        model_version: score.modelVersion,
      }),
      rec
        ? db.from("recommendations").insert({
            lead_id: lead.id,
            primary_solution: rec.primary,
            alternatives: rec.alternatives,
            reason: rec.reason ?? null,
            heat_demand_kwh: rec.heat.annualKwh,
            heat_demand_source: rec.heat.source,
            size_kw: rec.heat.sizeKw,
            flow_temp: rec.heat.flowTemp,
            price_low: economy?.price.low ?? null,
            price_high: economy?.price.high ?? null,
            subsidy: economy?.subsidy ?? null,
            possible_deduction: economy?.possibleDeductionValue ?? null,
            net_low: economy?.netPrice.low ?? null,
            net_high: economy?.netPrice.high ?? null,
            running_cost: economy?.newRunningCost ?? null,
            current_cost: economy?.currentCost ?? null,
            saving_per_year: economy?.annualSaving ?? null,
            payback_low: economy?.payback?.low ?? null,
            payback_high: economy?.payback?.high ?? null,
            co2_reduction_kg: economy?.co2ReductionKg ?? null,
            economy: { primary: evaluation!.primaryEconomy, alternatives: evaluation!.alternativeEconomies },
            talking_points: points,
            config_snapshot: cfg,
          })
        : db.from("recommendations").insert({ lead_id: lead.id, primary_solution: {}, talking_points: points, config_snapshot: cfg }),
      sessionId ? db.from("sessions").update({ completed_at: new Date().toISOString() }).eq("id", sessionId) : null,
      sessionId ? db.from("events").insert({ session_id: sessionId, type: "lead_submitted", step: "kontakt", payload: { tier: score.tier } }) : null,
    ]);
    for (const r of results) if (r?.error) console.error("[lead] related insert failed:", r.error.message);
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const reportUrl = site && reportToken ? `${site}/rapport/${reportToken}` : null;
  const adminUrl = site && leadId ? `${site}/admin/leads/${leadId}` : null;

  const customerMail = evaluation
    ? customerReportEmail({ name: contact.name, answers: a, evaluation, reportUrl, wantsInspection: contact.wantsInspection })
    : businessConfirmationEmail(contact.name);
  const internalMail = internalLeadEmail({ leadId, contact, answers: a, evaluation, score, talkingPoints: points, adminUrl });

  const internal = internalRecipients();
  const [emailSent] = await Promise.all([
    sendEmail({ to: contact.email, ...customerMail }),
    internal.length ? sendEmail({ to: internal, replyTo: contact.email, ...internalMail }) : Promise.resolve(false),
  ]);

  return { ok: true, reportToken, emailSent };
}

/** Loads a saved session so a user can resume on another device via ?session=<id>. */
export async function loadSession(sessionId: string): Promise<{ answers: Answers; step: number } | null> {
  if (!z.string().uuid().safeParse(sessionId).success) return null;
  const db = getSupabase();
  if (!db) return null;
  const { data } = await db.from("sessions").select("answers, current_step, completed_at").eq("id", sessionId).maybeSingle();
  if (!data || data.completed_at) return null;
  const answers = answersSchema.safeParse(data.answers);
  return answers.success ? { answers: answers.data, step: data.current_step } : null;
}

function b2bTalkingPoints(a: Answers): string[] {
  const p: string[] = [];
  if (a.businessUrgency === "akut") p.push("AKUT – ring hurtigst muligt.");
  if (a.businessNeeds?.includes("service")) p.push("Ønsker service af eksisterende anlæg – spørg til mærke, alder og serviceaftale.");
  if (a.businessRefrigerant) p.push(`Kølemiddel: ${a.businessRefrigerant} – vurder F-gas-krav og evt. udfasning.`);
  if (a.businessNeeds?.includes("proceskoeling") || a.businessNeeds?.includes("frys")) p.push("Proceskøl/frys – afklar driftskritikalitet og behov for vagtordning.");
  return p;
}

function profileColumns(leadId: string, a: Answers) {
  return {
    lead_id: leadId,
    address_text: a.address?.text ?? null,
    address_id: a.address?.id ?? null,
    postal_code: a.address?.postalCode ?? null,
    city: a.address?.city ?? null,
    area_m2: a.areaM2 ?? null,
    year_built: a.yearBuilt ?? null,
    house_type: a.houseType ?? null,
    floors: a.floors ?? null,
    bbr_prefilled: a.bbrPrefilled ?? null,
    heating_current: a.heating ?? null,
    fjernvarme_available: a.fjernvarmeAvailable ?? null,
    consumption_value: a.knowsConsumption ? (a.consumptionValue ?? null) : null,
    consumption_unit: a.knowsConsumption ? (a.consumptionUnit ?? null) : null,
    windows: a.windows ?? null,
    roof_insulation: a.roof ?? null,
    wall_insulation: a.walls ?? null,
    draughts: a.draughts ?? null,
    emitter_type: a.emitter ?? null,
    radiator_size: a.radiatorSize ?? null,
    warm_at_low_temp: a.warmAtLowTemp ?? null,
    household_size: a.householdSize ?? null,
    hot_water_profile: a.hotWater ?? null,
    garden_size: a.garden ?? null,
    outdoor_placement: a.outdoorPlacement ?? null,
    neighbour_distance: a.neighbourDistance ?? null,
    noise_sensitive: a.noiseSensitive ?? null,
    business_type: a.businessType ?? null,
    business_needs: a.businessNeeds ?? null,
    business_size: a.businessSize ?? null,
    business_urgency: a.businessUrgency ?? null,
    business_existing: a.businessExisting ?? null,
    business_refrigerant: a.businessRefrigerant ?? null,
    company_name: a.companyName ?? null,
    cvr: a.cvr ?? null,
    raw: a,
  };
}

import { z } from "zod";
import { answersSchema, segments } from "@/lib/schema/answers";
import { getSupabase } from "@/lib/supabase/server";

/**
 * First-party, cookieless funnel tracking + progress saving.
 * Called with navigator.sendBeacon so it survives page unloads (drop-off).
 * Contains no personal data – only the anonymous session id and answers.
 */
const bodySchema = z.object({
  sessionId: z.string().uuid(),
  progress: z
    .object({
      step: z.number().int().min(0).max(20),
      maxStep: z.number().int().min(0).max(20),
      segment: z.enum(segments).optional(),
      answers: answersSchema,
      embedded: z.boolean().optional(),
      utm: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  events: z
    .array(
      z.object({
        type: z.enum(["step_view", "step_complete", "card_open", "cta_click"]),
        step: z.string().max(40).optional(),
        payload: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .max(20)
    .optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = JSON.parse(await req.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return new Response(null, { status: 400 });
  const db = getSupabase();
  if (!db) return new Response(null, { status: 204 });

  const { sessionId, progress, events } = parsed.data;
  if (progress) {
    // Answers may contain an address; strip it from what we keep for anonymous sessions.
    const { address, ...answers } = progress.answers;
    const { error } = await db.from("sessions").upsert({
      id: sessionId,
      current_step: progress.step,
      max_step: progress.maxStep,
      segment: progress.segment ?? null,
      answers: { ...answers, address: address ? { postalCode: address.postalCode } : undefined },
      embedded: progress.embedded ?? false,
      utm: progress.utm ?? null,
    });
    if (error) console.error("[events] session upsert failed:", error.message);
  } else {
    // Make sure the session row exists before inserting events (FK).
    await db.from("sessions").upsert({ id: sessionId }, { onConflict: "id", ignoreDuplicates: true });
  }
  if (events?.length) {
    const { error } = await db.from("events").insert(events.map((e) => ({ session_id: sessionId, ...e })));
    if (error) console.error("[events] insert failed:", error.message);
  }
  return new Response(null, { status: 204 });
}

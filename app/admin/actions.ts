"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseSection } from "@/lib/admin/configForm";
import { ADMIN_COOKIE, ADMIN_SESSION_HOURS, checkPassword, createSessionToken, verifySessionToken } from "@/lib/admin/session";
import { configSections, type ConfigSection } from "@/lib/config/defaults";
import { CONTENT_TAG } from "@/lib/data/content";
import { getSupabase } from "@/lib/supabase/server";

async function requireAdmin() {
  const ok = await verifySessionToken((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!ok) redirect("/admin/login");
  const db = getSupabase();
  if (!db) throw new Error("Supabase er ikke konfigureret");
  return db;
}

export type FormState = { ok?: boolean; error?: string; message?: string } | undefined;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (!(await checkPassword(password))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return { error: "Forkert adgangskode" };
  }
  const token = await createSessionToken();
  if (!token) return { error: "ADMIN_SESSION_SECRET mangler eller er for kort (min. 32 tegn)" };
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_HOURS * 3600,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

const statusSchema = z.enum(["new", "contacted", "inspection_booked", "won", "lost"]);

export async function updateLead(_prev: FormState, formData: FormData): Promise<FormState> {
  const db = await requireAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  const status = statusSchema.safeParse(formData.get("status"));
  if (!id.success || !status.success) return { error: "Ugyldige data" };
  const notes = String(formData.get("notes") ?? "").slice(0, 5000);
  const { error } = await db.from("leads").update({ status: status.data, notes }).eq("id", id.data);
  return error ? { error: error.message } : { ok: true, message: "Gemt" };
}

export async function updateConfig(_prev: FormState, formData: FormData): Promise<FormState> {
  const db = await requireAdmin();
  const section = String(formData.get("section")) as ConfigSection;
  if (!configSections.includes(section)) return { error: "Ukendt sektion" };
  const { value, errors } = parseSection(section, (path) => {
    const v = formData.get(`f:${path}`);
    return v === null ? null : String(v);
  });
  if (errors.length) return { error: errors.join("; ") };
  const { error } = await db.from("config").upsert({ key: section, value });
  if (error) return { error: error.message };
  updateTag(CONTENT_TAG);
  return { ok: true, message: "Gemt – ændringerne gælder for nye beregninger" };
}

export async function resetConfig(formData: FormData) {
  const db = await requireAdmin();
  const section = String(formData.get("section"));
  if (!configSections.includes(section as ConfigSection)) return;
  await db.from("config").delete().eq("key", section);
  updateTag(CONTENT_TAG);
}

const cardSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,80}$/, "Slug må kun indeholde små bogstaver, tal og bindestreger"),
  step: z.coerce.number().int().min(0).max(7),
  title: z.string().trim().min(3).max(200),
  body_md: z.string().trim().min(10).max(20000),
  illustration: z.string().max(40).optional(),
  sort_order: z.coerce.number().int().min(0).max(100),
  published: z.boolean(),
});

export async function saveCard(_prev: FormState, formData: FormData): Promise<FormState> {
  const db = await requireAdmin();
  const parsed = cardSchema.safeParse({
    slug: formData.get("slug"),
    step: formData.get("step"),
    title: formData.get("title"),
    body_md: formData.get("body_md"),
    illustration: formData.get("illustration") || undefined,
    sort_order: formData.get("sort_order"),
    published: formData.get("published") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  const { error } = await db.from("knowledge_cards").upsert(parsed.data, { onConflict: "slug" });
  if (error) return { error: error.message };
  updateTag(CONTENT_TAG);
  return { ok: true, message: "Gemt" };
}

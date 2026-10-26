import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { mergeConfig, type AppConfig } from "@/lib/config/defaults";
import { faqItems, knowledgeCards, type FaqItem, type KnowledgeCard } from "@/lib/content/knowledgeCards";
import { getSupabase } from "@/lib/supabase/server";

export const CONTENT_TAG = "content";

/** Config = defaults deep-merged with the DB `config` rows. */
export async function getConfig(): Promise<AppConfig> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CONTENT_TAG);
  const db = getSupabase();
  if (!db) return mergeConfig({});
  const { data, error } = await db.from("config").select("key, value");
  if (error) {
    console.error("[config] falling back to defaults:", error.message);
    return mergeConfig({});
  }
  return mergeConfig(Object.fromEntries(data.map((r) => [r.key, r.value])));
}

export async function getKnowledgeCards(): Promise<KnowledgeCard[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CONTENT_TAG);
  const db = getSupabase();
  if (!db) return knowledgeCards;
  const { data, error } = await db
    .from("knowledge_cards")
    .select("slug, step, title, body_md, illustration, sort_order")
    .eq("published", true)
    .order("step")
    .order("sort_order");
  if (error || !data?.length) return knowledgeCards;
  return data as KnowledgeCard[];
}

export async function getFaq(): Promise<FaqItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CONTENT_TAG);
  const db = getSupabase();
  if (!db) return faqItems;
  const { data, error } = await db.from("faq").select("question, answer_md, sort_order").eq("published", true).order("sort_order");
  if (error || !data?.length) return faqItems;
  return data as FaqItem[];
}

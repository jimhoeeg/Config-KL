import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/**
 * Service-role Supabase client. Server only – RLS has no public policies, so
 * this is the only way to read or write data. Returns null when Supabase is not
 * configured (local preview without a database).
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  if (!client) console.warn("[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set – running without database");
  return client;
}

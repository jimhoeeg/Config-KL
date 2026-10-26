import { connection } from "next/server";
import { fetchBbr, pickBuilding } from "@/lib/bbr/client";

/** Optional BBR prefill (enabled only when DATAFORDELER_API_KEY is set). See lib/bbr/client.ts. */
export async function GET(req: Request) {
  await connection();
  // Trim: keys pasted into the Vercel UI often carry a trailing newline or quotes.
  const key = process.env.DATAFORDELER_API_KEY?.trim().replace(/^["']|["']$/g, "");
  const accessId = new URL(req.url).searchParams.get("accessId");
  if (!key || !accessId || !/^[0-9a-f-]{36}$/i.test(accessId)) return new Response(null, { status: 204 });
  try {
    const buildings = await fetchBbr(accessId, key);
    const result = pickBuilding(buildings);
    if (!result) console.warn(`[bbr] no residential building for husnummer ${accessId} (${buildings.length} buildings returned)`);
    return result ? Response.json(result) : new Response(null, { status: 204 });
  } catch (err) {
    console.warn("[bbr] lookup failed:", (err as Error).message);
    return new Response(null, { status: 204 });
  }
}

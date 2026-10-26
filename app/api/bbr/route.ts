import { connection } from "next/server";
import { fetchBbr, pickBuilding } from "@/lib/bbr/client";

/** Optional BBR prefill (enabled only when DATAFORDELER_API_KEY is set). See lib/bbr/client.ts. */
export async function GET(req: Request) {
  await connection();
  const key = process.env.DATAFORDELER_API_KEY;
  const accessId = new URL(req.url).searchParams.get("accessId");
  if (!key || !accessId || !/^[0-9a-f-]{36}$/i.test(accessId)) return new Response(null, { status: 204 });
  try {
    const result = pickBuilding(await fetchBbr(accessId, key));
    return result ? Response.json(result) : new Response(null, { status: 204 });
  } catch (err) {
    console.warn("[bbr] lookup failed:", (err as Error).message);
    return new Response(null, { status: 204 });
  }
}

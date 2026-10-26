import { connection } from "next/server";
import { parseTitle } from "@/lib/address";

/**
 * Address autocomplete via Klimadatastyrelsen's Adressevælger, which replaced
 * DAWA (closed 1 October 2026). We search house numbers (/husnumre/soeg): the
 * returned id is the DAR husnummer id that BBR uses, and a heat pump is sized
 * per house, not per apartment.
 *
 * ADRESSEVAELGER_TOKEN: Klimadatastyrelsen has not opened user management yet and
 * documents the shared token "adressevaelger123" – replace it with your own token
 * when they issue one.
 */
const BASE = (process.env.ADDRESS_API_URL || "https://adressevaelger.dk").replace(/\/$/, "");

interface Fund {
  type: string;
  id: string;
  titel: string;
  vejnavn?: string;
  husnummer?: string;
}

export async function GET(req: Request) {
  await connection();
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return Response.json([]);
  const token = process.env.ADRESSEVAELGER_TOKEN?.trim() || "adressevaelger123";
  try {
    const res = await fetch(`${BASE}/husnumre/soeg?tekst=${encodeURIComponent(q)}&maksimum=8&token=${encodeURIComponent(token)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      console.warn(`[adresse] ${BASE} answered HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return Response.json([]);
    }
    const json = (await res.json()) as { status?: string; beskrivelse?: string; fund?: Fund[] };
    if (json.status && json.status !== "ok") console.warn(`[adresse] status ${json.status}: ${json.beskrivelse}`);
    return Response.json(
      (json.fund ?? []).map((f) => ({
        text: f.titel,
        id: f.id,
        accessId: f.id,
        ...parseTitle(f.titel),
      })),
    );
  } catch (err) {
    console.warn("[adresse] lookup failed:", (err as Error).message);
    return Response.json([]);
  }
}

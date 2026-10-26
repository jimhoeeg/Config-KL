import { connection } from "next/server";

/**
 * Address autocomplete proxy (DAWA-compatible API at ADDRESS_API_URL).
 * Proxied so the browser never depends on a third-party origin and we can
 * swap provider when DAWA is retired, without touching the UI.
 */
export async function GET(req: Request) {
  await connection();
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return Response.json([]);
  const base = (process.env.ADDRESS_API_URL || "https://api.dataforsyningen.dk").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/adresser/autocomplete?q=${encodeURIComponent(q)}&per_side=8`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return Response.json([], { status: 200 });
    const data = (await res.json()) as {
      tekst: string;
      adresse: { id: string; adgangsadresseid: string; postnr: string; postnrnavn: string };
    }[];
    return Response.json(
      data.map((d) => ({
        text: d.tekst,
        id: d.adresse.id,
        accessId: d.adresse.adgangsadresseid,
        postalCode: d.adresse.postnr,
        city: d.adresse.postnrnavn,
      })),
    );
  } catch (err) {
    console.warn("[adresse] lookup failed:", (err as Error).message);
    return Response.json([]);
  }
}

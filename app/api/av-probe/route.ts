import { connection } from "next/server";

/** TEMPORARY diagnostics on a preview branch – never merge. */
export async function GET(req: Request) {
  await connection();
  const q = new URL(req.url).searchParams.get("q") ?? "Randersvej 8, 4800";
  const token = process.env.ADRESSEVAELGER_TOKEN || "adressevaelger123";
  const out: Record<string, string> = {};
  for (const path of ["husnumre/soeg", "adresser/soeg"]) {
    const r = await fetch(`https://adressevaelger.dk/${path}?tekst=${encodeURIComponent(q)}&maksimum=3&token=${token}`, { signal: AbortSignal.timeout(6000) });
    out[path] = `${r.status} ${(await r.text()).slice(0, 1500)}`;
  }
  return Response.json(out);
}

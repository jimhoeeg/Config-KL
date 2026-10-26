import { connection } from "next/server";

/** TEMPORARY diagnostics on a preview branch – never merge. Never returns the key. */
export async function GET(req: Request) {
  await connection();
  const key = process.env.DATAFORDELER_API_KEY?.trim() ?? "";
  const ver = new URL(req.url).searchParams.get("v") ?? "v3";
  const id = new URL(req.url).searchParams.get("id") ?? "0a3f507b-83d6-32b8-e044-0003ba298018";
  const base = `https://graphql.datafordeler.dk/BBR/${ver}`;
  const schema = await (await fetch(`${base}/schema?apiKey=${encodeURIComponent(key)}`)).text();
  const lines = schema.split("\n");
  const pick = (re: RegExp, ctx = 0) =>
    lines.flatMap((l, i) => (re.test(l) ? lines.slice(Math.max(0, i - ctx), i + 1 + ctx).join("\n") : [])).slice(0, 40);
  // Query root field signature for BBR_Bygning, the fields we use, and the type block header.
  const qIdx = lines.findIndex((l) => /^\s+BBR_Bygning\(/.test(l));
  const tIdx = lines.findIndex((l) => /^type BBR_Bygning\b/.test(l));
  const fIdx = lines.findIndex((l) => /^input BBR_BygningFilterInput/.test(l));
  const now = new Date().toISOString();
  const tryQuery = async (q: string) => {
    const r = await fetch(`${base}?apiKey=${encodeURIComponent(key)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: q }) });
    return `${r.status} ${(await r.text()).slice(0, 1500)}`;
  };
  return Response.json({
    queryField: qIdx >= 0 ? lines.slice(qIdx, qIdx + 25).join("\n") : "not found",
    typeHeader: tIdx >= 0 ? lines.slice(tIdx, tIdx + 6).join("\n") : "not found",
    filterHeader: fIdx >= 0 ? lines.slice(fIdx, fIdx + 6).join("\n") : "not found",
    fields: pick(/byg026|byg039|byg056|byg057|husnummer\b|husnummer:/),
    queryV1Style: await tryQuery(`{ BBR_Bygning(first: 5, registreringstid: "${now}", virkningstid: "${now}", where: { husnummer: { eq: "${id}" } }) { nodes { byg026Opfoerelsesaar byg039BygningensSamledeBoligAreal byg056Varmeinstallation byg057Opvarmningsmiddel } } }`),
  });
}

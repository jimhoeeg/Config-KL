import { connection } from "next/server";

/**
 * TEMPORARY diagnostics on a protected preview branch – never merge.
 * ?svc=BBR|DAR&v=v3&q=<graphql>  runs a query;  ?svc=DAR&grep=<regex>&ctx=n  greps the schema.
 * Never returns the key.
 */
export async function GET(req: Request) {
  await connection();
  const key = process.env.DATAFORDELER_API_KEY?.trim() ?? "";
  const sp = new URL(req.url).searchParams;
  const base = `https://graphql.datafordeler.dk/${sp.get("svc") ?? "BBR"}/${sp.get("v") ?? "v3"}`;
  const strip = (s: string) => s.replaceAll(key, "<key>");
  const grep = sp.get("grep");
  if (grep) {
    const lines = (await (await fetch(`${base}/schema?apiKey=${encodeURIComponent(key)}`)).text()).split("\n");
    const re = new RegExp(grep);
    const ctx = Number(sp.get("ctx") ?? 0);
    const hits = lines.flatMap((l, i) => (re.test(l) ? [lines.slice(Math.max(0, i - ctx), i + 1 + ctx).join("\n")] : [])).slice(0, 60);
    return new Response(strip(hits.join("\n---\n")), { headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  const r = await fetch(`${base}?apiKey=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: sp.get("q") ?? "{ __typename }" }),
  });
  return new Response(`${r.status}\n${strip((await r.text()).slice(0, 6000))}`, { headers: { "content-type": "text/plain; charset=utf-8" } });
}

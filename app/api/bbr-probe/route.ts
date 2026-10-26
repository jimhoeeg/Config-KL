import { connection } from "next/server";

/** TEMPORARY diagnostics on a preview branch – never merge. Returns status codes only, never the key. */
export async function GET() {
  await connection();
  const key = process.env.DATAFORDELER_API_KEY?.trim() ?? "";
  const hosts = ["https://graphql.datafordeler.dk", "https://services.datafordeler.dk", "https://api.datafordeler.dk"];
  const paths = ["/BBR/v1", "/BBR/v2", "/BBR/v3", "/BBR/v1/schema", "/BBR/v2/schema", "/BBR/v3/schema", "/bbr/v1", "/BBR/BBRPublic/1/rest/bygning", "/DAR/v1", "/DAR/v2", "/DAR/v3"];
  const query = JSON.stringify({ query: "{ __typename }" });
  const results: Record<string, string> = {};
  await Promise.all(
    hosts.flatMap((h) =>
      paths.map(async (p) => {
        const url = `${h}${p}?apiKey=${encodeURIComponent(key)}`;
        try {
          const [post, get] = await Promise.all([
            fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: query, signal: AbortSignal.timeout(6000) }),
            fetch(url, { signal: AbortSignal.timeout(6000) }),
          ]);
          const body = (await post.text()).slice(0, 160).replaceAll(key, "<key>");
          const getBody = (await get.text()).slice(0, 160).replaceAll(key, "<key>");
          results[h + p] = `POST ${post.status} ${body} | GET ${get.status} ${getBody}`;
        } catch (e) {
          results[h + p] = `ERR ${(e as Error).message}`;
        }
      }),
    ),
  );
  return Response.json(results);
}

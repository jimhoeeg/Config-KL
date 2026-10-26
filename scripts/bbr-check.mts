/**
 * Verifies the BBR GraphQL lookup against the live Datafordeler endpoint.
 *
 *   DATAFORDELER_API_KEY=... npm run bbr:check -- <adgangsadresse-id>
 *
 * Prints the raw response and the values the wizard would prefill.
 */
import { BBR_URL, bbrQuery, pickBuilding } from "../lib/bbr/client.ts";

const id = process.argv[2];
const key = process.env.DATAFORDELER_API_KEY;
if (!id || !key) {
  console.error("Usage: DATAFORDELER_API_KEY=... npm run bbr:check -- <adgangsadresse-id>");
  process.exit(1);
}

const res = await fetch(`${BBR_URL}?apiKey=${encodeURIComponent(key)}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ query: bbrQuery(id) }),
});
const text = await res.text();
console.log(`HTTP ${res.status}\n${text}\n`);
try {
  const nodes = JSON.parse(text)?.data?.BBR_Bygning?.nodes ?? [];
  console.log("Prefill:", pickBuilding(nodes));
} catch {
  // non-JSON response already printed
}

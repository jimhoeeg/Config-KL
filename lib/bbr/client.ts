/**
 * BBR lookup via Datafordeler's GraphQL service. Replaces the BBR REST service,
 * which Datafordeler retires on 15 January 2027.
 *
 * The address id from the autocomplete (DAWA adgangsadresse id) is the DAR
 * husnummer id, which BBR_Bygning references in its `husnummer` field.
 *
 * NOTE: Not verified against the live endpoint (unreachable from the build
 * environment). Run `npm run bbr:check -- <adgangsadresse-id>` with your key
 * before go-live and adjust field names if the schema differs.
 */
export const BBR_URL = process.env.BBR_API_URL || "https://graphql.datafordeler.dk/BBR/v1";

/** husnummer must be a validated UUID – it is inlined into the query. */
export function bbrQuery(husnummer: string, at: Date = new Date()): string {
  const tid = at.toISOString();
  return `{
  BBR_Bygning(first: 20, registreringstid: "${tid}", virkningstid: "${tid}", where: { husnummer: { eq: "${husnummer}" } }) {
    nodes {
      byg026Opfoerelsesaar
      byg039BygningensSamledeBoligAreal
      byg056Varmeinstallation
      byg057Opvarmningsmiddel
    }
  }
}`;
}

type Heating = "olie" | "gas" | "elvarme" | "traepiller" | "fjernvarme" | "gammel_varmepumpe";

export interface BbrBuilding {
  byg026Opfoerelsesaar?: number | string | null;
  byg039BygningensSamledeBoligAreal?: number | string | null;
  byg056Varmeinstallation?: string | null;
  byg057Opvarmningsmiddel?: string | null;
}

/** BBR code lists: byg056 Varmeinstallation, byg057 Opvarmningsmiddel. */
export function mapHeating(inst?: string | null, middel?: string | null): Heating | undefined {
  switch (inst) {
    case "1":
      return "fjernvarme";
    case "5":
      return "gammel_varmepumpe";
    case "7":
      return "elvarme";
    case "8":
      return "gas";
    case "2":
    case "6":
      if (middel === "3") return "olie";
      if (middel === "7" || middel === "2") return "gas";
      if (middel === "4") return "traepiller";
      if (middel === "1") return "elvarme";
  }
  return undefined;
}

/** Picks the main dwelling (largest residential area) and maps it to wizard answers. */
export function pickBuilding(buildings: BbrBuilding[]) {
  const b = buildings
    .filter((x) => Number(x.byg039BygningensSamledeBoligAreal) > 0)
    .sort((x, y) => Number(y.byg039BygningensSamledeBoligAreal) - Number(x.byg039BygningensSamledeBoligAreal))[0];
  if (!b) return null;
  return {
    areaM2: Number(b.byg039BygningensSamledeBoligAreal) || undefined,
    yearBuilt: Number(b.byg026Opfoerelsesaar) || undefined,
    heating: mapHeating(b.byg056Varmeinstallation, b.byg057Opvarmningsmiddel),
  };
}

export async function fetchBbr(husnummer: string, apiKey: string, url = BBR_URL): Promise<BbrBuilding[]> {
  const res = await fetch(`${url}?apiKey=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: bbrQuery(husnummer) }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { data?: { BBR_Bygning?: { nodes?: BbrBuilding[] } }; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data?.BBR_Bygning?.nodes ?? [];
}


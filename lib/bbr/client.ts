/**
 * BBR lookup via Datafordeler's GraphQL service (BBR v3). Replaces the BBR REST
 * service, which Datafordeler retires on 15 January 2027.
 *
 * The id from the address autocomplete (Adressevælgeren /husnumre/soeg) is the
 * DAR husnummer id, which BBR_Bygning references in its `husnummer` field.
 * Verified against the live endpoint on 2026-10-26.
 */
export const BBR_URL = process.env.BBR_API_URL || "https://graphql.datafordeler.dk/BBR/v3";

/**
 * husnummer must be a validated UUID – it is inlined into the query. Both
 * registreringstid and virkningstid are set so BBR returns only the current
 * version of each building (otherwise every historical registration comes back).
 */
export function bbrQuery(husnummer: string, at: Date = new Date()): string {
  const tid = at.toISOString();
  return `{
  BBR_Bygning(first: 50, registreringstid: "${tid}", virkningstid: "${tid}", where: { husnummer: { eq: "${husnummer}" } }) {
    nodes {
      id_lokalId
      status
      byg021BygningensAnvendelse
      byg026Opfoerelsesaar
      byg038SamletBygningsareal
      byg039BygningensSamledeBoligAreal
      byg056Varmeinstallation
      byg057Opvarmningsmiddel
    }
  }
}`;
}

type Heating = "olie" | "gas" | "elvarme" | "traepiller" | "fjernvarme" | "gammel_varmepumpe";

export interface BbrBuilding {
  id_lokalId?: string | null;
  status?: string | null;
  byg021BygningensAnvendelse?: string | null;
  byg038SamletBygningsareal?: number | string | null;
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

/**
 * Picks the main dwelling and maps it to wizard answers. Buildings are
 * de-duplicated by id (the time filters already exclude historical versions).
 * Prefers the building with the largest residential area. If no building has a
 * residential area (e.g. a business address), it still returns year built and
 * heating from the largest building, but no area – a commercial floor area
 * would be a misleading heated area for the house calculation.
 */
export function pickBuilding(buildings: BbrBuilding[]) {
  const seen = new Set<string>();
  const current = buildings.filter((b) => {
    const id = b.id_lokalId ?? JSON.stringify(b);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  const num = (v: number | string | null | undefined) => Number(v) || 0;
  const dwelling = [...current]
    .filter((b) => num(b.byg039BygningensSamledeBoligAreal) > 0)
    .sort((x, y) => num(y.byg039BygningensSamledeBoligAreal) - num(x.byg039BygningensSamledeBoligAreal))[0];
  const b = dwelling ?? [...current].sort((x, y) => num(y.byg038SamletBygningsareal) - num(x.byg038SamletBygningsareal))[0];
  if (!b) return null;
  const result = {
    areaM2: dwelling ? num(b.byg039BygningensSamledeBoligAreal) : undefined,
    yearBuilt: num(b.byg026Opfoerelsesaar) > 1700 ? num(b.byg026Opfoerelsesaar) : undefined,
    heating: mapHeating(b.byg056Varmeinstallation, b.byg057Opvarmningsmiddel),
  };
  return result.areaM2 || result.yearBuilt || result.heating ? result : null;
}

export async function fetchBbr(husnummer: string, apiKey: string, url = BBR_URL): Promise<BbrBuilding[]> {
  const res = await fetch(`${url}?apiKey=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: bbrQuery(husnummer) }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { data?: { BBR_Bygning?: { nodes?: BbrBuilding[] } }; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data?.BBR_Bygning?.nodes ?? [];
}


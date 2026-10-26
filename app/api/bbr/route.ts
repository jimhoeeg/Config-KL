import { connection } from "next/server";

/**
 * Optional BBR prefill via Datafordeler (enabled only when DATAFORDELER_API_KEY is set).
 *
 * NOTE: Datafordeler access requires a (free) account. The endpoint and field
 * names below follow BBR 2.x (byg026Opførelsesår, byg039BygningensSamledeBoligAreal,
 * byg056Varmeinstallation, byg057Opvarmningsmiddel) but must be verified against
 * your Datafordeler subscription before go-live. The UI always lets the user
 * correct the values.
 */
const BBR_URL = process.env.BBR_API_URL || "https://services.datafordeler.dk/BBR/BBRPublic/1/rest/bygning";

type Heating = "olie" | "gas" | "elvarme" | "traepiller" | "fjernvarme" | "gammel_varmepumpe";

function mapHeating(inst?: string, middel?: string): Heating | undefined {
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

export async function GET(req: Request) {
  await connection();
  const key = process.env.DATAFORDELER_API_KEY;
  const accessId = new URL(req.url).searchParams.get("accessId");
  if (!key || !accessId || !/^[0-9a-f-]{36}$/i.test(accessId)) return new Response(null, { status: 204 });
  try {
    const res = await fetch(`${BBR_URL}?husnummer=${accessId}&format=json&apiKey=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return new Response(null, { status: 204 });
    const buildings = (await res.json()) as Record<string, string | undefined>[];
    // Pick the building with the largest residential area (the house, not the shed).
    const b = buildings
      .filter((x) => Number(x.byg039BygningensSamledeBoligAreal) > 0)
      .sort((x, y) => Number(y.byg039BygningensSamledeBoligAreal) - Number(x.byg039BygningensSamledeBoligAreal))[0];
    if (!b) return new Response(null, { status: 204 });
    return Response.json({
      areaM2: Number(b.byg039BygningensSamledeBoligAreal) || undefined,
      yearBuilt: Number(b["byg026Opførelsesår"]) || undefined,
      heating: mapHeating(b.byg056Varmeinstallation, b.byg057Opvarmningsmiddel),
    });
  } catch (err) {
    console.warn("[bbr] lookup failed:", (err as Error).message);
    return new Response(null, { status: 204 });
  }
}

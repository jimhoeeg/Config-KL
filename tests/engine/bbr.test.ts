import { describe, expect, it } from "vitest";
import { parseTitle } from "@/lib/address";
import { bbrQuery, mapHeating, pickBuilding } from "@/lib/bbr/client";

describe("BBR mapping", () => {
  it("maps heating installation and fuel codes", () => {
    expect(mapHeating("1", null)).toBe("fjernvarme");
    expect(mapHeating("2", "3")).toBe("olie");
    expect(mapHeating("6", "7")).toBe("gas");
    expect(mapHeating("2", "4")).toBe("traepiller");
    expect(mapHeating("5", null)).toBe("gammel_varmepumpe");
    expect(mapHeating("7", null)).toBe("elvarme");
    expect(mapHeating("9", null)).toBeUndefined();
  });

  it("picks the building with the largest residential area", () => {
    expect(
      pickBuilding([
        { byg026Opfoerelsesaar: 1990, byg039BygningensSamledeBoligAreal: 0, byg056Varmeinstallation: "9" },
        { byg026Opfoerelsesaar: "1972", byg039BygningensSamledeBoligAreal: "142", byg056Varmeinstallation: "2", byg057Opvarmningsmiddel: "3" },
      ]),
    ).toEqual({ areaM2: 142, yearBuilt: 1972, heating: "olie" });
    expect(pickBuilding([])).toBeNull();
  });

  it("de-duplicates versions and falls back to year/heating without residential area", () => {
    // Shape of the live response for Randersvej 8, 4800 (a business address, no residential area).
    const nodes = [
      { id_lokalId: "a", byg026Opfoerelsesaar: 1986, byg038SamletBygningsareal: 984, byg039BygningensSamledeBoligAreal: null, byg056Varmeinstallation: "9" },
      { id_lokalId: "b", byg026Opfoerelsesaar: 1970, byg038SamletBygningsareal: 2393, byg039BygningensSamledeBoligAreal: null, byg056Varmeinstallation: "2", byg057Opvarmningsmiddel: "3" },
      { id_lokalId: "b", byg026Opfoerelsesaar: 1970, byg038SamletBygningsareal: 2393, byg039BygningensSamledeBoligAreal: null, byg056Varmeinstallation: "2", byg057Opvarmningsmiddel: "3" },
    ];
    expect(pickBuilding(nodes)).toEqual({ areaM2: undefined, yearBuilt: 1970, heating: "olie" });
  });

  it("parses postal code and city from an Adressevælger title", () => {
    expect(parseTitle("Randersvej 8, 4800 Nykøbing F")).toEqual({ postalCode: "4800", city: "Nykøbing F" });
    expect(parseTitle("Uden postnummer")).toEqual({});
  });

  it("inlines husnummer and time into the query", () => {
    const q = bbrQuery("0a3f507b-83d6-32b8-e044-0003ba298018", new Date("2026-01-01T00:00:00Z"));
    expect(q).toContain('husnummer: { eq: "0a3f507b-83d6-32b8-e044-0003ba298018" }');
    expect(q).toContain('virkningstid: "2026-01-01T00:00:00.000Z"');
  });
});

import { describe, expect, it } from "vitest";
import { airToAirUnits, recommend } from "@/lib/engine/recommend";
import { cfg, oilHouse } from "./fixtures";

describe("recommend", () => {
  it("recommends air-to-water for an oil house with radiators", () => {
    const r = recommend(oilHouse, cfg);
    expect(r.primary.type).toBe("luft_til_vand");
    expect(r.primary.why.length).toBeGreaterThan(0);
    expect(r.alternatives.map((o) => o.type)).toEqual(["jordvarme", "luft_til_luft"]);
    expect(r.alternatives.length).toBeLessThanOrEqual(2);
  });

  it("recommends ground source on a large plot with high demand", () => {
    const r = recommend({ ...oilHouse, garden: "stor" }, cfg);
    expect(r.primary.type).toBe("jordvarme");
    expect(r.alternatives[0].type).toBe("luft_til_vand");
  });

  it("keeps air-to-water on a large plot when demand is low", () => {
    const r = recommend({ ...oilHouse, garden: "stor", areaM2: 90, yearBuilt: 2010 }, cfg);
    expect(r.primary.type).toBe("luft_til_vand");
  });

  it("recommends air-to-air for electric panels", () => {
    const r = recommend({ ...oilHouse, heating: "elvarme", emitter: "elpaneler", areaM2: 80 }, cfg);
    expect(r.primary.type).toBe("luft_til_luft");
    expect(r.primary.indoorUnits).toBe(1);
    expect(r.alternatives[0].type).toBe("luft_til_vand");
  });

  it("recommends air-to-air for a sommerhus", () => {
    const r = recommend({ ...oilHouse, segment: "sommerhus", houseType: "sommerhus", heating: "elvarme", emitter: "elpaneler" }, cfg);
    expect(r.primary.type).toBe("luft_til_luft");
  });

  it("says not suitable when district heating is installed", () => {
    const r = recommend({ ...oilHouse, heating: "fjernvarme" }, cfg);
    expect(r.primary.type).toBe("ikke_egnet");
    expect(r.reason).toBe("fjernvarme_installeret");
    expect(r.alternatives).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it("points to district heating first when it is available, with the heat pump as alternative", () => {
    const r = recommend({ ...oilHouse, fjernvarmeAvailable: "ja" }, cfg);
    expect(r.primary.type).toBe("ikke_egnet");
    expect(r.reason).toBe("fjernvarme_tilgaengelig");
    expect(r.alternatives[0].type).toBe("luft_til_vand");
  });

  it("says insulate first for a very leaky pre-1960 house", () => {
    const r = recommend(
      { ...oilHouse, yearBuilt: 1935, windows: "enkelt", roof: "ingen", walls: "uisoleret", draughts: "lidt" },
      cfg,
    );
    expect(r.primary.type).toBe("ikke_endnu");
    expect(r.reason).toBe("isoler_foerst");
    expect(r.alternatives[0].type).toBe("luft_til_vand");
  });

  it("does not say insulate first for a leaky house built after 1960", () => {
    const r = recommend({ ...oilHouse, yearBuilt: 1965, windows: "enkelt", roof: "ingen", walls: "uisoleret" }, cfg);
    expect(r.primary.type).toBe("luft_til_vand");
  });

  it("adds placement warnings", () => {
    const r = recommend({ ...oilHouse, neighbourDistance: "under_3", noiseSensitive: true }, cfg);
    expect(r.warnings).toHaveLength(2);
  });
});

describe("airToAirUnits", () => {
  it("scales with area and floors, capped", () => {
    expect(airToAirUnits({ areaM2: 80, floors: 1 }, cfg)).toBe(1);
    expect(airToAirUnits({ areaM2: 150, floors: 1 }, cfg)).toBe(2);
    expect(airToAirUnits({ areaM2: 80, floors: 2 }, cfg)).toBe(2);
    expect(airToAirUnits({ areaM2: 900, floors: 1 }, cfg)).toBe(4);
  });
});

import { describe, expect, it } from "vitest";
import { recommend } from "@/lib/engine/recommend";
import { isInServiceArea, isValidDanishPhone, isValidEmail, scoreLead, tierFor } from "@/lib/engine/scoring";
import { scoreB2BLead } from "@/lib/engine/scoringB2B";
import type { Answers } from "@/lib/schema/answers";
import { cfg, oilHouse } from "./fixtures";

const engaged = { cardsOpened: 4, secondsSpent: 300 };
const contact = { email: "test@example.dk", phone: "+45 20 30 40 50", wantsInspection: true };

function score(a: Answers, c = contact, e = engaged) {
  return scoreLead({ answers: a, recommendation: recommend(a, cfg), contact: c, engagement: e }, cfg);
}

describe("validators", () => {
  it("validates Danish phone numbers", () => {
    expect(isValidDanishPhone("20304050")).toBe(true);
    expect(isValidDanishPhone("+45 20 30 40 50")).toBe(true);
    expect(isValidDanishPhone("0045-20304050")).toBe(true);
    expect(isValidDanishPhone("1234567")).toBe(false);
    expect(isValidDanishPhone("01234567")).toBe(false);
    expect(isValidDanishPhone(undefined)).toBe(false);
  });
  it("validates emails", () => {
    expect(isValidEmail("a@b.dk")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
  });
  it("checks the service area", () => {
    expect(isInServiceArea("2100", cfg)).toBe(true);
    expect(isInServiceArea("4800", cfg)).toBe(true);
    expect(isInServiceArea("3700", cfg)).toBe(false); // Bornholm
    expect(isInServiceArea("8000", cfg)).toBe(false);
    expect(isInServiceArea(undefined, cfg)).toBe(false);
    expect(isInServiceArea("8000", { ...cfg, serviceArea: { ...cfg.serviceArea, include: ["8000"] } })).toBe(true);
    expect(isInServiceArea("2100", { ...cfg, serviceArea: { ...cfg.serviceArea, exclude: ["2100"] } })).toBe(false);
  });
});

describe("tierFor", () => {
  it("uses the tier thresholds", () => {
    expect(tierFor(75)).toBe("A");
    expect(tierFor(74)).toBe("B");
    expect(tierFor(50)).toBe("B");
    expect(tierFor(49)).toBe("C");
    expect(tierFor(25)).toBe("C");
    expect(tierFor(24)).toBe("D");
  });
});

describe("scoreLead", () => {
  it("scores a hot oil lead", () => {
    const s = score(oilHouse);
    // fit: oil 15 + standard radiators 6 + reasonable insulation 8 + in area 7 = 36
    expect(s.fit).toBe(36);
    // value: air-to-water 20
    expect(s.value).toBe(20);
    // intent: <3 months 12 + inspection 10 + engagement 3 = 25
    expect(s.intent).toBe(25);
    // data quality: phone 4 + email 3 = 7
    expect(s.dataQuality).toBe(7);
    expect(s.total).toBe(88);
    expect(s.tier).toBe("A");
    expect(s.disqualified).toBe(false);
    expect(s.modelVersion).toBe("1.0.0");
  });

  it("gives full fit and data quality points when everything is ideal", () => {
    const a: Answers = { ...oilHouse, emitter: "gulvvarme", knowsConsumption: true, consumptionValue: 2000, consumptionUnit: "liter_olie" };
    const s = score(a);
    expect(s.fit).toBe(40);
    expect(s.dataQuality).toBe(10);
  });

  it("caps value at 25 with the service bonus", () => {
    const s = score({ ...oilHouse, garden: "stor", serviceInterest: true });
    expect(s.breakdown.value.reduce((x, l) => x + l.points, 0)).toBe(28);
    expect(s.value).toBe(25);
  });

  it("disqualifies district heating as tier D", () => {
    const s = score({ ...oilHouse, heating: "fjernvarme" });
    expect(s.disqualified).toBe(true);
    expect(s.tier).toBe("D");
    expect(s.flags).toContain("fjernvarme");
    expect(s.value).toBe(0);
  });

  it("gives 0 heating fit points when district heating is available but keeps the tier", () => {
    const s = score({ ...oilHouse, fjernvarmeAvailable: "ja" });
    expect(s.breakdown.fit[0].points).toBe(0);
    expect(s.flags).toContain("fjernvarme_tilgaengelig");
    expect(s.disqualified).toBe(false);
    expect(s.tier).toBe(tierFor(s.total));
  });

  it("caps leads outside the service area at tier C", () => {
    const s = score({ ...oilHouse, address: { text: "Aarhus", postalCode: "8000" } });
    expect(s.total).toBeGreaterThanOrEqual(75);
    expect(s.tier).toBe("C");
    expect(s.flags).toContain("outside_area");
  });

  it("scores a report-only explorer low", () => {
    const s = score(
      { ...oilHouse, timeline: "undersoeger" },
      { email: "x@y.dk", phone: "", wantsInspection: false },
      { cardsOpened: 0, secondsSpent: 60 },
    );
    expect(s.intent).toBe(5);
  });

  it("scores single and multi-unit air-to-air differently", () => {
    const base: Answers = { ...oilHouse, heating: "elvarme", emitter: "elpaneler" };
    expect(score({ ...base, areaM2: 80 }).value).toBe(6);
    expect(score({ ...base, areaM2: 200 }).value).toBe(10);
  });
});

describe("scoreB2BLead", () => {
  it("scores an urgent large freezer lead as A", () => {
    const s = scoreB2BLead(
      {
        segment: "erhverv",
        address: { text: "x", postalCode: "2600" },
        businessNeeds: ["koeling", "frys"],
        businessSize: "stor",
        businessUrgency: "akut",
        companyName: "Test ApS",
      },
      { email: "a@b.dk", phone: "20304050" },
      cfg,
    );
    expect(s.need).toBe(30);
    expect(s.total).toBe(100);
    expect(s.tier).toBe("A");
  });

  it("caps business leads outside the area at C", () => {
    const s = scoreB2BLead(
      { address: { text: "x", postalCode: "9000" }, businessNeeds: ["proceskoeling"], businessSize: "stor", businessUrgency: "akut" },
      { email: "a@b.dk", phone: "20304050" },
      cfg,
    );
    expect(s.tier).toBe("C");
  });
});

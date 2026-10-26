import { profileRows } from "@/lib/content/profile";
import { label } from "@/lib/content/labels";
import type { Economy, Evaluation, LeadScore, B2BLeadScore, SolutionOption } from "@/lib/engine";
import { flowTempLabels, tierDescriptions } from "@/lib/engine";
import { kr, krRange, num, PRICE_DISCLAIMER, SIZING_DISCLAIMER, yearsRange } from "@/lib/format";
import type { Answers, ContactInput } from "@/lib/schema/answers";

/**
 * Plain HTML email templates with inline styles (most email clients ignore <style>).
 * Kept dependency-free on purpose.
 */

const BRAND = "#0b4f8a";
const ACCENT = "#e8692c";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f3f6f9;font-family:Arial,Helvetica,sans-serif;color:#1a2533">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:${BRAND};padding:20px 28px;color:#fff;font-size:18px;font-weight:bold">KL Køleteknik <span style="font-weight:normal;opacity:.8">· Varmepumperådgiveren</span></td></tr>
<tr><td style="padding:28px">${body}</td></tr>
<tr><td style="padding:18px 28px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.5">KL Køleteknik · VE-godkendt · Medlem af AKB og KMO · Dansk Køl og Varme Garantiordning</td></tr>
</table></td></tr></table></body></html>`;
}

const h2 = (t: string) => `<h2 style="font-size:18px;margin:28px 0 10px;color:${BRAND}">${esc(t)}</h2>`;
const p = (t: string) => `<p style="margin:0 0 12px;line-height:1.55;font-size:15px">${t}</p>`;
const ul = (items: string[]) =>
  `<ul style="margin:0 0 12px;padding-left:20px;line-height:1.55;font-size:15px">${items.map((i) => `<li style="margin-bottom:4px">${esc(i)}</li>`).join("")}</ul>`;
const table = (rows: [string, string][]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin-bottom:12px">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:7px 0;border-bottom:1px solid #e2e8f0;color:#64748b;width:45%">${esc(k)}</td><td style="padding:7px 0;border-bottom:1px solid #e2e8f0;font-weight:bold">${esc(v)}</td></tr>`,
    )
    .join("")}</table>`;
const button = (href: string, text: string) =>
  `<p style="margin:20px 0"><a href="${esc(href)}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold">${esc(text)}</a></p>`;
const notice = (html: string) =>
  `<div style="background:#fff7ed;border-left:4px solid ${ACCENT};padding:12px 14px;margin:12px 0;font-size:14px;line-height:1.5">${html}</div>`;

function optionBlock(o: SolutionOption, e: Economy | null): string {
  let html = `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:12px">
<div style="font-weight:bold;font-size:16px;margin-bottom:6px">${esc(o.title)}</div>${p(esc(o.summary))}<div style="font-weight:bold;font-size:14px">Hvorfor?</div>${ul(o.why)}`;
  if (e) html += table(economyRows(e));
  return html + "</div>";
}

function economyRows(e: Economy): [string, string][] {
  const rows: [string, string][] = [["Pris inkl. installation og moms", krRange(e.price)]];
  if (e.subsidy) rows.push(["Varmepumpepuljen", `− ${kr(e.subsidy)}`]);
  rows.push(["Pris efter tilskud", krRange(e.netPrice)]);
  if (e.possibleDeductionValue) rows.push(["Mulig fradrag (skatteværdi) – tjek gældende regler", `ca. ${kr(e.possibleDeductionValue)}`]);
  rows.push(["Varmeudgift i dag (skøn)", `${kr(e.currentCost)}/år`]);
  rows.push(["Driftsudgift med varmepumpe", `${kr(e.newRunningCost)}/år`]);
  rows.push(["Årlig besparelse", `${kr(e.annualSaving)}/år`]);
  if (e.payback) rows.push(["Tilbagebetalingstid", yearsRange(e.payback)]);
  rows.push(["CO₂-reduktion", `ca. ${num(e.co2ReductionKg)} kg/år`]);
  rows.push([`Tryghed i ${e.service.years} år (service)`, `${kr(e.service.perYear)}/år`]);
  return rows;
}

export function customerReportEmail(opts: {
  name: string;
  answers: Answers;
  evaluation: Evaluation;
  reportUrl: string | null;
  wantsInspection: boolean;
}): { subject: string; html: string } {
  const { evaluation: ev, answers: a } = opts;
  const rec = ev.recommendation;
  const firstName = opts.name.split(" ")[0];
  const options = [rec.primary, ...rec.alternatives];
  const economies = [ev.primaryEconomy, ...ev.alternativeEconomies];
  const hasSubsidy = economies.some((e) => e && e.subsidy > 0);

  let body = p(`Hej ${esc(firstName)},`);
  body += p("Tak fordi du brugte Varmepumperådgiveren. Her er din personlige rapport – baseret på dine svar.");
  if (opts.wantsInspection) body += notice("Vi har modtaget din anmodning om en <b>gratis besigtigelse</b> og kontakter dig hurtigst muligt for at aftale tid.");
  if (opts.reportUrl) body += button(opts.reportUrl, "Se din fulde rapport");

  body += h2("Dit hus i tal");
  body += table([
    ["Beregnet varmebehov", `${num(rec.heat.annualKwh)} kWh/år${rec.heat.source === "actual" ? " (ud fra dit forbrug)" : " (skøn)"}`],
    ["Skønnet varmepumpestørrelse", `ca. ${rec.heat.sizeKw} kW`],
    ["Nødvendig fremløbstemperatur", flowTempLabels[rec.heat.flowTemp]],
  ]);
  body += p(`<small style="color:#64748b">${SIZING_DISCLAIMER}</small>`);

  body += h2("Vores anbefaling");
  options.forEach((o, i) => {
    if (i === 1) body += h2("Alternativer");
    body += optionBlock(o, economies[i]);
  });
  if (rec.warnings.length) {
    body += h2("Værd at vide om placering");
    body += ul(rec.warnings);
  }
  body += p(`<small style="color:#64748b">${PRICE_DISCLAIMER}</small>`);
  if (hasSubsidy) body += notice("<b>Søg Varmepumpepuljen, før du skriver under.</b> Tilskuddet bortfalder, hvis du har indgået en bindende aftale, inden du har søgt.");

  body += h2("Dine svar");
  body += table(profileRows(a).map((r) => [r.label, r.value]));
  if (!opts.wantsInspection) {
    body += h2("Næste skridt");
    body += p("Vil du have en præcis pris? Book en gratis og uforpligtende besigtigelse – så kommer en af vores montører ud og ser på huset.");
  }
  body += p("Venlig hilsen<br>Lars Holse og holdet hos KL Køleteknik");

  return { subject: "Din personlige varmepumperapport fra KL Køleteknik", html: layout("Din varmepumperapport", body) };
}

export function internalLeadEmail(opts: {
  leadId: string | null;
  contact: ContactInput;
  answers: Answers;
  evaluation: Evaluation | null;
  score: LeadScore | B2BLeadScore;
  talkingPoints: string[];
  adminUrl: string | null;
}): { subject: string; html: string } {
  const { contact: c, answers: a, evaluation: ev, score: s } = opts;
  const isB2B = a.segment === "erhverv";
  const tierColor = { A: "#16a34a", B: "#ca8a04", C: "#2563eb", D: "#64748b" }[s.tier];
  const flags = s.flags.length ? ` · ⚠ ${s.flags.join(", ")}` : "";

  let body = `<div style="display:inline-block;background:${tierColor};color:#fff;font-weight:bold;padding:6px 12px;border-radius:6px;font-size:16px">Tier ${s.tier} · ${s.total}/100</div>`;
  body += p(`<br>${esc(tierDescriptions[s.tier])}${esc(flags)}`);
  body += h2("Kontakt");
  body += table([
    ["Navn", c.name],
    ["Telefon", c.phone || "–"],
    ["E-mail", c.email],
    ["Foretrækker", label("contactPreference", c.contactPreference)],
    ["Ønsker besigtigelse", c.wantsInspection ? `Ja${c.preferredDate ? ` – gerne ${c.preferredDate}` : ""}` : "Nej (kun rapport)"],
    ["Tidshorisont", isB2B ? label("businessUrgency", a.businessUrgency) : label("timeline", a.timeline)],
    ["Markedsføringssamtykke", c.marketingConsent ? "Ja" : "Nej"],
  ]);
  if (c.message) body += p(`<b>Besked:</b> ${esc(c.message)}`);
  if (opts.adminUrl) body += button(opts.adminUrl, "Åbn lead i admin");

  body += h2("Samtalepunkter");
  body += ul(opts.talkingPoints.length ? opts.talkingPoints : ["Ingen særlige punkter."]);

  body += h2("Score");
  const groups = Object.entries(s.breakdown) as [string, { label: string; points: number }[]][];
  body += table(groups.flatMap(([g, lines]) => lines.map((l) => [`${g}: ${l.label}`, `${l.points}`] as [string, string])));

  if (ev) {
    const rec = ev.recommendation;
    body += h2("Anbefaling");
    body += table([
      ["Primær", rec.primary.title],
      ["Alternativer", rec.alternatives.map((o) => o.title).join(", ") || "–"],
      ["Varmebehov", `${num(rec.heat.annualKwh)} kWh/år (${rec.heat.source === "actual" ? "faktisk" : "skøn"})`],
      ["Størrelse", `ca. ${rec.heat.sizeKw} kW`],
      ["Fremløb", flowTempLabels[rec.heat.flowTemp]],
    ]);
    const e = ev.primaryEconomy ?? ev.alternativeEconomies.find(Boolean);
    if (e) body += table(economyRows(e));
  }

  body += h2(isB2B ? "Virksomhedsprofil" : "Husprofil");
  body += table(profileRows(a).map((r) => [r.label, r.value]));

  const who = isB2B ? a.companyName || c.name : c.name;
  return {
    subject: `[${s.tier} · ${s.total}] Nyt ${isB2B ? "erhvervs" : ""}lead: ${who}${a.address?.postalCode ? ` (${a.address.postalCode})` : ""}`,
    html: layout("Nyt lead", body),
  };
}

export function businessConfirmationEmail(name: string): { subject: string; html: string } {
  let body = p(`Hej ${esc(name.split(" ")[0])},`);
  body += p("Tak for din henvendelse. Vi har modtaget dine oplysninger, og en af vores specialister i erhvervskøl og -varme kontakter dig personligt – typisk inden for én arbejdsdag.");
  body += p("Har du brug for hjælp akut, er du velkommen til at ringe til os.");
  body += p("Venlig hilsen<br>KL Køleteknik");
  return { subject: "Tak for din henvendelse – KL Køleteknik", html: layout("Tak for din henvendelse", body) };
}

"use client";

import { AlertTriangle, Leaf, PiggyBank, ShieldCheck, TrendingDown } from "lucide-react";
import { solutionTitles, type Economy, type Evaluation } from "@/lib/engine";
import { kr, krRange, num, PRICE_DISCLAIMER, yearsRange } from "@/lib/format";

export function EconomyView({ evaluation, economy }: { evaluation: Evaluation; economy: Economy }) {
  const e = economy;
  const others = [evaluation.primaryEconomy, ...evaluation.alternativeEconomies].filter((x): x is Economy => !!x && x !== e);
  return (
    <div className="space-y-4">
      {e.subsidy > 0 && (
        <div className="flex gap-3 rounded-xl border-2 border-accent bg-warning-bg p-4">
          <AlertTriangle className="mt-0.5 size-6 shrink-0 text-accent" />
          <div className="text-sm leading-relaxed">
            <b className="block text-base">Søg Varmepumpepuljen, FØR du skriver under</b>
            Du kan få et fast, skattefrit tilskud på <b>{kr(e.subsidy)}</b>. Men kun hvis du søger, inden du indgår en bindende aftale med en installatør.
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card p-5">
        <div className="text-sm text-muted-foreground">{solutionTitles[e.solution]} – inkl. installation og moms</div>
        <div className="mt-1 text-2xl font-bold tabular-nums">{krRange(e.price)}</div>
        <dl className="mt-4 space-y-2 text-sm">
          {e.subsidy > 0 && (
            <Row label="Varmepumpepuljen 2026" value={`− ${kr(e.subsidy)}`} className="text-success" />
          )}
          <Row label="Din pris efter tilskud" value={krRange(e.netPrice)} bold />
          {e.possibleDeductionValue > 0 && (
            <Row label="Mulig fradrag (håndværkerfradrag) – tjek gældende regler" value={`ca. ${kr(e.possibleDeductionValue)}`} muted />
          )}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">{PRICE_DISCLAIMER}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Tile icon={<TrendingDown />} label="Årlig besparelse" value={e.annualSaving > 0 ? kr(e.annualSaving) : "Ingen"} sub={`${kr(e.currentCost)} → ${kr(e.newRunningCost)}`} />
        <Tile icon={<PiggyBank />} label="Tilbagebetaling" value={e.payback ? yearsRange(e.payback) : "–"} sub="efter tilskud" />
        <Tile icon={<Leaf />} label="CO₂-reduktion" value={`${num(e.co2ReductionKg)} kg`} sub="pr. år" />
      </div>
      <p className="text-xs text-muted-foreground">
        Driftsudgift = varmebehov ÷ SCOP {e.scop.toLocaleString("da-DK")} × elpris.
        {e.coverage < 1 && ` Luft-til-luft dækker ca. ${Math.round(e.coverage * 100)} % af varmebehovet – resten klares af din nuværende opvarmning.`}
      </p>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-5 text-primary" /> Tryghed i {e.service.years} år
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Med vores serviceabonnement til {kr(e.service.perYear)} om året inkl. moms får du årligt eftersyn, så varmepumpen bliver ved med at køre effektivt, og din garanti er
          dækket.
        </p>
        <dl className="mt-3 space-y-1.5 text-sm">
          <Row label="Pris efter tilskud" value={krRange(e.netPrice)} />
          <Row label={`Service i ${e.service.years} år`} value={kr(e.service.total)} />
          <Row label={`Strøm i ${e.service.years} år`} value={kr(e.newRunningCost * e.service.years)} />
          <Row label={`Samlet pris over ${e.service.years} år`} value={krRange(e.totalCostOfOwnership)} bold />
        </dl>
      </div>

      {others.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-2 text-sm font-semibold">Til sammenligning</div>
          <dl className="space-y-1.5 text-sm">
            {others.map((o) => (
              <Row key={o.solution} label={solutionTitles[o.solution]} value={`${krRange(o.netPrice)} · spar ${kr(o.annualSaving)}/år`} />
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold, muted, className }: { label: string; value: string; bold?: boolean; muted?: boolean; className?: string }) {
  return (
    <div className={`flex justify-between gap-4 ${bold ? "border-t pt-2 font-bold" : ""} ${muted ? "text-muted-foreground" : ""} ${className ?? ""}`}>
      <dt>{label}</dt>
      <dd className="shrink-0 text-right tabular-nums">{value}</dd>
    </div>
  );
}

function Tile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground [&_svg]:size-4 [&_svg]:text-primary">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

"use client";

import { AlertTriangle, CheckCircle2, Info, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { flowTempLabels, isHeatPump, type Evaluation, type SolutionOption } from "@/lib/engine";
import { eraLabels } from "@/lib/content/labels";
import { num, SIZING_DISCLAIMER } from "@/lib/format";
import { cn } from "@/lib/utils";

function OptionCard({ option, primary }: { option: SolutionOption; primary?: boolean }) {
  const negative = !isHeatPump(option.type);
  return (
    <div className={cn("rounded-xl border-2 bg-card p-5", primary ? (negative ? "border-accent" : "border-primary") : "border-border")}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {primary ? (
          <Badge variant={negative ? "accent" : "default"}>
            <Star className="mr-1 size-3" /> {negative ? "Vores ærlige vurdering" : "Vores anbefaling"}
          </Badge>
        ) : (
          <Badge variant="secondary">Alternativ</Badge>
        )}
        {option.sizeKw && isHeatPump(option.type) && <Badge variant="outline">ca. {option.sizeKw} kW</Badge>}
      </div>
      <h3 className={cn("font-bold leading-tight", primary ? "text-xl" : "text-lg")}>{option.title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{option.summary}</p>
      <div className="mt-4">
        <div className="mb-1.5 text-sm font-semibold">Hvorfor?</div>
        <ul className="space-y-1.5">
          {option.why.map((w) => (
            <li key={w} className="flex gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      </div>
      {option.caveats.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t pt-3">
          {option.caveats.map((c) => (
            <li key={c} className="flex gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RecommendationView({ evaluation }: { evaluation: Evaluation }) {
  const { recommendation: rec } = evaluation;
  const h = rec.heat;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Varmebehov" value={`${num(h.annualKwh)}`} unit="kWh/år" />
        <Stat label="Skønnet størrelse" value={`${h.sizeKw}`} unit="kW" />
        <Stat label="Fremløb" value={flowTempLabels[h.flowTemp].split(" (")[0]} unit={flowTempLabels[h.flowTemp].match(/\((.*)\)/)?.[1] ?? ""} />
      </div>
      <p className="text-xs text-muted-foreground">
        {h.source === "actual"
          ? "Beregnet ud fra dit oplyste forbrug."
          : `Beregnet som areal × ${h.eraFactor} kWh/m² (byggeår ${eraLabels[h.era]}) × isoleringsfaktor ${h.insulationModifier.toLocaleString("da-DK")}${h.hotWaterKwh ? ` + ${num(h.hotWaterKwh)} kWh til varmt vand` : ""}.`}{" "}
        {SIZING_DISCLAIMER}
      </p>
      <OptionCard option={rec.primary} primary />
      {rec.warnings.length > 0 && (
        <div className="space-y-2 rounded-xl border border-accent/30 bg-warning-bg p-4">
          {rec.warnings.map((w) => (
            <p key={w} className="flex gap-2 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent" /> {w}
            </p>
          ))}
        </div>
      )}
      {rec.alternatives.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">{isHeatPump(rec.primary.type) ? "Alternativer" : "Hvis du alligevel vil have en varmepumpe"}</h3>
          {rec.alternatives.map((o) => (
            <OptionCard key={o.type + o.title} option={o} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums leading-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{unit}</div>
    </div>
  );
}

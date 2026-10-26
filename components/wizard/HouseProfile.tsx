"use client";

import { ChevronUp, Home } from "lucide-react";
import { useState } from "react";
import type { AppConfig } from "@/lib/config/defaults";
import { profileRows } from "@/lib/content/profile";
import { computeHeatDemand, flowTempLabels } from "@/lib/engine";
import { num } from "@/lib/format";
import type { Answers } from "@/lib/schema/answers";
import { cn } from "@/lib/utils";

function Body({ a, cfg }: { a: Answers; cfg: AppConfig }) {
  const rows = profileRows(a);
  const heat = a.segment !== "erhverv" && a.areaM2 && a.yearBuilt ? computeHeatDemand(a, cfg) : null;
  const groups = [...new Set(rows.map((r) => r.group))];
  return (
    <div className="space-y-4">
      {heat && (
        <div className="rounded-lg bg-primary p-3 text-primary-foreground">
          <div className="text-xs opacity-80">Beregnet varmebehov</div>
          <div className="text-xl font-bold tabular-nums">{num(heat.annualKwh)} kWh/år</div>
          <div className="mt-1 text-xs opacity-90">
            ≈ {heat.sizeKw} kW varmepumpe{a.emitter && a.emitter !== "elpaneler" ? ` · fremløb ${flowTempLabels[heat.flowTemp]}` : ""}
          </div>
          <div className="mt-1 text-[11px] opacity-70">{heat.source === "actual" ? "Ud fra dit faktiske forbrug" : "Skøn – bliver mere præcist, jo mere du svarer"}</div>
        </div>
      )}
      {rows.length === 0 && <p className="text-sm text-muted-foreground">Din profil udfyldes her, efterhånden som du svarer.</p>}
      {groups.map((g) => (
        <div key={g}>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g}</div>
          <dl className="space-y-1 text-sm">
            {rows
              .filter((r) => r.group === g)
              .map((r) => (
                <div key={r.label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd className="text-right font-medium">{r.value}</dd>
                </div>
              ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

/** Desktop: sticky sidebar. */
export function HouseProfileSidebar({ a, cfg }: { a: Answers; cfg: AppConfig }) {
  return (
    <aside className="sticky top-4 hidden rounded-xl border bg-card p-5 shadow-sm lg:block" aria-label="Dit hus-profil">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <Home className="size-5 text-primary" /> {a.segment === "erhverv" ? "Din profil" : "Dit hus-profil"}
      </h2>
      <Body a={a} cfg={cfg} />
    </aside>
  );
}

/** Mobile: collapsible bar pinned to the bottom of the screen. */
export function HouseProfileMobile({ a, cfg }: { a: Answers; cfg: AppConfig }) {
  const [open, setOpen] = useState(false);
  const count = profileRows(a).length;
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
      <div className={cn("mx-auto max-w-2xl rounded-t-2xl border border-b-0 bg-card shadow-[0_-8px_24px_rgba(0,0,0,0.08)]")}>
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold">
          <Home className="size-4 text-primary" />
          {a.segment === "erhverv" ? "Din profil" : "Dit hus-profil"}
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{count}</span>
          <ChevronUp className={cn("ml-auto size-4 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="max-h-[60vh] overflow-y-auto px-4 pb-6">
            <Body a={a} cfg={cfg} />
          </div>
        )}
      </div>
    </div>
  );
}

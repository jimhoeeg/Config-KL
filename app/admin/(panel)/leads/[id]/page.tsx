import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { label } from "@/lib/content/labels";
import { profileRows } from "@/lib/content/profile";
import { tierDescriptions, type Tier } from "@/lib/engine/scoring";
import { answersSchema } from "@/lib/schema/answers";
import { getSupabase } from "@/lib/supabase/server";
import { NoDb } from "../../../NoDb";
import { LeadForm } from "./LeadForm";

export default function LeadPage({ params }: PageProps<"/admin/leads/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Henter lead…</p>}>
      <Lead params={params} />
    </Suspense>
  );
}

type Line = { label: string; points: number };

async function Lead({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = getSupabase();
  if (!db) return <NoDb />;
  const { data: l } = await db.from("leads").select("*, lead_profiles(raw), lead_scores(*), recommendations(*)").eq("id", id).maybeSingle();
  if (!l) notFound();

  const answers = answersSchema.safeParse(l.lead_profiles?.raw);
  const score = l.lead_scores as { total: number; tier: Tier; breakdown: Record<string, Line[]>; model_version: string } | null;
  const rec = l.recommendations as {
    primary_solution: { title?: string; why?: string[] };
    alternatives: { title: string }[];
    heat_demand_kwh: number | null;
    size_kw: number | null;
    price_low: number | null;
    price_high: number | null;
    net_low: number | null;
    net_high: number | null;
    saving_per_year: number | null;
    payback_low: number | null;
    payback_high: number | null;
    talking_points: string[] | null;
  } | null;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{l.name}</h1>
          {score && (
            <Badge variant={score.tier} className="text-sm">
              Tier {score.tier} · {score.total}/100
            </Badge>
          )}
          {l.flags?.map((f: string) => (
            <Badge key={f} variant="outline">
              ⚠ {f}
            </Badge>
          ))}
        </div>
        {score && <p className="-mt-4 text-sm text-muted-foreground">{tierDescriptions[score.tier]}</p>}

        <Section title="Samtalepunkter">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {(rec?.talking_points ?? []).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Section>

        {rec?.primary_solution?.title && (
          <Section title="Anbefaling">
            <p className="font-semibold">{rec.primary_solution.title}</p>
            {rec.alternatives?.length > 0 && <p className="text-sm text-muted-foreground">Alternativer: {rec.alternatives.map((a) => a.title).join(", ")}</p>}
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <KV k="Varmebehov" v={rec.heat_demand_kwh ? `${rec.heat_demand_kwh.toLocaleString("da-DK")} kWh/år` : "–"} />
              <KV k="Størrelse" v={rec.size_kw ? `ca. ${rec.size_kw} kW` : "–"} />
              <KV k="Pris" v={rec.price_low ? `${rec.price_low.toLocaleString("da-DK")}–${rec.price_high?.toLocaleString("da-DK")} kr.` : "–"} />
              <KV k="Efter tilskud" v={rec.net_low != null ? `${rec.net_low.toLocaleString("da-DK")}–${rec.net_high?.toLocaleString("da-DK")} kr.` : "–"} />
              <KV k="Besparelse" v={rec.saving_per_year != null ? `${rec.saving_per_year.toLocaleString("da-DK")} kr./år` : "–"} />
              <KV k="Tilbagebetaling" v={rec.payback_low != null ? `${rec.payback_low}–${rec.payback_high} år` : "–"} />
            </dl>
          </Section>
        )}

        {answers.success && (
          <Section title={l.segment === "erhverv" ? "Virksomhedsprofil" : "Husprofil"}>
            <dl className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
              {profileRows(answers.data).map((r) => (
                <KV key={r.label} k={r.label} v={r.value} />
              ))}
            </dl>
          </Section>
        )}

        {score && (
          <Section title={`Scoreopdeling (model ${score.model_version})`}>
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(score.breakdown).map(([group, lines]) => (
                <div key={group}>
                  <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                    {group} · {lines.reduce((s, x) => s + x.points, 0)}
                  </div>
                  {lines.map((x) => (
                    <div key={x.label} className="flex justify-between gap-2 text-sm">
                      <span>{x.label}</span>
                      <span className="tabular-nums">{x.points}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      <aside className="space-y-4">
        <Section title="Kontakt">
          <dl className="space-y-1 text-sm">
            <KV k="Telefon" v={l.phone ? <a href={`tel:${l.phone}`} className="text-primary underline">{l.phone}</a> : "–"} />
            <KV k="E-mail" v={<a href={`mailto:${l.email}`} className="text-primary underline">{l.email}</a>} />
            <KV k="Foretrækker" v={label("contactPreference", l.contact_preference)} />
            <KV k="Besigtigelse" v={l.wants_inspection ? `Ja${l.preferred_date ? ` – ${l.preferred_date}` : ""}` : "Nej"} />
            <KV k="Tidshorisont" v={l.segment === "erhverv" ? label("businessUrgency", l.timeline) : label("timeline", l.timeline)} />
            <KV k="Service-interesse" v={l.wants_service ? "Ja" : "Nej"} />
            <KV k="Markedsføring" v={l.marketing_consent ? "Samtykke givet" : "Nej"} />
            <KV k="Oprettet" v={new Date(l.created_at).toLocaleString("da-DK")} />
          </dl>
          {l.message && <p className="mt-3 rounded-lg bg-muted p-3 text-sm">{l.message}</p>}
          {l.segment !== "erhverv" && (
            <a href={`${site}/rapport/${l.report_token}`} target="_blank" rel="noopener" className="mt-3 inline-block text-sm text-primary underline">
              Åbn kundens rapport
            </a>
          )}
        </Section>
        <Section title="Status og noter">
          <LeadForm id={l.id} status={l.status} notes={l.notes ?? ""} />
        </Section>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

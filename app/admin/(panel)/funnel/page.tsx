import { Suspense } from "react";
import { knowledgeCards } from "@/lib/content/knowledgeCards";
import { getSupabase } from "@/lib/supabase/server";
import { businessFlow, homeFlow, type StepMeta } from "@/lib/wizard/flow";
import { NoDb } from "../../NoDb";

const PERIODS = { "7": "7 dage", "30": "30 dage", "90": "90 dage" } as const;

export default function FunnelPage({ searchParams }: PageProps<"/admin/funnel">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Henter…</p>}>
      <Funnel searchParams={searchParams} />
    </Suspense>
  );
}

function sinceIso(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

type SessionRow = { max_step: number; segment: string | null; completed_at: string | null; embedded: boolean };

async function Funnel({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const days = typeof sp.days === "string" && sp.days in PERIODS ? sp.days : "30";
  const db = getSupabase();
  if (!db) return <NoDb />;
  const since = sinceIso(Number(days));
  const [{ data: sessions }, { data: cardEvents }] = await Promise.all([
    db.from("sessions").select("max_step, segment, completed_at, embedded").gte("started_at", since).limit(50000),
    db.from("events").select("payload").eq("type", "card_open").gte("created_at", since).limit(50000),
  ]);
  const rows = (sessions ?? []) as SessionRow[];
  const home = rows.filter((r) => r.segment !== "erhverv");
  const business = rows.filter((r) => r.segment === "erhverv");
  const cardCounts = new Map<string, number>();
  for (const e of cardEvents ?? []) {
    const slug = (e.payload as { card?: string } | null)?.card;
    if (slug) cardCounts.set(slug, (cardCounts.get(slug) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-4">
        <h1 className="text-2xl font-bold">Funnel</h1>
        <div className="flex gap-3 text-sm">
          {Object.entries(PERIODS).map(([d, l]) => (
            <a key={d} href={`/admin/funnel?days=${d}`} className={d === days ? "font-bold underline" : "text-primary"}>
              {l}
            </a>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {rows.length} sessioner · {rows.filter((r) => r.embedded).length} via embed
        </span>
      </div>
      <FunnelTable title="Privat og sommerhus" flow={homeFlow} rows={home} />
      <FunnelTable title="Erhverv" flow={businessFlow} rows={business} />
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 font-semibold">Åbnede videnskort</h2>
        <table className="w-full text-sm">
          <tbody>
            {[...cardCounts.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([slug, n]) => (
                <tr key={slug} className="border-t">
                  <td className="py-1.5">{knowledgeCards.find((c) => c.slug === slug)?.title ?? slug}</td>
                  <td className="py-1.5 text-right tabular-nums">{n}</td>
                </tr>
              ))}
            {cardCounts.size === 0 && (
              <tr>
                <td className="text-muted-foreground">Ingen endnu.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function FunnelTable({ title, flow, rows }: { title: string; flow: StepMeta[]; rows: SessionRow[] }) {
  const total = rows.length;
  const completed = rows.filter((r) => r.completed_at).length;
  const reached = flow.map((_, i) => rows.filter((r) => r.max_step >= i).length);
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="mb-3 font-semibold">
        {title} <span className="font-normal text-muted-foreground">· {total} sessioner · {completed} leads ({total ? Math.round((completed / total) * 100) : 0} %)</span>
      </h2>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="py-1">Trin</th>
            <th className="py-1">Nået</th>
            <th className="w-1/2 py-1" />
            <th className="py-1 text-right">Frafald her</th>
          </tr>
        </thead>
        <tbody>
          {flow.map((s, i) => {
            const n = reached[i];
            const next = i < flow.length - 1 ? reached[i + 1] : completed;
            const drop = n - next;
            return (
              <tr key={s.id} className="border-t">
                <td className="py-1.5">
                  {i}. {s.title}
                </td>
                <td className="py-1.5 tabular-nums">{n}</td>
                <td className="py-1.5">
                  <div className="h-3 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
                  </div>
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {drop} {n ? `(${Math.round((drop / n) * 100)} %)` : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { label, labels } from "@/lib/content/labels";
import { getSupabase } from "@/lib/supabase/server";
import { NoDb } from "../NoDb";

const tiers = ["A", "B", "C", "D"] as const;
type LeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  segment: string;
  status: string;
  wants_inspection: boolean;
  timeline: string | null;
  flags: string[];
  created_at: string;
  lead_scores: { total: number; tier: (typeof tiers)[number] } | null;
  lead_profiles: { postal_code: string | null; city: string | null; heating_current: string | null } | null;
  recommendations: { primary_solution: { title?: string } | null; price_low: number | null; price_high: number | null } | null;
};

export default function LeadsPage({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Henter leads…</p>}>
      <Leads searchParams={searchParams} />
    </Suspense>
  );
}

async function Leads({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const tier = typeof sp.tier === "string" && (tiers as readonly string[]).includes(sp.tier) ? sp.tier : undefined;
  const status = typeof sp.status === "string" && sp.status in labels.leadStatus ? sp.status : undefined;
  const db = getSupabase();
  if (!db) return <NoDb />;

  let q = db
    .from("leads")
    .select(
      `id, name, email, phone, segment, status, wants_inspection, timeline, flags, created_at,
       lead_scores${tier ? "!inner" : ""}(total, tier),
       lead_profiles(postal_code, city, heating_current),
       recommendations(primary_solution, price_low, price_high)`,
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (tier) q = q.eq("lead_scores.tier", tier);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return <p className="text-destructive">{error.message}</p>;
  const leads = (data ?? []) as unknown as LeadRow[];

  const filterLink = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { tier, status, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    return `/admin${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">Tier:</span>
        <Link href={filterLink({ tier: undefined })} className={!tier ? "font-bold underline" : ""}>
          Alle
        </Link>
        {tiers.map((t) => (
          <Link key={t} href={filterLink({ tier: t })}>
            <Badge variant={t} className={tier === t ? "ring-2 ring-foreground" : ""}>
              {t}
            </Badge>
          </Link>
        ))}
        <span className="ml-4 font-semibold">Status:</span>
        <Link href={filterLink({ status: undefined })} className={!status ? "font-bold underline" : ""}>
          Alle
        </Link>
        {Object.entries(labels.leadStatus).map(([v, l]) => (
          <Link key={v} href={filterLink({ status: v })} className={status === v ? "font-bold underline" : ""}>
            {l}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Tier</th>
              <th className="p-3">Navn</th>
              <th className="p-3">Område</th>
              <th className="p-3">Opvarmning</th>
              <th className="p-3">Anbefaling</th>
              <th className="p-3">Pris</th>
              <th className="p-3">Tidshorisont</th>
              <th className="p-3">Status</th>
              <th className="p-3">Oprettet</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-t hover:bg-muted/50">
                <td className="p-3">
                  {l.lead_scores && (
                    <Badge variant={l.lead_scores.tier}>
                      {l.lead_scores.tier} · {l.lead_scores.total}
                    </Badge>
                  )}
                </td>
                <td className="p-3">
                  <Link href={`/admin/leads/${l.id}`} className="font-semibold text-primary hover:underline">
                    {l.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {l.segment === "erhverv" ? "Erhverv · " : l.segment === "sommerhus" ? "Sommerhus · " : ""}
                    {l.wants_inspection ? "Ønsker besigtigelse" : "Kun rapport"}
                    {l.flags.length > 0 && ` · ⚠ ${l.flags.join(", ")}`}
                  </div>
                </td>
                <td className="p-3">
                  {l.lead_profiles?.postal_code} {l.lead_profiles?.city}
                </td>
                <td className="p-3">{label("heating", l.lead_profiles?.heating_current)}</td>
                <td className="p-3">{l.recommendations?.primary_solution?.title ?? "–"}</td>
                <td className="whitespace-nowrap p-3 tabular-nums">
                  {l.recommendations?.price_low ? `${l.recommendations.price_low.toLocaleString("da-DK")}–${l.recommendations.price_high?.toLocaleString("da-DK")}` : "–"}
                </td>
                <td className="p-3">{l.segment === "erhverv" ? label("businessUrgency", l.timeline) : label("timeline", l.timeline)}</td>
                <td className="p-3">{label("leadStatus", l.status)}</td>
                <td className="whitespace-nowrap p-3 text-muted-foreground">{new Date(l.created_at).toLocaleString("da-DK", { dateStyle: "short", timeStyle: "short" })}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted-foreground">
                  Ingen leads matcher filteret.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

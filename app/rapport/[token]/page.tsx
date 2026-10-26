import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EconomyView } from "@/components/result/Economy";
import { PrintButton } from "@/components/result/PrintButton";
import { RecommendationView } from "@/components/result/Recommendation";
import { mergeConfig } from "@/lib/config/defaults";
import { profileRows } from "@/lib/content/profile";
import { evaluate, headlineEconomy } from "@/lib/engine";
import { answersSchema } from "@/lib/schema/answers";
import { getSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Din varmepumperapport – KL Køleteknik", robots: { index: false } };

export default function ReportPage({ params }: PageProps<"/rapport/[token]">) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Suspense fallback={<p className="text-muted-foreground">Henter din rapport…</p>}>
        <Report params={params} />
      </Suspense>
    </main>
  );
}

async function Report({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{36}$/.test(token)) notFound();
  const db = getSupabase();
  if (!db) notFound();
  const { data: lead } = await db
    .from("leads")
    .select("id, name, created_at, segment, lead_profiles(raw), recommendations(config_snapshot)")
    .eq("report_token", token)
    .maybeSingle();
  if (!lead) notFound();

  const profile = Array.isArray(lead.lead_profiles) ? lead.lead_profiles[0] : lead.lead_profiles;
  const recRow = Array.isArray(lead.recommendations) ? lead.recommendations[0] : lead.recommendations;
  const answers = answersSchema.safeParse(profile?.raw);
  if (!answers.success || lead.segment === "erhverv") notFound();

  // Re-evaluate with the config snapshot stored at submission, so the report never changes afterwards.
  const cfg = mergeConfig((recRow?.config_snapshot as Record<string, unknown>) ?? {});
  const evaluation = evaluate(answers.data, cfg);
  const economy = headlineEconomy(evaluation);
  const rows = profileRows(answers.data);
  const date = new Date(lead.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });

  return (
    <article className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
        <div>
          <div className="text-sm font-bold text-primary">KL Køleteknik · Varmepumperådgiveren</div>
          <h1 className="mt-1 text-2xl font-bold">Varmepumperapport for {lead.name}</h1>
          <p className="text-sm text-muted-foreground">
            {answers.data.address?.text} · {date}
          </p>
        </div>
        <PrintButton />
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Dit hus-profil</h2>
        <dl className="grid gap-x-8 gap-y-1.5 rounded-xl border bg-card p-5 text-sm sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-3 border-b border-dashed py-1 last:border-0">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="text-right font-medium">{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Anbefaling</h2>
        <RecommendationView evaluation={evaluation} />
      </section>

      {economy && (
        <section className="space-y-3 break-before-page">
          <h2 className="text-lg font-bold">Økonomi</h2>
          <EconomyView evaluation={evaluation} economy={economy} />
        </section>
      )}

      <footer className="border-t pt-6 text-sm text-muted-foreground">
        Rapporten er vejledende og baseret på dine egne oplysninger. Den endelige løsning og pris afhænger af en besigtigelse. KL Køleteknik · VE-godkendt ·
        Medlem af AKB og KMO · Dansk Køl og Varme Garantiordning.
      </footer>
    </article>
  );
}

import { connection } from "next/server";
import { Suspense } from "react";
import { getSupabase } from "@/lib/supabase/server";
import { NoDb } from "../../NoDb";
import { CardForm } from "./CardForm";

export default function CardsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Videnskort</h1>
        <p className="text-sm text-muted-foreground">
          Teksten skrives i Markdown (**fed**, lister med -, tabeller med |). Trin 0 = forsiden, 1 = Huset … 7 = Økonomi. Ikoner: heat-pump, house, gauge, factory, shield,
          thermometer, volume, layers, ruler, alert, wrench, clipboard, badge.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Henter…</p>}>
        <Cards />
      </Suspense>
    </div>
  );
}

async function Cards() {
  await connection();
  const db = getSupabase();
  if (!db) return <NoDb />;
  const { data } = await db.from("knowledge_cards").select("slug, step, title, body_md, illustration, sort_order, published").order("step").order("sort_order");
  return (
    <div className="space-y-3">
      {(data ?? []).map((c) => (
        <CardForm key={c.slug} card={c} />
      ))}
      <details className="rounded-xl border bg-card p-4">
        <summary className="cursor-pointer font-semibold">+ Nyt videnskort</summary>
        <div className="mt-3">
          <CardForm card={{ slug: "", step: 1, title: "", body_md: "", illustration: "", sort_order: 10, published: true }} isNew />
        </div>
      </details>
    </div>
  );
}

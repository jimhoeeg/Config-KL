import { connection } from "next/server";
import { Suspense } from "react";
import { flattenSection, sectionTitles } from "@/lib/admin/configForm";
import { configSections, mergeConfig } from "@/lib/config/defaults";
import { getSupabase } from "@/lib/supabase/server";
import { NoDb } from "../../NoDb";
import { ConfigSectionForm } from "./ConfigSectionForm";

export default function ConfigPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Priser og faktorer</h1>
        <p className="text-sm text-muted-foreground">
          Ændringer gælder for nye beregninger (inden for et minut). Allerede sendte rapporter bruger de værdier, der gjaldt, da de blev lavet. Lister (fx postnummerintervaller)
          redigeres som JSON.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Henter…</p>}>
        <Sections />
      </Suspense>
    </div>
  );
}

async function Sections() {
  await connection();
  const db = getSupabase();
  if (!db) return <NoDb />;
  const { data } = await db.from("config").select("key, value, updated_at");
  const cfg = mergeConfig(Object.fromEntries((data ?? []).map((r) => [r.key, r.value])));
  const updated = Object.fromEntries((data ?? []).map((r) => [r.key, r.updated_at as string]));
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {configSections.map((s) => (
        <ConfigSectionForm key={s} section={s} title={sectionTitles[s]} fields={flattenSection(cfg[s])} updatedAt={updated[s]} />
      ))}
    </div>
  );
}

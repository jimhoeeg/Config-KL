"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Textarea } from "@/components/ui/input";
import type { ConfigField } from "@/lib/admin/configForm";
import { resetConfig, updateConfig } from "../../actions";

export function ConfigSectionForm({ section, title, fields, updatedAt }: { section: string; title: string; fields: ConfigField[]; updatedAt?: string }) {
  const [state, action, pending] = useActionState(updateConfig, undefined);
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">{updatedAt ? `Ændret ${new Date(updatedAt).toLocaleDateString("da-DK")}` : "Standardværdier"}</span>
      </div>
      <form action={action} className="space-y-2">
        <input type="hidden" name="section" value={section} />
        {fields.map((f) => (
          <label key={f.path} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm sm:grid-cols-[1fr_200px]">
            <span className="font-mono text-xs text-muted-foreground">{f.path}</span>
            {f.kind === "boolean" ? (
              <Checkbox name={`f:${f.path}`} defaultChecked={f.value === "true"} />
            ) : f.kind === "json" ? (
              <Textarea name={`f:${f.path}`} defaultValue={f.value} className="col-span-2 min-h-16 font-mono text-xs" />
            ) : (
              <Input name={`f:${f.path}`} defaultValue={f.value} inputMode={f.kind === "number" ? "decimal" : undefined} className="h-9 text-sm" />
            )}
          </label>
        ))}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" size="sm" disabled={pending}>
            Gem
          </Button>
          <Button type="submit" size="sm" variant="ghost" formAction={resetConfig}>
            Nulstil til standard
          </Button>
          {state?.message && <span className="text-sm text-success">{state.message}</span>}
        </div>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      </form>
    </section>
  );
}

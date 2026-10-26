"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, Textarea } from "@/components/ui/input";
import { saveCard } from "../../actions";

interface Card {
  slug: string;
  step: number;
  title: string;
  body_md: string;
  illustration: string | null;
  sort_order: number;
  published: boolean;
}

export function CardForm({ card, isNew }: { card: Card; isNew?: boolean }) {
  const [state, action, pending] = useActionState(saveCard, undefined);
  const form = (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_80px_80px]">
        <div className="space-y-1">
          <Label>Titel</Label>
          <Input name="title" defaultValue={card.title} required />
        </div>
        <div className="space-y-1">
          <Label>Slug</Label>
          <Input name="slug" defaultValue={card.slug} readOnly={!isNew} required />
        </div>
        <div className="space-y-1">
          <Label>Trin</Label>
          <Input name="step" type="number" min={0} max={7} defaultValue={card.step} />
        </div>
        <div className="space-y-1">
          <Label>Rækkefølge</Label>
          <Input name="sort_order" type="number" min={0} defaultValue={card.sort_order} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Tekst (Markdown)</Label>
        <Textarea name="body_md" defaultValue={card.body_md} className="min-h-56 font-mono text-sm" />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label>Ikon</Label>
          <Input name="illustration" defaultValue={card.illustration ?? ""} className="h-9 w-36" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="published" defaultChecked={card.published} /> Publiceret
        </label>
        <Button type="submit" size="sm" disabled={pending}>
          Gem
        </Button>
        {state?.message && <span className="text-sm text-success">{state.message}</span>}
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
  if (isNew) return form;
  return (
    <details className="rounded-xl border bg-card p-4">
      <summary className="cursor-pointer">
        <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-xs">Trin {card.step}</span>
        <span className="font-semibold">{card.title}</span>
        {!card.published && <span className="ml-2 text-xs text-muted-foreground">(skjult)</span>}
      </summary>
      <div className="mt-3">{form}</div>
    </details>
  );
}

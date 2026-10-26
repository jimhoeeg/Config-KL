"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { labels } from "@/lib/content/labels";
import { updateLead } from "../../../actions";

export function LeadForm({ id, status, notes }: { id: string; status: string; notes: string }) {
  const [state, action, pending] = useActionState(updateLead, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div className="space-y-1.5">
        <Label htmlFor="status">Status</Label>
        <select id="status" name="status" defaultValue={status} className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm">
          {Object.entries(labels.leadStatus).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Interne noter</Label>
        <Textarea id="notes" name="notes" defaultValue={notes} />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        Gem
      </Button>
      {state?.message && <span className="ml-3 text-sm text-success">{state.message}</span>}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

"use client";

import { CalendarCheck, Loader2, Mail } from "lucide-react";
import { useState, useTransition } from "react";
import { submitLead, type SubmitResult } from "@/app/actions/lead";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, Textarea } from "@/components/ui/input";
import { labels } from "@/lib/content/labels";
import { isValidDanishPhone } from "@/lib/engine/scoring";
import type { Answers, ContactInput, Engagement } from "@/lib/schema/answers";
import { cn } from "@/lib/utils";

type Mode = "rapport" | "besigtigelse";

export function ContactForm({
  answers,
  sessionId,
  engagement,
  business,
  onDone,
  onCta,
}: {
  answers: Answers;
  sessionId: string | undefined;
  engagement: () => Engagement;
  business?: boolean;
  onDone: (result: Extract<SubmitResult, { ok: true }>, wantsInspection: boolean) => void;
  onCta?: (mode: Mode) => void;
}) {
  const [mode, setMode] = useState<Mode>(business ? "besigtigelse" : "rapport");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    preferredDate: "",
    contactPreference: "telefon" as NonNullable<ContactInput["contactPreference"]>,
    message: "",
    contactConsent: false,
    marketingConsent: false,
    website: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const wantsInspection = business || mode === "besigtigelse";
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (form.name.trim().length < 2) local.name = "Skriv dit navn";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) local.email = "Skriv en gyldig e-mail";
    if (wantsInspection && !isValidDanishPhone(form.phone)) local.phone = "Skriv et gyldigt dansk telefonnummer, så vi kan aftale tid";
    if (!form.contactConsent) local.contactConsent = "Du skal give samtykke, før vi må kontakte dig";
    setErrors(local);
    if (Object.keys(local).length) return;

    startTransition(async () => {
      setFormError(null);
      const { website, ...contact } = form;
      const res = await submitLead({
        sessionId,
        answers,
        website,
        engagement: engagement(),
        contact: { ...contact, contactConsent: true, wantsInspection },
      });
      if (res.ok) onDone(res, wantsInspection);
      else {
        setFormError(res.error);
        if (res.fieldErrors) setErrors(res.fieldErrors);
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-xl border bg-card p-5 shadow-sm">
      {!business && (
        <div className="grid grid-cols-2 gap-2" role="tablist">
          {(
            [
              ["rapport", "Få din personlige varmepumperapport", <Mail key="m" />],
              ["besigtigelse", "Book gratis besigtigelse", <CalendarCheck key="c" />],
            ] as const
          ).map(([m, text, icon]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                onCta?.(m);
              }}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center text-sm font-semibold leading-tight transition-all [&_svg]:size-5",
                mode === m ? (m === "besigtigelse" ? "border-accent bg-warning-bg" : "border-primary bg-secondary") : "border-border",
              )}
            >
              {icon}
              {text}
            </button>
          ))}
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        {business
          ? "Vi kontakter dig personligt – typisk inden for én arbejdsdag."
          : mode === "rapport"
            ? "Vi sender rapporten med dit husprofil, anbefalingen og prisintervallet til din e-mail."
            : "Gratis og uforpligtende. En montør kommer ud og ser på huset – du får en fast pris bagefter."}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="Navn" error={errors.name}>
          <Input id="name" autoComplete="name" value={form.name} aria-invalid={!!errors.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field id="email" label="E-mail" error={errors.email}>
          <Input id="email" type="email" autoComplete="email" value={form.email} aria-invalid={!!errors.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>
        <Field id="phone" label={wantsInspection ? "Telefon" : "Telefon (valgfrit)"} error={errors.phone}>
          <Input id="phone" type="tel" autoComplete="tel" inputMode="tel" value={form.phone} aria-invalid={!!errors.phone} onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        {wantsInspection && (
          <Field id="date" label="Ønsket dato (valgfrit)">
            <Input id="date" type="date" min={new Date().toISOString().slice(0, 10)} value={form.preferredDate} onChange={(e) => set({ preferredDate: e.target.value })} />
          </Field>
        )}
      </div>
      {wantsInspection && (
        <div className="space-y-2">
          <Label>Hvordan vil du helst kontaktes?</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(labels.contactPreference).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => set({ contactPreference: v as typeof form.contactPreference })}
                className={cn("rounded-full border-2 px-4 py-1.5 text-sm font-medium", form.contactPreference === v ? "border-primary bg-secondary" : "border-border")}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}
      <Field id="message" label="Noget vi skal vide? (valgfrit)">
        <Textarea id="message" value={form.message} onChange={(e) => set({ message: e.target.value })} />
      </Field>

      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={form.website} onChange={(e) => set({ website: e.target.value })} />

      <div className="space-y-3">
        <label className="flex gap-3 text-sm">
          <Checkbox checked={form.contactConsent} onChange={(e) => set({ contactConsent: e.target.checked })} aria-invalid={!!errors.contactConsent} />
          <span>
            Ja, KL Køleteknik må bruge mine oplysninger til at sende rapporten og kontakte mig om min henvendelse. <span className="text-destructive">*</span>
          </span>
        </label>
        {errors.contactConsent && <p className="text-sm text-destructive">{errors.contactConsent}</p>}
        <label className="flex gap-3 text-sm text-muted-foreground">
          <Checkbox checked={form.marketingConsent} onChange={(e) => set({ marketingConsent: e.target.checked })} />
          <span>Ja tak, send mig gerne gode råd og tilbud om varmepumper og service på e-mail. Jeg kan altid framelde mig igen.</span>
        </label>
      </div>

      {formError && <p className="rounded-lg bg-red-50 p-3 text-sm text-destructive">{formError}</p>}
      <Button type="submit" variant={wantsInspection ? "accent" : "default"} size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {business ? "Send henvendelse" : mode === "rapport" ? "Send mig rapporten" : "Book gratis besigtigelse"}
      </Button>
    </form>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

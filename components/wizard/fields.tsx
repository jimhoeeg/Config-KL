"use client";

import { Check, Minus, Plus } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

export function Question({ title, hint, children, id }: { title: string; hint?: string; children: React.ReactNode; id?: string }) {
  return (
    <fieldset className="space-y-3" aria-describedby={hint ? `${id}-hint` : undefined}>
      <legend className="text-base font-semibold">{title}</legend>
      {hint && (
        <p id={`${id}-hint`} className="-mt-1 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {children}
    </fieldset>
  );
}

/** Large, tappable single-choice cards (mobile-first). */
export function ChoiceGroup<T extends string>({
  name,
  options,
  value,
  onChange,
  columns = 2,
}: {
  name: string;
  options: ChoiceOption<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div
      role="radiogroup"
      className={cn("grid gap-2.5", columns === 1 && "grid-cols-1", columns === 2 && "grid-cols-2", columns === 3 && "grid-cols-2 sm:grid-cols-3")}
    >
      {options.map((o) => (
        <ChoiceTile key={o.value} name={name} option={o} selected={value === o.value} onSelect={() => onChange(o.value)} kind="radio" />
      ))}
    </div>
  );
}

export function MultiChoice<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: ChoiceOption<T>[];
  value: T[] | undefined;
  onChange: (v: T[]) => void;
}) {
  const selected = value ?? [];
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {options.map((o) => (
        <ChoiceTile
          key={o.value}
          name={name}
          option={o}
          kind="checkbox"
          selected={selected.includes(o.value)}
          onSelect={() => onChange(selected.includes(o.value) ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
        />
      ))}
    </div>
  );
}

function ChoiceTile<T extends string>({
  option,
  selected,
  onSelect,
  kind,
}: {
  name: string;
  option: ChoiceOption<T>;
  selected: boolean;
  onSelect: () => void;
  kind: "radio" | "checkbox";
}) {
  return (
    <button
      type="button"
      role={kind}
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "relative flex min-h-16 w-full items-start gap-3 rounded-xl border-2 bg-card p-3 text-left transition-all active:scale-[0.98]",
        selected ? "border-primary bg-secondary shadow-sm" : "border-border hover:border-primary/40",
      )}
    >
      {option.icon && <span className={cn("mt-0.5 shrink-0 [&_svg]:size-6", selected ? "text-primary" : "text-muted-foreground")}>{option.icon}</span>}
      <span className="min-w-0 flex-1 pr-5">
        <span className="block text-sm font-semibold leading-snug">{option.label}</span>
        {option.description && <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{option.description}</span>}
      </span>
      {selected && (
        <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3.5" />
        </span>
      )}
    </button>
  );
}

export function NumberField({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  placeholder,
}: {
  id: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  placeholder?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        aria-label="Mindre"
        onClick={() => onChange(clamp((value ?? min + step) - step))}
        className="flex w-11 shrink-0 items-center justify-center rounded-lg border border-input bg-card hover:bg-muted"
      >
        <Minus className="size-4" />
      </button>
      <div className="relative flex-1">
        <input
          id={id}
          inputMode="numeric"
          type="number"
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          onBlur={() => value !== undefined && onChange(clamp(value))}
          className="h-11 w-full rounded-lg border border-input bg-card px-3 pr-12 text-center text-base font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>}
      </div>
      <button
        type="button"
        aria-label="Større"
        onClick={() => onChange(clamp((value ?? min - step) + step))}
        className="flex w-11 shrink-0 items-center justify-center rounded-lg border border-input bg-card hover:bg-muted"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean | undefined; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label={label}>
      {[
        { v: true, l: "Ja" },
        { v: false, l: "Nej" },
      ].map((o) => (
        <button
          key={o.l}
          type="button"
          role="radio"
          aria-checked={checked === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "h-12 rounded-xl border-2 bg-card text-sm font-semibold transition-all",
            checked === o.v ? "border-primary bg-secondary" : "border-border hover:border-primary/40",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

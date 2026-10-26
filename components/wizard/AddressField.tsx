"use client";

import { Loader2, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input, Label } from "@/components/ui/input";
import type { Answers } from "@/lib/schema/answers";

interface Suggestion {
  text: string;
  id: string;
  accessId: string;
  postalCode: string;
  city: string;
}

export interface BbrPrefill {
  areaM2?: number;
  yearBuilt?: number;
  heating?: Answers["heating"];
}

/**
 * Address autocomplete via /api/adresse. If the lookup service is down, the user
 * can still type the address and postal code manually.
 */
export function AddressField({
  value,
  onChange,
  onBbr,
}: {
  value: Answers["address"];
  onChange: (v: Answers["address"]) => void;
  onBbr: (data: BbrPrefill) => void;
}) {
  const [query, setQuery] = useState(value?.text ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const selectedText = useRef(value?.text);

  useEffect(() => {
    if (query.length < 3 || query === selectedText.current) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/adresse?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        const data = (await res.json()) as Suggestion[];
        setSuggestions(data);
        setOpen(true);
        setActive(-1);
      } catch {
        // aborted or offline – manual entry still works
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  async function select(s: Suggestion) {
    selectedText.current = s.text;
    setQuery(s.text);
    setOpen(false);
    onChange({ text: s.text, id: s.id, postalCode: s.postalCode, city: s.city });
    try {
      const res = await fetch(`/api/bbr?accessId=${s.accessId}`);
      if (res.status === 200) onBbr((await res.json()) as BbrPrefill);
    } catch {
      // BBR is optional
    }
  }

  const postalFromText = (text: string) => text.match(/\b(\d{4})\b/)?.[1];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Label htmlFor="address">Adresse</Label>
        <div className="relative mt-1.5">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="address"
            autoComplete="street-address"
            placeholder="Begynd at skrive din adresse…"
            className="pl-9 pr-9"
            value={query}
            role="combobox"
            aria-expanded={open}
            aria-controls="address-listbox"
            aria-autocomplete="list"
            onChange={(e) => {
              setQuery(e.target.value);
              selectedText.current = undefined;
              const postalCode = postalFromText(e.target.value) ?? value?.postalCode;
              onChange({ text: e.target.value, postalCode });
            }}
            onKeyDown={(e) => {
              if (!open || !suggestions.length) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(suggestions.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter" && active >= 0) {
                e.preventDefault();
                select(suggestions[active]);
              } else if (e.key === "Escape") setOpen(false);
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {loading && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        {open && suggestions.length > 0 && (
          <ul id="address-listbox" role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border bg-card shadow-lg">
            {suggestions.map((s, i) => (
              <li
                key={s.id}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(s);
                }}
                className={`cursor-pointer px-3 py-2.5 text-sm ${i === active ? "bg-secondary" : "hover:bg-muted"}`}
              >
                {s.text}
              </li>
            ))}
          </ul>
        )}
      </div>
      {!value?.id && query.length >= 3 && (
        <div className="max-w-40">
          <Label htmlFor="postal">Postnummer</Label>
          <Input
            id="postal"
            inputMode="numeric"
            maxLength={4}
            className="mt-1.5"
            value={value?.postalCode ?? ""}
            onChange={(e) => onChange({ text: query, postalCode: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          />
        </div>
      )}
    </div>
  );
}

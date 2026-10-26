"use client";

import { ChevronDown } from "lucide-react";
import { Markdown } from "@/components/knowledge/KnowledgeCard";
import type { FaqItem } from "@/lib/content/knowledgeCards";

export function Faq({ items }: { items: FaqItem[] }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="faq-heading" className="space-y-3">
      <h2 id="faq-heading" className="text-lg font-bold">
        Ofte stillede spørgsmål
      </h2>
      <div className="divide-y rounded-xl border bg-card">
        {items.map((f) => (
          <details key={f.question} className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
              {f.question}
              <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-2 text-muted-foreground">
              <Markdown>{f.answer_md}</Markdown>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

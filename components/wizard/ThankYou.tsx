"use client";

import { CheckCircle2, FileText, RotateCcw } from "lucide-react";
import { KnowledgeCardView } from "@/components/knowledge/KnowledgeCard";
import { Faq } from "@/components/trust/Faq";
import { Button, buttonVariants } from "@/components/ui/button";
import type { FaqItem, KnowledgeCard } from "@/lib/content/knowledgeCards";

export function ThankYou({
  done,
  business,
  cards,
  faq,
  onRestart,
  onCardOpen,
}: {
  done: { reportToken: string | null; wantsInspection: boolean; emailSent: boolean };
  business: boolean;
  cards: KnowledgeCard[];
  faq: FaqItem[];
  onRestart: () => void;
  onCardOpen: (slug: string) => void;
}) {
  const inspectionCard = cards.find((c) => c.slug === "besigtigelse");
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-10">
        <CheckCircle2 className="mx-auto size-14 text-success" />
        <h1 className="mt-4 text-2xl font-bold">{business ? "Tak for din henvendelse!" : done.wantsInspection ? "Tak – vi ringer dig op!" : "Tak – din rapport er på vej!"}</h1>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          {business
            ? "En af vores specialister kontakter dig personligt – typisk inden for én arbejdsdag."
            : done.wantsInspection
              ? "Vi kontakter dig for at aftale tid til en gratis og uforpligtende besigtigelse. Rapporten med dine svar er sendt til din e-mail."
              : done.emailSent
                ? "Vi har sendt din personlige varmepumperapport til din e-mail. Tjek evt. spam-mappen, hvis du ikke kan finde den."
                : "Vi har modtaget dine oplysninger. Du kan altid se din rapport via linket herunder."}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {done.reportToken && (
            <a href={`/rapport/${done.reportToken}`} target="_blank" rel="noopener" className={buttonVariants({ variant: "default" })}>
              <FileText /> Se din rapport
            </a>
          )}
          <Button variant="outline" onClick={onRestart}>
            <RotateCcw /> Lav en ny beregning
          </Button>
        </div>
      </div>
      {inspectionCard && !business && <KnowledgeCardView card={inspectionCard} defaultOpen={done.wantsInspection} onOpen={onCardOpen} />}
      <Faq items={faq} />
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronDown,
  ClipboardCheck,
  Factory,
  Gauge,
  Home,
  Layers,
  Lightbulb,
  Ruler,
  Shield,
  Thermometer,
  Volume2,
  Wind,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { KnowledgeCard as Card } from "@/lib/content/knowledgeCards";
import { cn } from "@/lib/utils";

const icons: Record<string, React.ComponentType<{ className?: string }>> = {
  "heat-pump": Wind,
  house: Home,
  gauge: Gauge,
  factory: Factory,
  shield: Shield,
  thermometer: Thermometer,
  volume: Volume2,
  layers: Layers,
  ruler: Ruler,
  alert: AlertTriangle,
  wrench: Wrench,
  clipboard: ClipboardCheck,
  badge: BadgeCheck,
};

export function CardIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && icons[name]) || Lightbulb;
  return <Icon className={className} />;
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-kl">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

/** "Vidste du?" card – collapsed by default, explains WHY we ask. */
export function KnowledgeCardView({
  card,
  defaultOpen = false,
  onOpen,
}: {
  card: Card;
  defaultOpen?: boolean;
  onOpen?: (slug: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-primary/15 bg-info-bg">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (!open) onOpen?.(card.slug);
          setOpen(!open);
        }}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CardIcon name={card.illustration} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold uppercase tracking-wide text-primary">Vidste du?</span>
          <span className="block text-sm font-semibold leading-snug">{card.title}</span>
        </span>
        <ChevronDown className={cn("size-5 shrink-0 text-primary transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="px-4 pb-4">
              <Markdown>{card.body_md}</Markdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

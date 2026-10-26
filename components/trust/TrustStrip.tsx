import { BadgeCheck, ShieldCheck, Star } from "lucide-react";
import type { AppConfig } from "@/lib/config/defaults";

/**
 * Certifications + Trustpilot. The Trustpilot part only renders when a profile
 * URL is configured, and only shows reviews that have been added in config.
 */
export function TrustStrip({ cfg }: { cfg: AppConfig }) {
  const tp = cfg.trustpilot;
  return (
    <section className="border-t bg-card">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground">
          {["VE-godkendt", "Medlem af AKB", "Medlem af KMO", "Dansk Køl og Varme Garantiordning", "ISO-certificeret", "Bl.a. Mitsubishi-varmepumper"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <BadgeCheck className="size-4 text-primary" /> {t}
            </li>
          ))}
        </ul>
        {tp.profileUrl && (
          <div className="space-y-4">
            <a href={tp.profileUrl} target="_blank" rel="noopener" className="flex items-center justify-center gap-2 text-sm font-semibold hover:underline">
              <span className="flex">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="size-5 fill-[#00b67a] text-[#00b67a]" />
                ))}
              </span>
              {tp.score ? `${tp.score.toLocaleString("da-DK")} på Trustpilot` : "Se vores anmeldelser på Trustpilot"}
              {tp.reviewCount ? ` · ${tp.reviewCount} anmeldelser` : ""}
            </a>
            {tp.reviews.length > 0 && (
              <div className="flex snap-x gap-3 overflow-x-auto pb-2">
                {tp.reviews.map((r) => (
                  <figure key={r.author + r.text.slice(0, 20)} className="w-72 shrink-0 snap-start rounded-xl border bg-background p-4 text-sm">
                    <div className="mb-2 flex">
                      {Array.from({ length: r.stars }).map((_, i) => (
                        <Star key={i} className="size-4 fill-[#00b67a] text-[#00b67a]" />
                      ))}
                    </div>
                    <blockquote className="leading-relaxed">“{r.text}”</blockquote>
                    <figcaption className="mt-2 font-semibold">{r.author}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        )}
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-4" /> {cfg.contact.companyName} · Køle- og varmepumpeteknik på Sjælland og øerne
        </p>
      </div>
    </section>
  );
}

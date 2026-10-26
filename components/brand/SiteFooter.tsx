import { Mail, Phone } from "lucide-react";
import { company, SITE_URL } from "./brand";

export function SiteFooter() {
  return (
    <footer>
      <section className="bg-primary text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:py-12">
          <p className="font-heading text-2xl leading-tight sm:text-3xl">Brug for råd om en ny varmepumpe – eller servicering af den gamle?</p>
          <a
            href={`tel:${company.phone}`}
            className="inline-flex h-12 shrink-0 items-center rounded-full bg-white px-10 text-primary transition-colors hover:bg-white/90"
          >
            Kontakt os
          </a>
        </div>
      </section>
      <section className="bg-muted">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-[1fr_2fr]">
          <div className="space-y-3">
            <p className="font-heading text-lg">KL Køleteknik</p>
            <a href={`tel:${company.phone}`} className="flex items-center gap-3 text-accent hover:underline">
              <Phone className="size-5" /> {company.phone}
            </a>
            <a href={`mailto:${company.email}`} className="flex items-center gap-3 text-accent hover:underline">
              <Mail className="size-5" /> {company.email}
            </a>
          </div>
          <div className="space-y-5 text-[15px] leading-relaxed text-foreground/85">
            <p className="font-heading text-lg text-foreground">Find os</p>
            <p>{company.serviceArea}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {company.addresses.map(([street, city]) => (
                <p key={street}>
                  {street}
                  <br />
                  {city}
                </p>
              ))}
            </div>
            <p>
              KL Køleteknik er:
              <br />
              {company.credentials}
            </p>
            <a href={SITE_URL} className="inline-block text-accent hover:underline">
              klkoleteknik.dk
            </a>
          </div>
        </div>
      </section>
    </footer>
  );
}

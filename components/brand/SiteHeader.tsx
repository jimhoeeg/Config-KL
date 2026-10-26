import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { navItems } from "./brand";

export function SiteHeader() {
  return (
    <header className="relative z-40 bg-white">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:h-28">
        <a href={navItems[0].href}>
          <Logo />
        </a>
        <nav className="hidden gap-8 text-[15px] lg:flex">
          {navItems.map((n) => (
            <a key={n.label} href={n.href} className={cn("transition-colors hover:text-accent", n.active ? "text-accent" : "text-muted-foreground")}>
              {n.label}
            </a>
          ))}
        </nav>
        <details className="group lg:hidden">
          <summary className="flex size-10 cursor-pointer list-none items-center justify-center text-primary [&::-webkit-details-marker]:hidden" aria-label="Menu">
            <Menu className="size-6" />
          </summary>
          <nav className="absolute inset-x-0 top-full border-t bg-white px-4 py-2 shadow-lg">
            {navItems.map((n) => (
              <a key={n.label} href={n.href} className={cn("block py-3 text-base", n.active ? "text-accent" : "text-muted-foreground")}>
                {n.label}
              </a>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}

/** Page header band like on klkoleteknik.dk: photo with purple overlay and a centred white title. */
export function PageHero({ title, subtitle, image }: { title: string; subtitle?: string; image?: string | null }) {
  return (
    <section
      className="relative flex min-h-48 items-center justify-center px-4 py-12 text-center sm:min-h-72"
      style={{
        backgroundImage: image
          ? `linear-gradient(rgba(89,87,167,0.72), rgba(89,87,167,0.72)), url(${image})`
          : "radial-gradient(ellipse at 20% 30%, rgba(255,255,255,0.12), transparent 55%), radial-gradient(ellipse at 85% 70%, rgba(0,0,143,0.35), transparent 60%), linear-gradient(135deg, #6a64b4 0%, #5957a7 45%, #3d3a96 100%)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div>
        <p className="font-heading text-3xl text-white sm:text-5xl">{title}</p>
        {subtitle && <p className="mx-auto mt-3 max-w-xl text-sm text-white/90 sm:text-base">{subtitle}</p>}
      </div>
    </section>
  );
}

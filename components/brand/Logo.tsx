/**
 * Text rendition of the KL Køleteknik logo. Replace with the official file
 * (public/brand/logo.svg) when available.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col leading-none text-primary ${className ?? ""}`} aria-label="KL Køleteknik – Køl, Frys, Varmepumper">
      <span className="flex items-center gap-2">
        <span className="bg-primary px-1.5 py-1 font-heading text-lg font-extrabold tracking-wider text-white sm:text-2xl">KL</span>
        <span className="font-heading text-lg font-bold tracking-[0.18em] sm:text-2xl">KØLETEKNIK</span>
      </span>
      <span className="mt-1 pl-1 text-[11px] tracking-wide sm:text-sm">Køl ✦ Frys ✦ Varmepumper</span>
    </span>
  );
}

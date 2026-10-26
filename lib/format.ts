const nf = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 1 });

export const num = (n: number) => nf.format(n);
export const num1 = (n: number) => nf1.format(n);
export const kr = (n: number) => `${nf.format(n)} kr.`;
export const krRange = (r: { low: number; high: number }) => `${nf.format(r.low)}–${nf.format(r.high)} kr.`;
export const yearsRange = (r: { low: number; high: number }) => `${nf1.format(r.low)}–${nf1.format(r.high)} år`;

export const PRICE_DISCLAIMER = "Vejledende prisinterval – den endelige pris afhænger af en besigtigelse.";
export const SIZING_DISCLAIMER = "Skønnet størrelse. Den endelige dimensionering kræver en besigtigelse.";
export const CONSENT_TEXT_VERSION = "2026-10-v1";

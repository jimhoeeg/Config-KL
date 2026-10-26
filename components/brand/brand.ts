/**
 * Brand content mirrored from klkoleteknik.dk. Update the nav URLs to the real
 * page paths on the website; they all point to the front page until then.
 */
export const SITE_URL = "https://klkoleteknik.dk";

export const navItems = [
  { label: "Velkommen", href: SITE_URL },
  { label: "KL Køleteknik", href: SITE_URL },
  { label: "Brands", href: SITE_URL },
  { label: "Varmepumper", href: "/", active: true },
  { label: "Eftersyn", href: SITE_URL },
  { label: "Kontakt", href: SITE_URL },
];

export const company = {
  phone: "88445446",
  email: "klkoleteknik@gmail.com",
  serviceArea: "Vi servicerer kunder på Sjælland, Lolland, Falster og Møn.",
  addresses: [
    ["Randersvej 8", "4800 Nykøbing F."],
    ["Københavnsvej 133", "4600 Køge"],
    ["Kødbyen, Flæsketorvet 68", "1711 København"],
  ],
  credentials:
    "ISO-certificerede, VE-godkendte, medlem af Autoriserede Køle- & Varmepumpefirmaers Brancheforening (AKB) og Kølebranchens Miljøordning (KMO) og er en del af Dansk køl og varme garantiordning.",
};

/**
 * Optional hero photo (e.g. /brand/hero.jpg in /public). The site uses photos with a
 * purple overlay; without a photo we render the same overlay colour as a gradient.
 */
export const HERO_IMAGE: string | null = null;

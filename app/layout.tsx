import type { Metadata, Viewport } from "next";
import { Poppins, Raleway } from "next/font/google";
import "./globals.css";

// Same typefaces as klkoleteknik.dk: Raleway for headings, Poppins for body text.
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin", "latin-ext"], weight: ["300", "400", "500", "600"] });
const raleway = Raleway({ variable: "--font-raleway", subsets: ["latin", "latin-ext"], weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: "Varmepumperådgiveren – KL Køleteknik",
  description: "Er dit hus klar til en varmepumpe? Find ud af det på 4 minutter – og bliv klogere undervejs. Ærlig rådgivning fra KL Køleteknik.",
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  openGraph: {
    title: "Er dit hus klar til en varmepumpe?",
    description: "Find ud af det på 4 minutter – og bliv klogere undervejs.",
    locale: "da_DK",
    type: "website",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#00008f" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="da" className={`${poppins.variable} ${raleway.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}

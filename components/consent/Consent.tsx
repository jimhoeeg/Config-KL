"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "kl-vpr-consent";
type Choice = "all" | "necessary";

function readChoice(): Choice | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "all" || v === "necessary" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Cookie consent. Meta Pixel and GA4 are NOT loaded until the visitor accepts.
 * When embedded, the host page can forward its own CMP decision with
 * ?consent=granted|denied (see public/embed.js), and no banner is shown.
 */
export function Consent({ metaPixelId, ga4Id }: { metaPixelId?: string; ga4Id?: string }) {
  const [choice, setChoice] = useState<Choice | null | undefined>(undefined);

  useEffect(() => {
    const forwarded = new URLSearchParams(window.location.search).get("consent");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser-only state after hydration
    setChoice(forwarded === "granted" ? "all" : forwarded === "denied" ? "necessary" : readChoice());
  }, []);

  function decide(c: Choice) {
    try {
      localStorage.setItem(KEY, c);
    } catch {
      // ignore
    }
    setChoice(c);
  }

  if (!metaPixelId && !ga4Id) return null;

  return (
    <>
      {choice === "all" && <TrackingScripts metaPixelId={metaPixelId} ga4Id={ga4Id} />}
      {choice === null && (
        <div role="dialog" aria-label="Cookies" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-lg rounded-xl border bg-card p-4 shadow-xl">
          <p className="text-sm">
            Vi vil gerne bruge cookies til statistik og til at måle vores annoncer på Facebook og Google. Du kan sagtens bruge rådgiveren uden.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => decide("all")}>
              Accepter alle
            </Button>
            <Button size="sm" variant="outline" onClick={() => decide("necessary")}>
              Kun nødvendige
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function TrackingScripts({ metaPixelId, ga4Id }: { metaPixelId?: string; ga4Id?: string }) {
  return (
    <>
      {metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(metaPixelId)});fbq('track','PageView');`}
        </Script>
      )}
      {ga4Id && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config',${JSON.stringify(ga4Id)});`}
          </Script>
        </>
      )}
    </>
  );
}

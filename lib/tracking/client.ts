"use client";

import type { Answers, Segment } from "@/lib/schema/answers";

export type TrackEventType = "step_view" | "step_complete" | "card_open" | "cta_click";
export interface TrackEvent {
  type: TrackEventType;
  step?: string;
  payload?: Record<string, unknown>;
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

function post(body: unknown) {
  const data = JSON.stringify(body);
  try {
    if (navigator.sendBeacon?.("/api/events", new Blob([data], { type: "application/json" }))) return;
  } catch {
    // fall through to fetch
  }
  fetch("/api/events", { method: "POST", body: data, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
}

/** First-party anonymous funnel event (no cookies, no personal data). */
export function track(sessionId: string, event: TrackEvent) {
  post({ sessionId, events: [event] });
  // Third-party pixels are only present after consent (see ConsentBanner/TrackingScripts).
  window.gtag?.("event", event.type, { step: event.step, ...event.payload });
  if (event.type === "cta_click") window.fbq?.("trackCustom", "VPR_CTA", { step: event.step, ...event.payload });
}

/** Marketing conversion – only fires if pixels were loaded after consent. */
export function trackConversion(kind: "report" | "inspection", tier?: string) {
  window.fbq?.("track", "Lead", { content_name: kind });
  window.gtag?.("event", "generate_lead", { lead_type: kind, tier });
}

export function saveProgress(
  sessionId: string,
  progress: { step: number; maxStep: number; segment?: Segment; answers: Answers; embedded?: boolean; utm?: Record<string, string> },
  events?: TrackEvent[],
) {
  post({ sessionId, progress, events });
}

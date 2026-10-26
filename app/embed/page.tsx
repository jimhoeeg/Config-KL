import type { Metadata } from "next";
import { WizardPage } from "@/components/wizard/WizardPage";

export const metadata: Metadata = { robots: { index: false } };

/** Chrome-less version for <iframe>/<kl-varmepumpe> on klkoleteknik.dk. */
export default function Embed() {
  return <WizardPage embedded />;
}

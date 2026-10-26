import { Consent } from "@/components/consent/Consent";
import { Faq } from "@/components/trust/Faq";
import { TrustStrip } from "@/components/trust/TrustStrip";
import { getConfig, getFaq, getKnowledgeCards } from "@/lib/data/content";
import { Wizard } from "./Wizard";

/** Shared server wrapper for the standalone page and the embed. */
export async function WizardPage({ embedded }: { embedded: boolean }) {
  const [cfg, cards, faq] = await Promise.all([getConfig(), getKnowledgeCards(), getFaq()]);
  return (
    <>
      <Wizard cfg={cfg} cards={cards} faq={faq} embedded={embedded} />
      {!embedded && (
        <>
          <div className="mx-auto w-full max-w-3xl px-4 pb-10">
            <Faq items={faq} />
          </div>
          <TrustStrip cfg={cfg} />
        </>
      )}
      <Consent metaPixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID} ga4Id={process.env.NEXT_PUBLIC_GA4_ID} />
    </>
  );
}

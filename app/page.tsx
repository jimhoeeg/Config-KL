import { HERO_IMAGE } from "@/components/brand/brand";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { PageHero, SiteHeader } from "@/components/brand/SiteHeader";
import { WizardPage } from "@/components/wizard/WizardPage";

/** Standalone landing page, styled as a page on klkoleteknik.dk. */
export default function Home() {
  return (
    <>
      <SiteHeader />
      <PageHero title="Varmepumperådgiveren" subtitle="Ærlig rådgivning fra din lokale kølemontør – på 4 minutter." image={HERO_IMAGE} />
      <div className="flex-1">
        <WizardPage embedded={false} />
      </div>
      <SiteFooter />
    </>
  );
}

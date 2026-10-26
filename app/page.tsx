import { Wind } from "lucide-react";
import { WizardPage } from "@/components/wizard/WizardPage";

export default function Home() {
  return (
    <>
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <a href="https://klkoleteknik.dk" className="font-bold text-primary">
            KL Køleteknik
          </a>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Wind className="size-4" /> Varmepumperådgiveren
          </span>
        </div>
      </header>
      <div className="flex-1">
        <WizardPage embedded={false} />
      </div>
    </>
  );
}

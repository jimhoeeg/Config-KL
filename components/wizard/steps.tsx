"use client";

import {
  Building2,
  Clock,
  Droplets,
  Flame,
  Fuel,
  Home,
  Info,
  Leaf,
  Snowflake,
  Sun,
  Thermometer,
  Trees,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import { Input, Label, Textarea } from "@/components/ui/input";
import { labels } from "@/lib/content/labels";
import type { AppConfig } from "@/lib/config/defaults";
import { eraFor, estimateFlowTemp, flowTempLabels, insulationModifier } from "@/lib/engine";
import { num } from "@/lib/format";
import type { Answers } from "@/lib/schema/answers";
import { defaultUnitFor } from "@/lib/wizard/flow";
import { cn } from "@/lib/utils";
import { AddressField } from "./AddressField";
import { ChoiceGroup, MultiChoice, NumberField, Question, Toggle, type ChoiceOption } from "./fields";

export interface StepProps {
  a: Answers;
  set: (patch: Partial<Answers>) => void;
  cfg: AppConfig;
}

function opts<K extends keyof typeof labels>(group: K, icons?: Record<string, React.ReactNode>, desc?: Record<string, string>) {
  return Object.entries(labels[group]).map(([value, label]) => ({
    value,
    label,
    icon: icons?.[value],
    description: desc?.[value],
  })) as ChoiceOption<Extract<keyof (typeof labels)[K], string>>[];
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl p-4 text-sm leading-relaxed",
        tone === "warning" ? "border border-accent/30 bg-warning-bg" : "border border-primary/15 bg-info-bg",
      )}
    >
      <Info className={cn("mt-0.5 size-5 shrink-0", tone === "warning" ? "text-accent" : "text-primary")} />
      <div>{children}</div>
    </div>
  );
}

/** A small "live insight" panel that teaches as the user answers. */
function Insight({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

// ───────────────────────────── Step 0 – Hook ─────────────────────────────

export function StepStart({ a, set }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          Er dit hus klar til en varmepumpe?
          <span className="block text-primary">Find ud af det på 4 minutter – og bliv klogere undervejs.</span>
        </h1>
        <p className="text-muted-foreground">
          Vi stiller dig de samme spørgsmål, som en montør ville stille ved en besigtigelse – og forklarer undervejs, hvorfor de betyder noget. Til sidst får du
          en ærlig anbefaling og et vejledende prisinterval.
        </p>
      </div>
      <Question title="Hvad drejer det sig om?">
        <ChoiceGroup
          name="segment"
          columns={3}
          value={a.segment}
          onChange={(segment) => set({ segment, houseType: segment === "sommerhus" ? "sommerhus" : a.houseType === "sommerhus" ? undefined : a.houseType })}
          options={[
            { value: "privat", label: "Privat bolig", description: "Hus eller rækkehus, du bor i året rundt", icon: <Home /> },
            { value: "sommerhus", label: "Sommerhus", description: "Fritidshus eller sommerbolig", icon: <Sun /> },
            { value: "erhverv", label: "Erhverv", description: "Varme, køl og frys til virksomheder", icon: <Building2 /> },
          ]}
        />
      </Question>
      <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
        <li className="flex items-center gap-2">
          <Clock className="size-4 text-primary" /> Ca. 4 minutter
        </li>
        <li className="flex items-center gap-2">
          <Leaf className="size-4 text-primary" /> Gratis og uforpligtende
        </li>
        <li className="flex items-center gap-2">
          <Info className="size-4 text-primary" /> Ærligt svar – også hvis det er et nej
        </li>
      </ul>
    </div>
  );
}

// ───────────────────────────── Step 1 – Huset ─────────────────────────────

export function StepHuset({ a, set, cfg }: StepProps) {
  const era = a.yearBuilt ? eraFor(a.yearBuilt) : undefined;
  const eraRows: { key: keyof AppConfig["heatDemand"]["eraFactors"]; label: string }[] = [
    { key: "pre1960", label: "Før 1960" },
    { key: "from1960to1979", label: "1960–79" },
    { key: "from1980to2005", label: "1980–2005" },
    { key: "from2006", label: "Efter 2006" },
  ];
  const maxFactor = Math.max(...Object.values(cfg.heatDemand.eraFactors));
  return (
    <div className="space-y-6">
      <StepHeading title="Fortæl os om huset" text="Vi bruger adressen til at tjekke, om vi dækker dit område – og til at hente oplysninger fra BBR, hvis det er muligt." />
      <AddressField
        value={a.address}
        onChange={(address) => set({ address })}
        onBbr={(d) =>
          set({
            areaM2: d.areaM2 ?? a.areaM2,
            yearBuilt: d.yearBuilt ?? a.yearBuilt,
            heating: d.heating ?? a.heating,
            bbrPrefilled: !!(d.areaM2 || d.yearBuilt),
          })
        }
      />
      {a.bbrPrefilled && <Notice>Vi har udfyldt areal og byggeår fra BBR. Ret gerne, hvis det ikke passer – BBR er ikke altid opdateret.</Notice>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Question title="Opvarmet areal">
          <NumberField id="area" value={a.areaM2} onChange={(areaM2) => set({ areaM2, bbrPrefilled: false })} min={20} max={600} step={5} suffix="m²" placeholder="fx 140" />
        </Question>
        <Question title="Byggeår">
          <NumberField id="year" value={a.yearBuilt} onChange={(yearBuilt) => set({ yearBuilt, bbrPrefilled: false })} min={1800} max={2026} suffix="år" placeholder="fx 1972" />
        </Question>
      </div>
      <Question title="Hustype">
        <ChoiceGroup name="houseType" value={a.houseType} onChange={(houseType) => set({ houseType })} options={opts("houseType")} />
      </Question>
      <Question title="Antal etager (opvarmede)">
        <ChoiceGroup
          name="floors"
          columns={3}
          value={a.floors ? String(a.floors) : undefined}
          onChange={(v) => set({ floors: Number(v) })}
          options={[
            { value: "1", label: "1 etage" },
            { value: "2", label: "2 etager" },
            { value: "3", label: "3 eller flere" },
          ]}
        />
      </Question>
      <Insight title="Typisk varmebehov efter byggeår">
        <div className="space-y-1.5">
          {eraRows.map((r) => {
            const f = cfg.heatDemand.eraFactors[r.key];
            return (
              <div key={r.key} className="flex items-center gap-3 text-sm">
                <span className={cn("w-20 shrink-0", era === r.key && "font-bold text-primary")}>{r.label}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", era === r.key ? "bg-accent" : "bg-primary/30")} style={{ width: `${(f / maxFactor) * 100}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right tabular-nums">{f} kWh/m²</span>
              </div>
            );
          })}
        </div>
        {a.areaM2 && era && (
          <p className="mt-3 text-sm">
            Dit hus: ca. <b>{num(a.areaM2 * cfg.heatDemand.eraFactors[era])} kWh</b> om året til rumvarme – før vi kender isoleringen.
          </p>
        )}
      </Insight>
    </div>
  );
}

// ───────────────────────────── Step 2 – Opvarmning ─────────────────────────────

const heatingIcons = {
  olie: <Fuel />,
  gas: <Flame />,
  elvarme: <Zap />,
  traepiller: <Trees />,
  fjernvarme: <Building2 />,
  gammel_varmepumpe: <Wind />,
};

export function StepOpvarmning({ a, set }: StepProps) {
  return (
    <div className="space-y-6">
      <StepHeading title="Hvordan varmer du huset op i dag?" text="Det er her, den største forskel på besparelsen ligger." />
      <Question title="Nuværende opvarmning">
        <ChoiceGroup
          name="heating"
          value={a.heating}
          onChange={(heating) => set({ heating, consumptionUnit: defaultUnitFor(heating), fjernvarmeAvailable: heating === "fjernvarme" ? undefined : a.fjernvarmeAvailable })}
          options={opts("heating", heatingIcons)}
        />
      </Question>
      {a.heating === "fjernvarme" && (
        <Notice tone="warning">
          <b>Ærligt svar:</b> Med fjernvarme er en varmepumpe sjældent en god forretning. Fjernvarme er typisk billig og grøn. Du er velkommen til at fortsætte – så
          forklarer vi hvorfor, og hvornår en lille luft-til-luft-varmepumpe alligevel kan give mening (fx til køling).
        </Notice>
      )}
      {a.heating && a.heating !== "fjernvarme" && (
        <Question title="Er der fjernvarme i din gade, eller er det planlagt?" hint="Tjek evt. på dit lokale fjernvarmeværks hjemmeside.">
          <ChoiceGroup name="fjernvarmeAvailable" columns={3} value={a.fjernvarmeAvailable} onChange={(fjernvarmeAvailable) => set({ fjernvarmeAvailable })} options={opts("yesNoUnknown")} />
        </Question>
      )}
      {a.fjernvarmeAvailable === "ja" && (
        <Notice tone="warning">Når fjernvarme er mulig, er det ofte det billigste valg på lang sigt. Vi viser dig begge muligheder til sidst, så du kan sammenligne.</Notice>
      )}
      <Question title="Kender du dit årlige forbrug?" hint="Det står på din årsopgørelse. Et faktisk tal gør beregningen langt mere præcis.">
        <Toggle label="Kender du dit forbrug" checked={a.knowsConsumption} onChange={(knowsConsumption) => set({ knowsConsumption })} />
      </Question>
      {a.knowsConsumption && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="consumption">Forbrug pr. år</Label>
            <Input
              id="consumption"
              inputMode="numeric"
              type="number"
              min={0}
              className="mt-1.5"
              value={a.consumptionValue ?? ""}
              onChange={(e) => set({ consumptionValue: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="unit">Enhed</Label>
            <select
              id="unit"
              className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 text-base"
              value={a.consumptionUnit ?? defaultUnitFor(a.heating)}
              onChange={(e) => set({ consumptionUnit: e.target.value as Answers["consumptionUnit"] })}
            >
              {Object.entries(labels.consumptionUnit).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      {a.knowsConsumption === false && <p className="text-sm text-muted-foreground">Intet problem – vi beregner et skøn ud fra areal, byggeår og isolering.</p>}
    </div>
  );
}

// ───────────────────────────── Step 3 – Klimaskærm ─────────────────────────────

export function StepKlimaskaerm({ a, set, cfg }: StepProps) {
  const answered = a.windows || a.roof || a.walls || a.draughts;
  const m = insulationModifier(a, cfg);
  const level = m <= 0.95 ? "god" : m <= cfg.heatDemand.reasonableInsulationMax ? "middel" : "svag";
  const levelText = { god: "God isolering", middel: "Rimelig isolering", svag: "Svag isolering" }[level];
  const pct = ((m - cfg.heatDemand.insulationModifierMin) / (cfg.heatDemand.insulationModifierMax - cfg.heatDemand.insulationModifierMin)) * 100;
  return (
    <div className="space-y-6">
      <StepHeading title="Hvor godt holder huset på varmen?" text="Gæt gerne – 'ved ikke' er også et fint svar." />
      <Question title="Vinduer">
        <ChoiceGroup
          name="windows"
          columns={3}
          value={a.windows}
          onChange={(windows) => set({ windows })}
          options={opts("windows", undefined, { enkelt: "Gamle vinduer, evt. forsatsruder", dobbelt: "Mest almindeligt", tre_lag: "Nyere energiruder" })}
        />
      </Question>
      <Question title="Isolering på loftet">
        <ChoiceGroup name="roof" value={a.roof} onChange={(roof) => set({ roof })} options={opts("roof")} />
      </Question>
      <Question title="Ydervægge">
        <ChoiceGroup
          name="walls"
          value={a.walls}
          onChange={(walls) => set({ walls })}
          options={opts("walls", undefined, { uisoleret: "Fx massive murstensvægge", delvist: "Fx hulmursisoleret", isoleret: "Nyere byggeri eller efterisoleret" })}
        />
      </Question>
      <Question title="Mærker du træk eller kolde zoner?">
        <ChoiceGroup name="draughts" columns={3} value={a.draughts} onChange={(draughts) => set({ draughts })} options={opts("draughts")} />
      </Question>
      {answered && (
        <Insight title="Din klimaskærm">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>{levelText}</span>
            <span className="tabular-nums text-muted-foreground">faktor {m.toLocaleString("da-DK")}</span>
          </div>
          <div className="relative mt-2 h-3 rounded-full bg-gradient-to-r from-green-500 via-amber-400 to-red-500">
            <div className="absolute -top-1 size-5 -translate-x-1/2 rounded-full border-2 border-white bg-foreground shadow" style={{ left: `${pct}%` }} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {level === "svag"
              ? "Dit hus taber en del varme. Det betyder højere fremløbstemperatur og lavere effektivitet – overvej billige forbedringer som loftisolering og tætningslister."
              : "Fint! Jo bedre isolering, desto lavere fremløbstemperatur kan varmepumpen køre med."}
          </p>
        </Insight>
      )}
    </div>
  );
}

// ───────────────────────────── Step 4 – Varmeafgivelse ─────────────────────────────

export function StepVarmeafgivelse({ a, set, cfg }: StepProps) {
  const water = a.emitter === "radiatorer" || a.emitter === "mix" || a.emitter === "gulvvarme";
  const flow = water ? estimateFlowTemp(a, cfg) : undefined;
  const flowPos = { lav: 10, lav_mellem: 37, mellem: 63, hoej: 90 };
  return (
    <div className="space-y-6">
      <StepHeading title="Hvordan kommer varmen ud i rummene?" text="Det her er det vigtigste spørgsmål for, om en luft-til-vand-varmepumpe passer til dit hus." />
      <Question title="Varmesystem">
        <ChoiceGroup
          name="emitter"
          value={a.emitter}
          onChange={(emitter) => set({ emitter, radiatorSize: emitter === "gulvvarme" || emitter === "elpaneler" ? undefined : a.radiatorSize })}
          options={opts("emitter", { radiatorer: <Thermometer />, gulvvarme: <Waves />, mix: <Waves />, elpaneler: <Zap /> })}
        />
      </Question>
      {(a.emitter === "radiatorer" || a.emitter === "mix") && (
        <Question title="Hvordan ser radiatorerne ud?" hint="Store radiatorer har to eller tre plader bag hinanden eller er lange og høje.">
          <ChoiceGroup name="radiatorSize" value={a.radiatorSize} onChange={(radiatorSize) => set({ radiatorSize })} options={opts("radiatorSize")} />
        </Question>
      )}
      {water && (
        <Question title="Er huset varmt nok på en kold dag, selvom radiatorerne kun er lune?" hint="Altså: behøver radiatorerne ikke være skoldhede for at holde varmen?">
          <ChoiceGroup name="warmAtLowTemp" columns={3} value={a.warmAtLowTemp} onChange={(warmAtLowTemp) => set({ warmAtLowTemp })} options={opts("yesNoUnknown")} />
        </Question>
      )}
      {flow && (
        <Insight title="Din skønnede fremløbstemperatur">
          <div className="relative mt-1 h-3 rounded-full bg-gradient-to-r from-sky-400 via-amber-300 to-red-500">
            <div className="absolute -top-1 size-5 -translate-x-1/2 rounded-full border-2 border-white bg-foreground shadow transition-all" style={{ left: `${flowPos[flow]}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>35 °C</span>
            <span>45 °C</span>
            <span>55 °C</span>
          </div>
          <p className="mt-3 text-sm">
            Fremløb <b>{flowTempLabels[flow]}</b> → en luft-til-vand-varmepumpe vil have en SCOP på ca. <b>{cfg.scop.airToWater[flow].toLocaleString("da-DK")}</b>.
            {flow === "hoej" && " Det kan forbedres ved at skifte de mindste radiatorer."}
          </p>
        </Insight>
      )}
      {a.emitter === "elpaneler" && (
        <Notice>Uden et vandbåret system er luft-til-luft typisk det mest oplagte valg. Det giver stor besparelse for en lav investering.</Notice>
      )}
      <Question title="Hvor mange bor i huset?">
        <NumberField id="household" value={a.householdSize} onChange={(householdSize) => set({ householdSize })} min={1} max={12} suffix="pers." placeholder="fx 3" />
      </Question>
      <Question title="Hvordan bruger I varmt vand?">
        <ChoiceGroup
          name="hotWater"
          columns={3}
          value={a.hotWater}
          onChange={(hotWater) => set({ hotWater })}
          options={opts("hotWater", { brusere: <Droplets />, mix: <Droplets />, karbad: <Waves /> })}
        />
      </Question>
    </div>
  );
}

// ───────────────────────────── Step 5 – Grund ─────────────────────────────

export function StepGrund({ a, set }: StepProps) {
  return (
    <div className="space-y-6">
      <StepHeading title="Grund og placering" text="Grunden afgør, om jordvarme er en mulighed – og hvor en udedel kan stå." />
      <Question title="Hvor stor er grunden?">
        <ChoiceGroup name="garden" columns={3} value={a.garden} onChange={(garden) => set({ garden })} options={opts("garden")} />
      </Question>
      <Question title="Er der plads til en udedel ved huset?" hint="En udedel fylder ca. 1 × 0,4 m og skal kunne stå med fri luft omkring sig.">
        <ChoiceGroup name="outdoorPlacement" columns={3} value={a.outdoorPlacement} onChange={(outdoorPlacement) => set({ outdoorPlacement })} options={opts("outdoorPlacement")} />
      </Question>
      <Question title="Afstand fra den mulige placering til naboskel">
        <ChoiceGroup name="neighbourDistance" columns={3} value={a.neighbourDistance} onChange={(neighbourDistance) => set({ neighbourDistance })} options={opts("neighbourDistance")} />
      </Question>
      <Question title="Er støj et særligt vigtigt hensyn for dig eller naboerne?">
        <Toggle label="Støjfølsom" checked={a.noiseSensitive} onChange={(noiseSensitive) => set({ noiseSensitive })} />
      </Question>
    </div>
  );
}

// ───────────────────────────── Erhverv ─────────────────────────────

export function StepVirksomhed({ a, set }: StepProps) {
  return (
    <div className="space-y-6">
      <StepHeading title="Om virksomheden" text="Erhvervsløsninger dimensioneres altid individuelt, så her giver vi ikke et prisoverslag – en specialist kontakter dig personligt." />
      <Question title="Branche">
        <ChoiceGroup name="businessType" columns={3} value={a.businessType} onChange={(businessType) => set({ businessType })} options={opts("businessType")} />
      </Question>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="company">Firmanavn</Label>
          <Input id="company" className="mt-1.5" value={a.companyName ?? ""} onChange={(e) => set({ companyName: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="cvr">CVR (valgfrit)</Label>
          <Input id="cvr" inputMode="numeric" className="mt-1.5" value={a.cvr ?? ""} onChange={(e) => set({ cvr: e.target.value })} />
        </div>
      </div>
      <AddressField value={a.address} onChange={(address) => set({ address })} onBbr={() => {}} />
    </div>
  );
}

export function StepBehov({ a, set }: StepProps) {
  return (
    <div className="space-y-6">
      <StepHeading title="Hvad har I brug for?" text="Vælg gerne flere." />
      <Question title="Behov">
        <MultiChoice
          name="businessNeeds"
          value={a.businessNeeds}
          onChange={(businessNeeds) => set({ businessNeeds })}
          options={opts("businessNeeds", { varme: <Flame />, koeling: <Snowflake />, frys: <Snowflake />, proceskoeling: <Building2 />, service: <Wind /> })}
        />
      </Question>
      <Question title="Størrelse (areal der skal varmes/køles)">
        <ChoiceGroup name="businessSize" columns={3} value={a.businessSize} onChange={(businessSize) => set({ businessSize })} options={opts("businessSize")} />
      </Question>
      <Question title="Hvor hurtigt skal det løses?">
        <ChoiceGroup name="businessUrgency" columns={3} value={a.businessUrgency} onChange={(businessUrgency) => set({ businessUrgency })} options={opts("businessUrgency")} />
      </Question>
      <div className="grid gap-4">
        <div>
          <Label htmlFor="existing">Eksisterende anlæg (valgfrit)</Label>
          <Textarea id="existing" className="mt-1.5" placeholder="Fx mærke, alder, hvad det bruges til" value={a.businessExisting ?? ""} onChange={(e) => set({ businessExisting: e.target.value })} />
        </div>
        <div className="max-w-xs">
          <Label htmlFor="refrigerant">Kølemiddel, hvis kendt (valgfrit)</Label>
          <Input id="refrigerant" className="mt-1.5" placeholder="Fx R404A, R410A, R32" value={a.businessRefrigerant ?? ""} onChange={(e) => set({ businessRefrigerant: e.target.value })} />
        </div>
      </div>
      {a.businessUrgency === "akut" && <Notice tone="warning">Er det akut, så ring gerne direkte til os – så hjælper vi hurtigst muligt.</Notice>}
    </div>
  );
}

export function StepHeading({ title, text }: { title: string; text?: string }) {
  return (
    <div className="space-y-1.5">
      <h2 className="text-xl font-bold leading-tight sm:text-2xl">{title}</h2>
      {text && <p className="text-sm text-muted-foreground sm:text-base">{text}</p>}
    </div>
  );
}


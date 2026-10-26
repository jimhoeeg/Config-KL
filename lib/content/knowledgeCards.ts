/**
 * Seed content for the knowledge layer. This is the fallback used when the
 * database is unavailable, and the source for supabase/seed.sql
 * (`npm run seed:generate`). Once seeded, edit cards in /admin/videnskort.
 *
 * `illustration` is an icon key rendered by components/knowledge/CardIcon.tsx.
 */

export interface KnowledgeCard {
  slug: string;
  step: number;
  title: string;
  body_md: string;
  illustration: string;
  sort_order: number;
}

export const knowledgeCards: KnowledgeCard[] = [
  {
    slug: "hvad-er-en-varmepumpe",
    step: 0,
    sort_order: 1,
    illustration: "heat-pump",
    title: "Hvad er en varmepumpe egentlig?",
    body_md: `En varmepumpe **laver ikke varme – den flytter den**. Selv luft på −10 °C indeholder energi, og varmepumpen bruger samme princip som dit køleskab, bare omvendt:

1. Et kølemiddel optager varme fra udeluften (eller jorden), og fordamper.
2. En kompressor trykker gassen sammen, så temperaturen stiger.
3. Varmen afgives til dit hus – via luften eller dit radiatorvand.

Derfor får du typisk **3–5 kWh varme for hver 1 kWh strøm**. Det er hele hemmeligheden bag besparelsen.`,
  },
  {
    slug: "varmebehov-og-byggeaar",
    step: 1,
    sort_order: 1,
    illustration: "house",
    title: "Byggeår og areal bestemmer dit varmebehov",
    body_md: `Dit hus' varmebehov måles i **kWh pr. m² pr. år**. Byggeåret siger meget, fordi kravene til isolering er skærpet gennem tiden:

| Byggeperiode | Typisk varmebehov |
|---|---|
| Før 1960 | ca. 180 kWh/m² |
| 1960–1979 | ca. 150 kWh/m² |
| 1980–2005 | ca. 110 kWh/m² |
| Efter 2006 | ca. 70 kWh/m² |

**Eksempel:** Et parcelhus på 140 m² fra 1972 bruger omkring 140 × 150 = **21.000 kWh** om året til rumvarme. Et nyere hus af samme størrelse bruger under halvdelen.

Har huset fået nye vinduer eller efterisoleret loft, justerer vi tallet i næste trin.`,
  },
  {
    slug: "cop-og-scop",
    step: 2,
    sort_order: 1,
    illustration: "gauge",
    title: "COP og SCOP – varmepumpens 'benzinforbrug'",
    body_md: `**COP** (Coefficient of Performance) fortæller, hvor mange kWh varme du får pr. kWh strøm *lige nu*, ved én bestemt temperatur. En COP på 4 betyder 4 kWh varme for 1 kWh strøm.

**SCOP** (Seasonal COP) er gennemsnittet over et helt år – inkl. de kolde vinterdage. Det er SCOP, du skal se på, når du sammenligner.

**Hvorfor sparer man mest ved at skifte oliefyr eller elpaneler?**
- Elpaneler giver 1 kWh varme pr. kWh strøm. En varmepumpe giver 3–5. Det er en besparelse på op til 70–80 %.
- Olie er en dyr og CO₂-tung brændsel, og et ældre oliefyr udnytter ofte kun 80–85 % af energien.`,
  },
  {
    slug: "fjernvarme-eller-varmepumpe",
    step: 2,
    sort_order: 2,
    illustration: "factory",
    title: "Fjernvarme eller varmepumpe – hvornår skal du IKKE vælge varmepumpe?",
    body_md: `Vi siger det ligeud: **Har du fjernvarme – eller kan du få det – er en varmepumpe ofte ikke det bedste valg.**

- Fjernvarme har lave driftsudgifter og næsten ingen vedligeholdelse.
- Melder du dig ud, kan der være udtrædelsesgebyr og fortsat bidrag til nettet.
- I områder, hvor fjernvarmen udbygges, kan tilslutningen være billig eller gratis.

En varmepumpe kan stadig give mening, hvis der ikke kommer fjernvarme til din vej, eller hvis du ønsker køling om sommeren. Men vi vil hellere give dig et ærligt svar end sælge dig noget, du ikke har brug for.`,
  },
  {
    slug: "isolering-foerst",
    step: 3,
    sort_order: 1,
    illustration: "shield",
    title: "Isolering først – billige forbedringer med stor effekt",
    body_md: `Et hus, der taber meget varme, kræver **varmere vand i radiatorerne** (højere fremløbstemperatur). Og jo varmere vand varmepumpen skal lave, desto lavere bliver effektiviteten.

De billigste kWh er dem, du ikke bruger. Ofte kan små tiltag gøre en stor forskel:

- **Loftisolering** – ofte en af de bedste investeringer i et ældre hus.
- **Tætningslister** om døre og vinduer – koster få hundrede kroner.
- **Nye vinduer** med 2- eller 3-lags glas, når de gamle alligevel skal skiftes.
- **Radiatorfolie og termostatventiler** – små, billige forbedringer.

Et bedre isoleret hus kan nøjes med en **mindre varmepumpe**, som er billigere at købe og billigere i drift.`,
  },
  {
    slug: "fremloebstemperatur",
    step: 4,
    sort_order: 1,
    illustration: "thermometer",
    title: "Fremløbstemperaturen – det vigtigste, du lærer i dag",
    body_md: `**Fremløbstemperaturen** er temperaturen på det vand, der sendes ud i dine radiatorer eller din gulvvarme.

Et gammelt oliefyr sender ofte 60–70 °C ud. En luft-til-vand-varmepumpe arbejder **mest effektivt ved 35–45 °C**. Hver grad lavere fremløb giver typisk et par procent bedre effektivitet.

**Hvordan kan huset holdes varmt med koldere vand?** Ved at have en stor flade at afgive varmen fra:

- 🟢 **Gulvvarme** – ideel: kan nøjes med ca. 30–35 °C.
- 🟢 **Store radiatorer** (fx dobbelte panelradiatorer) – virker fint ved 40–45 °C.
- 🟡 **Små eller få radiatorer** – kræver højere temperatur. Det kan løses ved at skifte nogle få radiatorer.

**Test selv:** Skru ned for fyret på en kold dag. Er huset stadig lunt, når radiatorerne kun er lune? Så er dit hus sandsynligvis godt egnet til en varmepumpe.`,
  },
  {
    slug: "stoej-og-placering",
    step: 5,
    sort_order: 1,
    illustration: "volume",
    title: "Støj, placering – og monoblok vs. split",
    body_md: `En moderne udedel er stille, men **placeringen betyder alt**:

- Placér den væk fra soveværelser – både dine egne og naboens.
- Undgå hjørner og smalle passager, hvor lyden kastes tilbage.
- Miljøstyrelsens vejledende støjgrænser for boligområder er typisk **35 dB(A) om natten** ved naboskel. Din kommune kan stille krav.

**Monoblok eller split?**
- **Monoblok:** Hele kølekredsen sidder i udedelen, og der løber vand ind til huset. Enkel installation, men vandrørene skal frostsikres.
- **Split:** Udedel og indedel forbindes med kølemiddelrør. Kræver en autoriseret kølemontør – som os – men giver mere fleksibel placering.`,
  },
  {
    slug: "luft-luft-vand-jord",
    step: 6,
    sort_order: 1,
    illustration: "layers",
    title: "Luft-til-luft, luft-til-vand eller jordvarme?",
    body_md: `| | Luft-til-luft | Luft-til-vand | Jordvarme |
|---|---|---|---|
| **Varmer** | Luften i rummet | Radiatorer/gulvvarme | Radiatorer/gulvvarme |
| **Varmt vand** | ❌ Nej | ✅ Ja | ✅ Ja |
| **Pris** | Lav | Middel | Høj |
| **Effektivitet** | God | God | Højest |
| **Tilskud** | Nej | Ja | Ja |
| **Passer til** | Sommerhuse, elpaneler, supplement | Huse med olie/gas og vandbåret varme | Store grunde, stort varmebehov |

Der findes ikke én bedste varmepumpe – kun den bedste til **dit hus**.`,
  },
  {
    slug: "dimensionering",
    step: 6,
    sort_order: 2,
    illustration: "ruler",
    title: "Derfor er korrekt dimensionering så vigtig",
    body_md: `- **For stor varmepumpe:** Den tænder og slukker hele tiden (*short-cycling*). Det slider på kompressoren, sænker effektiviteten og koster mere i indkøb.
- **For lille varmepumpe:** På de koldeste dage må en elpatron hjælpe til – og den bruger strøm 1:1. Så forsvinder besparelsen.

Vores beregning her giver et godt skøn. Men den endelige størrelse kræver, at en fagmand ser huset, radiatorerne og dit faktiske forbrug. Det er derfor, vi altid tilbyder en **gratis besigtigelse**.`,
  },
  {
    slug: "tilskud-soeg-foer-du-skriver-under",
    step: 7,
    sort_order: 1,
    illustration: "alert",
    title: "Tilskud: Søg FØR du skriver under",
    body_md: `**Varmepumpepuljen 2026** giver et fast, skattefrit tilskud på **27.000 kr.** til luft-til-vand og jordvarme (ikke luft-til-luft).

> ⚠️ **Vigtigt:** Du skal søge – og have fået tilsagn – *før* du skriver under på en bindende aftale. Ellers mister du retten til tilskuddet.

**Håndværkerfradrag:** Du kan muligvis trække en del af arbejdslønnen fra (op til 9.000 kr. pr. person i 2026). Reglerne for hvilke installationer, der er omfattet, ændrer sig – tjek altid de gældende regler på skat.dk.

Vi hjælper gerne med at sikre, at rækkefølgen bliver rigtig.`,
  },
  {
    slug: "service-og-eftersyn",
    step: 7,
    sort_order: 2,
    illustration: "wrench",
    title: "Service – og hvorfor det betaler sig",
    body_md: `En varmepumpe kører tusindvis af timer om året. Et årligt eftersyn sikrer, at den bliver ved med at køre effektivt:

- Rensning af filtre og fordamper, kontrol af tryk og kølemiddel.
- **Lovkrav:** Anlæg med en vis mængde kølemiddel (fra 5 ton CO₂-ækvivalenter) skal efter EU's F-gasregler tæthedskontrolleres mindst én gang om året.
- Mange fabrikanter kræver dokumenteret service for at garantien gælder.

**Tryghed i 5 år:** Vores serviceabonnement koster 2.000 kr. om året inkl. moms. En varmepumpe, der kører bare 10 % dårligere, kan nemt koste mere end det i ekstra strøm.`,
  },
  {
    slug: "besigtigelse",
    step: 7,
    sort_order: 3,
    illustration: "clipboard",
    title: "Hvad sker der ved en besigtigelse?",
    body_md: `En besigtigelse er **gratis og uforpligtende** og tager typisk 45–60 minutter:

1. Vi går huset igennem og ser på radiatorer, rør og det nuværende fyr.
2. Vi finder den bedste placering til udedelen – med hensyn til støj og naboer.
3. Vi tjekker el-installationen og plads til varmtvandsbeholder.
4. Du får et skriftligt tilbud med fast pris – og god tid til at søge tilskud, før du beslutter dig.

Du er ikke forpligtet til noget, og der kommer ingen sælger på besøg – kun en fagmand.`,
  },
  {
    slug: "autoriseret-installatoer",
    step: 7,
    sort_order: 4,
    illustration: "badge",
    title: "Hvorfor vælge en autoriseret installatør?",
    body_md: `En varmepumpe indeholder kølemiddel under tryk, og arbejdet på kølekredsen kræver certificering. Hos KL Køleteknik er vi:

- **VE-godkendt** – ofte et krav, for at du kan få tilskud.
- Medlem af **AKB** (Autoriserede Kølefirmaers Brancheforening) og **KMO**.
- Tilmeldt **Dansk Køl og Varme Garantiordning** – du er dækket, hvis noget går galt.
- **ISO-certificeret** – vi arbejder efter dokumenterede kvalitetsprocedurer.

Det betyder korrekt dimensionering, lovlig installation og en garanti, der holder.`,
  },
];

export interface FaqItem {
  question: string;
  answer_md: string;
  sort_order: number;
}

export const faqItems: FaqItem[] = [
  {
    sort_order: 1,
    question: "Virker en varmepumpe også, når det fryser?",
    answer_md: "Ja. Moderne luft-til-vand-varmepumper leverer varme ned til −20 °C og lavere. Effektiviteten falder, når det er meget koldt, men det er der taget højde for i SCOP og i dimensioneringen.",
  },
  {
    sort_order: 2,
    question: "Skal jeg skifte mine radiatorer?",
    answer_md: "Som regel ikke alle. Mange huse fungerer fint med de eksisterende radiatorer. Er der enkelte små radiatorer i kolde rum, kan det betale sig at skifte netop dem. Det vurderer vi ved besigtigelsen.",
  },
  {
    sort_order: 3,
    question: "Hvor lang tid tager installationen?",
    answer_md: "En luft-til-luft-varmepumpe installeres typisk på én dag. En luft-til-vand-varmepumpe tager normalt 2–3 dage, inkl. fjernelse af det gamle fyr.",
  },
  {
    sort_order: 4,
    question: "Hvor længe holder en varmepumpe?",
    answer_md: "Med regelmæssig service holder en varmepumpe typisk 15–20 år. Jordvarmeslanger holder ofte 50 år eller mere.",
  },
  {
    sort_order: 5,
    question: "Er prisen i beregningen bindende?",
    answer_md: "Nej. Det er et vejledende prisinterval baseret på dine svar. Den endelige pris afhænger af en besigtigelse, hvor vi ser huset og dimensionerer anlægget korrekt.",
  },
  {
    sort_order: 6,
    question: "Hvad gør I med mine oplysninger?",
    answer_md: "Vi bruger kun dine oplysninger til at lave din rapport og kontakte dig, hvis du har bedt om det. Du kan altid bede os om at slette dem. Markedsføring sender vi kun, hvis du har givet særskilt samtykke.",
  },
];

# Varmepumperådgiveren – KL Køleteknik

An educational heat pump advisor for KL Køleteknik. Homeowners answer seven short steps, learn *why* each question matters ("Vidste du?" cards), and get an honest recommendation, sizing and a price range. KL Køleteknik gets a scored lead with full project data.

User-facing text is Danish; code and docs are English.

## Stack

- Next.js 16 (App Router, Cache Components, TypeScript), Tailwind CSS v4, shadcn/ui-style components in `components/ui`, Framer Motion
- Supabase (Postgres) – leads, sessions, knowledge cards, config, events
- Resend – customer report email + internal lead notification
- Vitest – unit tests for the engine
- Deploy target: Vercel

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values, see below
npm run dev                  # http://localhost:3000
npm test                     # engine unit tests
npm run lint && npm run typecheck
```

The wizard runs without any environment variables (default config, seed content, no saving, no email). Supabase and Resend are needed for leads, reports, admin and tracking.

### Database

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` (SQL editor, or `supabase db push`).
3. Run `supabase/seed.sql` to load the 13 knowledge cards, the FAQ and the config defaults.

`seed.sql` is generated from `lib/content/knowledgeCards.ts` and `lib/config/defaults.ts` with `npm run seed:generate`. Once seeded, edit content in `/admin` instead – re-running the seed overwrites knowledge cards with the same slug and replaces the FAQ, but never overwrites config rows.

RLS is enabled on every table with **no** policies, so the anon key cannot read or write anything. All access goes through server code using `SUPABASE_SERVICE_ROLE_KEY`.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | yes | Public URL, used for links in emails |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | yes | Database (server only) |
| `RESEND_API_KEY`, `EMAIL_FROM` | yes | Sending email. The from-domain must be verified in Resend |
| `EMAIL_INTERNAL_TO` | yes | Comma-separated recipients of lead notifications |
| `ADMIN_PASSWORD` | yes | Password for `/admin` |
| `ADMIN_SESSION_SECRET` | yes | ≥ 32 random characters, signs the admin cookie |
| `ADDRESS_API_URL` | no | DAWA-compatible address API (default `https://api.dataforsyningen.dk`) |
| `DATAFORDELER_API_KEY`, `BBR_API_URL` | no | Enables BBR prefill of area, year built and heating |
| `EMBED_ALLOWED_ORIGINS` | no | Sites allowed to iframe `/embed` (default klkoleteknik.dk) |
| `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GA4_ID` | no | Loaded only after cookie consent |

## How it works

```
app/
  page.tsx               standalone page
  embed/page.tsx         chrome-less page for the iframe
  rapport/[token]/       printable report (link in the customer email)
  admin/(panel)/         leads, lead detail, config, knowledge cards, funnel
  admin/login/           password login
  actions/lead.ts        submitLead (server action) – rescoring, storage, email
  api/events/            cookieless funnel tracking + progress saving (sendBeacon)
  api/adresse/, api/bbr/ address autocomplete + optional BBR proxy
components/wizard/       steps, fields, live house profile, Wizard state machine
components/result/       recommendation, economy, contact form
lib/config/defaults.ts   ALL business constants (single source of truth)
lib/engine/              pure functions: heatDemand, recommend, pricing, scoring, scoringB2B, talkingPoints
lib/content/             seed knowledge cards + FAQ, Danish labels, house profile rows
supabase/                migration + generated seed
public/embed.js          <kl-varmepumpe> web component
```

The engine is pure and runs in the browser for the live preview. On submit the server **recomputes** recommendation and score from the answers – it never trusts numbers from the client – and stores a config snapshot, so a sent report never changes when prices are edited later.

### Engine summary

- **Heat demand** = m² × era factor × insulation modifier + hot water (per person). Actual consumption overrides it when entered (oil l × 10 kWh × 0.85, gas m³ × 11 kWh × 0.95, pellets kg × 4.8 × 0.80, old heat pump kWh × 2.5).
- **Sizing** = demand ÷ 2,000 full-load hours, rounded up to a standard size.
- **Flow temperature** comes from emitter type, radiator size, the "warm at low temperature" answer and insulation, and drives SCOP (4.5 / 4.0 / 3.5 / 3.0).
- **Recommendation**: district heating installed → not suitable. District heating available → "check district heating first", with the heat pump as an alternative. Very leaky pre-1960 house (modifier ≥ 1.25) → "insulate first". Otherwise: sommerhus or no water-based system → air-to-air. Large plot and ≥ 20,000 kWh → ground source. Otherwise air-to-water.
- **Prices** are always ranges. Air-to-water and ground source are positioned within min–max by kW, plus complexity add-ons (oil tank removal, larger hot water tank, electrical upgrade on the high end for pre-1975 houses), capped at max.
- **Subsidy**: Varmepumpepuljen (27,000 kr.) for air-to-water and ground source, not for air-to-air or sommerhuse. Håndværkerfradrag is shown as a *possible* tax value and is **not** subtracted from the net price.
- **Lead score** (0–100): fit 40, value 25, intent 25, data quality 10, using the model in the brief. Model version `1.0.0` is stored with each score. District heating installed → disqualified (tier D). Outside the service area → flagged and capped at tier C. Business leads use a separate model (`b2b-1.0.0`): need 30, size 20, urgency 30, data quality 20.

## Editing prices and content (no code)

- **Prices, factors, SCOP, energy prices, subsidies, service area** → `/admin/config`. Each section is one row in the `config` table, deep-merged onto `lib/config/defaults.ts`. Changes apply to new calculations within a minute. "Nulstil til standard" deletes the override.
- **Knowledge cards** → `/admin/videnskort` (Markdown, step 0–7, order, icon, published).
- **FAQ** → edit the `faq` table in Supabase (v1 has no FAQ editor).
- **Trustpilot** → set `trustpilot.profileUrl` (plus optional score and count) in config. Only add real, verbatim reviews to `trustpilot.reviews`.
- **Service area** → `serviceArea.ranges` (inclusive postal code ranges, default 1000–3699 and 4000–4999, i.e. Zealand, Lolland-Falster and Møn, excluding Bornholm), plus `include` and `exclude` lists for individual codes.

To change the defaults permanently, edit `lib/config/defaults.ts`, then run `npm test` and `npm run seed:generate`.

## Embedding on klkoleteknik.dk

```html
<script src="https://<app-domain>/embed.js" defer></script>
<kl-varmepumpe></kl-varmepumpe>
```

The iframe resizes itself to its content and scrolls the host page to the top of the module on each step. UTM and `fbclid` parameters are forwarded. If the site already has its own cookie banner, forward the decision with `<kl-varmepumpe consent="granted">` (or `denied`) and the module will not show its own banner. Add the site's origin to `EMBED_ALLOWED_ORIGINS` – every other site is blocked from framing by `frame-ancestors`.

## Tracking and privacy

- First-party funnel events (`step_view`, `step_complete`, `card_open`, `cta_click`, `lead_submitted`) are stored anonymously by session id, with no cookies. The address is stripped from saved session answers (only the postal code is kept).
- Meta Pixel and GA4 load only after the visitor accepts cookies. Conversions fire `Lead` / `generate_lead`.
- Contact consent (required) and marketing consent (optional) are stored separately on the lead, together with `consent_text_version`.
- Progress is saved in `localStorage`, and can be resumed on another device with `?session=<id>`.

## Known limitations / to verify before go-live

- **DAWA** is being phased out by Klimadatastyrelsen. `ADDRESS_API_URL` makes it possible to switch provider. If the lookup fails, the user can still type the address and postal code by hand.
- **BBR prefill** uses Datafordeler's GraphQL service (`lib/bbr/client.ts`), because the BBR REST service is retired on 15 January 2027. It has not been tested against the live endpoint, which could not be reached from the build environment. Create an IT system and API key at portal.datafordeler.dk (log in with MitID Erhverv), then run `DATAFORDELER_API_KEY=... npm run bbr:check -- <adgangsadresse-id>` and adjust the field names if the schema differs. API keys expire after 2 years.
- **Price and subsidy assumptions** (ground source range, add-ons, labour share, deduction tax value) are starting values from the brief and must be calibrated by KL Køleteknik.
- The report is a printable HTML page ("Print / gem som PDF"), not a PDF attachment.
- The admin uses one shared password. Add Supabase Auth if more people need individual logins.

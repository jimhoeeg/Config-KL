"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadSession } from "@/app/actions/lead";
import { KnowledgeCardView } from "@/components/knowledge/KnowledgeCard";
import { ContactForm } from "@/components/result/ContactForm";
import { EconomyView } from "@/components/result/Economy";
import { RecommendationView } from "@/components/result/Recommendation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { AppConfig } from "@/lib/config/defaults";
import type { FaqItem, KnowledgeCard } from "@/lib/content/knowledgeCards";
import { labels } from "@/lib/content/labels";
import { evaluate, headlineEconomy, isHeatPump } from "@/lib/engine";
import type { Answers } from "@/lib/schema/answers";
import { saveProgress, track, trackConversion } from "@/lib/tracking/client";
import { flowFor, isStepComplete, type StepId } from "@/lib/wizard/flow";
import { HouseProfileMobile, HouseProfileSidebar } from "./HouseProfile";
import { ChoiceGroup, Question, Toggle } from "./fields";
import {
  Notice,
  StepBehov,
  StepGrund,
  StepHeading,
  StepHuset,
  StepKlimaskaerm,
  StepOpvarmning,
  StepStart,
  StepVarmeafgivelse,
  StepVirksomhed,
  type StepProps,
} from "./steps";
import { ThankYou } from "./ThankYou";

const STORAGE_KEY = "kl-vpr-v1";

interface Persisted {
  sessionId: string;
  answers: Answers;
  stepIndex: number;
  maxStep: number;
  startedAt: number;
  cardsOpened: string[];
  utm?: Record<string, string>;
  done?: { reportToken: string | null; wantsInspection: boolean; emailSent: boolean; stored?: boolean };
}

function freshState(): Persisted {
  return { sessionId: crypto.randomUUID(), answers: {}, stepIndex: 0, maxStep: 0, startedAt: Date.now(), cardsOpened: [] };
}

function readStorage(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

function readUtm(): Record<string, string> | undefined {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid", "gclid"]) {
    const v = params.get(k);
    if (v) utm[k] = v.slice(0, 200);
  }
  return Object.keys(utm).length ? utm : undefined;
}

export function Wizard({
  cfg,
  cards,
  faq,
  embedded = false,
}: {
  cfg: AppConfig;
  cards: KnowledgeCard[];
  faq: FaqItem[];
  embedded?: boolean;
}) {
  const [state, setState] = useState<Persisted | null>(null);
  const [resumeOffer, setResumeOffer] = useState<Persisted | null>(null);
  const [direction, setDirection] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  // Restore from ?session=<id> (cross-device) or localStorage, after hydration.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const remoteId = params.get("session");
      const stored = readStorage();
      let initial = freshState();
      initial.utm = readUtm();
      if (remoteId) {
        const remote = await loadSession(remoteId).catch(() => null);
        if (remote) initial = { ...initial, sessionId: remoteId, answers: remote.answers, stepIndex: remote.step, maxStep: remote.step };
      } else if (stored && !stored.done && stored.stepIndex > 0) {
        if (!cancelled) setResumeOffer(stored);
      }
      if (!cancelled) setState(initial);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist locally on every change.
  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // private mode – progress just won't survive a reload
    }
  }, [state]);

  // Embedded: report height to the parent page so the iframe can auto-size.
  useEffect(() => {
    if (!embedded || window.parent === window) return;
    const send = () => window.parent.postMessage({ type: "kl-vpr-height", height: document.documentElement.scrollHeight }, "*");
    const ro = new ResizeObserver(send);
    ro.observe(document.body);
    send();
    return () => ro.disconnect();
  }, [embedded]);

  const flow = useMemo(() => flowFor(state?.answers ?? {}), [state?.answers]);
  const step = state ? flow[Math.min(state.stepIndex, flow.length - 1)] : flow[0];
  const answers = useMemo<Answers>(() => state?.answers ?? {}, [state?.answers]);
  const evaluation = useMemo(() => (answers.segment && answers.segment !== "erhverv" ? evaluate(answers, cfg) : null), [answers, cfg]);
  const economy = evaluation ? headlineEconomy(evaluation) : null;

  // Track step views.
  const lastViewed = useRef<string | null>(null);
  useEffect(() => {
    if (!state || state.done || lastViewed.current === `${state.sessionId}:${step.id}`) return;
    lastViewed.current = `${state.sessionId}:${step.id}`;
    track(state.sessionId, { type: "step_view", step: step.id });
  }, [state, step.id]);

  const set = useCallback((patch: Partial<Answers>) => {
    setState((s) => (s ? { ...s, answers: { ...s.answers, ...patch } } : s));
  }, []);

  function scrollTop() {
    if (embedded && window.parent !== window) window.parent.postMessage({ type: "kl-vpr-scroll" }, "*");
    else topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function go(delta: 1 | -1) {
    if (!state) return;
    const nextIndex = Math.max(0, Math.min(flow.length - 1, state.stepIndex + delta));
    const maxStep = Math.max(state.maxStep, nextIndex);
    setDirection(delta);
    setState({ ...state, stepIndex: nextIndex, maxStep });
    saveProgress(
      state.sessionId,
      { step: nextIndex, maxStep, segment: state.answers.segment, answers: state.answers, embedded, utm: state.utm },
      delta === 1 ? [{ type: "step_complete", step: step.id }] : undefined,
    );
    scrollTop();
  }

  function onCardOpen(slug: string) {
    if (!state) return;
    track(state.sessionId, { type: "card_open", step: step.id, payload: { card: slug } });
    if (!state.cardsOpened.includes(slug)) setState({ ...state, cardsOpened: [...state.cardsOpened, slug] });
  }

  const engagement = () => ({
    cardsOpened: state?.cardsOpened.length ?? 0,
    secondsSpent: state ? Math.round((Date.now() - state.startedAt) / 1000) : 0,
  });

  function restart() {
    setResumeOffer(null);
    lastViewed.current = null;
    setState({ ...freshState(), utm: state?.utm });
    scrollTop();
  }

  if (!state) {
    return <div className="mx-auto min-h-[60vh] max-w-6xl px-4 py-8" aria-busy />;
  }

  if (state.done) {
    return (
      <div ref={topRef} className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <ThankYou done={state.done} business={answers.segment === "erhverv"} cards={cards} faq={faq} onRestart={restart} onCardOpen={onCardOpen} />
      </div>
    );
  }

  const stepCards = step.cardStep !== undefined ? cards.filter((c) => c.step === step.cardStep) : [];
  const complete = isStepComplete(step.id, answers);
  const isLast = state.stepIndex === flow.length - 1;
  const progress = (state.stepIndex / (flow.length - 1)) * 100;
  const props: StepProps = { a: answers, set, cfg };

  return (
    <div ref={topRef} className="mx-auto max-w-6xl scroll-mt-4 px-4 pb-28 pt-4 sm:pt-8 lg:pb-12">
      {state.stepIndex > 0 && (
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>
              Trin {state.stepIndex} af {flow.length - 1} · {step.title}
            </span>
            <span>{Math.round(progress)} %</span>
          </div>
          <Progress value={progress} label="Fremskridt" />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0">
          {resumeOffer && state.stepIndex === 0 && (
            <div className="mb-6 flex flex-col gap-3 rounded-xl border border-primary/20 bg-secondary p-4 sm:flex-row sm:items-center">
              <p className="flex-1 text-sm">
                <b>Velkommen tilbage!</b> Du nåede til trin {resumeOffer.stepIndex}. Vil du fortsætte, hvor du slap?
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setState(resumeOffer);
                    setResumeOffer(null);
                  }}
                >
                  Fortsæt
                </Button>
                <Button size="sm" variant="outline" onClick={() => setResumeOffer(null)}>
                  Start forfra
                </Button>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-6"
            >
              <StepBody
                id={step.id}
                props={props}
                evaluation={evaluation}
                economy={economy}
                state={state}
                engagement={engagement}
                onDone={(res, wantsInspection) => {
                  trackConversion(wantsInspection ? "inspection" : "report");
                  setState({ ...state, done: { reportToken: res.reportToken, wantsInspection, emailSent: res.emailSent, stored: res.stored } });
                  scrollTop();
                }}
                onCta={(mode) => track(state.sessionId, { type: "cta_click", step: step.id, payload: { mode } })}
              />

              {stepCards.length > 0 && (
                <div className="space-y-2.5">
                  {stepCards.map((c) => (
                    <KnowledgeCardView key={c.slug} card={c} onOpen={onCardOpen} />
                  ))}
                </div>
              )}

              {!isLast && (
                <div className="flex items-center gap-3 pt-2">
                  {state.stepIndex > 0 && (
                    <Button variant="ghost" onClick={() => go(-1)}>
                      <ArrowLeft /> Tilbage
                    </Button>
                  )}
                  <Button className="ml-auto min-w-40" size="lg" variant={state.stepIndex === 0 ? "accent" : "default"} disabled={!complete} onClick={() => go(1)}>
                    {state.stepIndex === 0 ? "Kom i gang" : flow[state.stepIndex + 1]?.id === "anbefaling" ? "Se min anbefaling" : "Næste"} <ArrowRight />
                  </Button>
                </div>
              )}
              {!isLast && !complete && state.stepIndex > 0 && <p className="text-right text-xs text-muted-foreground">Besvar spørgsmålene ovenfor for at fortsætte.</p>}
              {isLast && (
                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" onClick={() => go(-1)}>
                    <ArrowLeft /> Tilbage
                  </Button>
                  <Button variant="ghost" size="sm" onClick={restart}>
                    <RotateCcw /> Start forfra
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        {state.stepIndex > 0 && <HouseProfileSidebar a={answers} cfg={cfg} />}
      </div>
      {state.stepIndex > 0 && <HouseProfileMobile a={answers} cfg={cfg} />}
    </div>
  );
}

function StepBody({
  id,
  props,
  evaluation,
  economy,
  state,
  engagement,
  onDone,
  onCta,
}: {
  id: StepId;
  props: StepProps;
  evaluation: ReturnType<typeof evaluate> | null;
  economy: ReturnType<typeof headlineEconomy>;
  state: Persisted;
  engagement: () => { cardsOpened: number; secondsSpent: number };
  onDone: React.ComponentProps<typeof ContactForm>["onDone"];
  onCta: React.ComponentProps<typeof ContactForm>["onCta"];
}) {
  const { a, set } = props;
  switch (id) {
    case "start":
      return <StepStart {...props} />;
    case "huset":
      return <StepHuset {...props} />;
    case "opvarmning":
      return <StepOpvarmning {...props} />;
    case "klimaskaerm":
      return <StepKlimaskaerm {...props} />;
    case "varmeafgivelse":
      return <StepVarmeafgivelse {...props} />;
    case "grund":
      return <StepGrund {...props} />;
    case "virksomhed":
      return <StepVirksomhed {...props} />;
    case "behov":
      return <StepBehov {...props} />;
    case "anbefaling":
      return (
        <>
          <StepHeading title="Vores anbefaling til dit hus" text="Bygget ud fra dine svar – og med en ærlig forklaring på hvorfor." />
          {evaluation && <RecommendationView evaluation={evaluation} />}
        </>
      );
    case "oekonomi":
      return (
        <>
          <StepHeading title="Økonomi og din rapport" />
          {economy && evaluation ? (
            <EconomyView evaluation={evaluation} economy={economy} />
          ) : (
            <Notice>
              Fordi en varmepumpe ikke er det rette valg for dit hus, viser vi ikke et prisoverslag. Vil du alligevel have en snak, sender vi gerne rapporten med vores
              begrundelse – eller ringer dig op.
            </Notice>
          )}
          <Question title="Hvornår forventer du at komme i gang?">
            <ChoiceGroup
              name="timeline"
              value={a.timeline}
              onChange={(timeline) => set({ timeline })}
              options={Object.entries(labels.timeline).map(([value, label]) => ({ value: value as NonNullable<Answers["timeline"]>, label }))}
            />
          </Question>
          {economy && isHeatPump(economy.solution) && (
            <Question title={`Er du interesseret i serviceabonnementet "Tryghed i ${economy.service.years} år"?`}>
              <Toggle label="Serviceabonnement" checked={a.serviceInterest} onChange={(serviceInterest) => set({ serviceInterest })} />
            </Question>
          )}
          <ContactForm answers={a} sessionId={state.sessionId} engagement={engagement} onDone={onDone} onCta={onCta} />
        </>
      );
    case "kontakt":
      return (
        <>
          <StepHeading title="Hvem skal vi kontakte?" text="En specialist i erhvervskøl og -varme ringer dig op og tager den derfra." />
          <ContactForm answers={a} sessionId={state.sessionId} engagement={engagement} business onDone={onDone} onCta={onCta} />
        </>
      );
  }
}

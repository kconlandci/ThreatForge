"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronRight, ChevronsRight, Play, X } from "lucide-react";
import type { StageBus, ToStage } from "@/lib/game/bus";
import { CARDS } from "@/lib/game/cards";
import { validTargets } from "@/lib/game/engine";
import type { BattleState, BattleStatus, CardDef, Encounter, PlayResult } from "@/lib/game/types";
import {
  agentShortName,
  autoInspectedIds,
  eventsToBeats,
  newEvents,
  readingMs,
  resolvedCount,
  useBattle,
  type Beat,
  type ToastSpec,
} from "@/lib/game/useBattle";
import { BattleLog } from "./BattleLog";
import { EvidencePanel } from "./EvidencePanel";
import { Hand } from "./Hand";
import type { IntentStamp } from "./IntentCard";
import { IntentList, type IntentItem } from "./IntentList";
import { Meters } from "./Meters";
import { OutcomeToast, type ActiveToast } from "./OutcomeToast";
import { RecentActions } from "./RecentActions";
import s from "./battle.module.css";

export interface BattleViewProps {
  encounter: Encounter;
  initial: BattleState;
  bus: StageBus;
  /** The stage slot element (the Phaser stage is portaled into it). */
  stage: ReactNode;
  stageReady: boolean;
  reducedMotion: boolean;
  /** Called with every committed state (save it). */
  onSave: (state: BattleState) => void;
  /** The player asked to see the result screen. */
  onShowResult: (state: BattleState) => void;
}

interface Phase {
  prev: BattleState;
  beats: Beat[];
  rest: Beat[];
  shown: number;
}

interface Leaving {
  stepId: string;
  index: number;
  turn: number;
  stamp: IntentStamp;
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const PROMPT: Partial<Record<CardDef["id"], string>> = {
  inspect: "Pick a plan to inspect.",
  block: "Pick a plan to block.",
  escalate: "Pick a plan to send to Dana.",
  rollback: "Pick a done action to undo.",
};

const VERB: Partial<Record<CardDef["id"], string>> = {
  inspect: "Inspect",
  block: "Block",
  escalate: "Escalate",
  rollback: "Roll Back",
};

function stampFor(beat: Beat): IntentStamp {
  return beat.safe ? { label: "Done", tone: "good" } : { label: `Risk +${beat.risk ?? 0}`, tone: "bad" };
}

function endCopy(status: BattleStatus): { title: string; text: string } {
  if (status === "won") return { title: "Shift complete!", text: "Every plan is handled." };
  if (status === "lost-breach") return { title: "Breach!", text: "Risk hit the limit." };
  return { title: "Out of time!", text: "The shift is over." };
}

/** Clone a card and fly it at its target (pure DOM, so React can drop the real card at once). */
function flyCard(cardEl: HTMLElement | null, targetEl: HTMLElement | null, host: HTMLElement | null) {
  if (!cardEl || !host || typeof cardEl.animate !== "function") return;
  const r = cardEl.getBoundingClientRect();
  const ghost = cardEl.cloneNode(true) as HTMLElement;
  ghost.setAttribute("aria-hidden", "true");
  ghost.setAttribute("tabindex", "-1");
  ghost.removeAttribute("data-uid");
  ghost.style.setProperty("--cw", getComputedStyle(cardEl).getPropertyValue("--cw"));
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    margin: "0",
    zIndex: "90",
    pointerEvents: "none",
    translate: "none",
    rotate: "none",
    scale: "none",
    transition: "none",
  });
  host.appendChild(ghost);
  const t = targetEl?.getBoundingClientRect();
  const dx = t ? t.left + t.width / 2 - (r.left + r.width / 2) : 0;
  const dy = t ? t.top + t.height / 2 - (r.top + r.height / 2) : -180;
  const anim = ghost.animate(
    [
      { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 30}px) scale(0.9) rotate(-6deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.3) rotate(10deg)`, opacity: 0 },
    ],
    { duration: 460, easing: "cubic-bezier(0.3, 0.7, 0.3, 1)" },
  );
  anim.onfinish = () => ghost.remove();
  anim.oncancel = () => ghost.remove();
}

export function BattleView({
  encounter,
  initial,
  bus,
  stage,
  stageReady,
  reducedMotion,
  onSave,
  onShowResult,
}: BattleViewProps) {
  const { state, play, endTurn } = useBattle(encounter, initial, onSave);
  const latest = useRef(state);
  latest.current = state;

  const rootRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const endTurnRef = useRef<HTMLButtonElement>(null);
  const playNoneRef = useRef<HTMLButtonElement>(null);
  const resultBtnRef = useRef<HTMLButtonElement>(null);
  const cardEls = useRef(new Map<string, HTMLButtonElement>());
  const intentEls = useRef(new Map<string, HTMLButtonElement>());
  const trayEls = useRef(new Map<string, HTMLButtonElement>());

  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<{ id: string; reveal: boolean } | null>(null);
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const [log, setLog] = useState<{ id: number; text: string }[]>([]);
  const [phase, setPhase] = useState<Phase | null>(null);
  const phaseRef = useRef<Phase | null>(null);
  const [banner, setBanner] = useState<{ turn: number; announced: number; key: number } | null>(null);
  const [leaving, setLeaving] = useState<Leaving[]>([]);
  const [ended, setEnded] = useState<BattleStatus | null>(state.status === "playing" ? null : state.status);
  const [height, setHeight] = useState(760);
  const intentsRef = useRef<HTMLDivElement>(null);
  const [moreBelow, setMoreBelow] = useState(false);
  const counter = useRef(0);
  const focusTargetsNext = useRef(false);
  const focusHandNext = useRef<number | null>(null);

  const agent = agentShortName(encounter);
  const agentFull = encounter.agent.name;

  /* ---------------------------------------------------------------- */
  /* Outputs: stage, log, toasts                                       */
  /* ---------------------------------------------------------------- */

  const toStage = useCallback((msgs: ToStage[]) => msgs.forEach((m) => bus.toStage.emit(m)), [bus]);

  const addLog = useCallback((lines: string[]) => {
    if (!lines.length) return;
    setLog((prev) => [...prev, ...lines.map((text) => ({ id: ++counter.current, text }))].slice(-30));
  }, []);

  const showToast = useCallback((spec: ToastSpec, ms: number, nextLabel?: string) => {
    setToast({ ...spec, id: ++counter.current, ms, nextLabel });
  }, []);

  const hint = useCallback(
    (text: string) => {
      showToast({ tone: "hint", title: "", text }, 2800);
      addLog([text]);
    },
    [showToast, addLog],
  );

  /* ---------------------------------------------------------------- */
  /* Beats                                                             */
  /* ---------------------------------------------------------------- */

  const showBanner = useCallback((turn: number, announced: number) => {
    setBanner({ turn, announced, key: ++counter.current });
  }, []);

  const endBattle = useCallback(
    (status: BattleStatus) => {
      setEnded(status);
      setSelectedUid(null);
      setEvidence(null);
      toStage([{ type: "agent-mood", mood: status === "won" ? "celebrate" : status === "lost-breach" ? "busted" : "sad" }]);
    },
    [toStage],
  );

  const applyRest = useCallback(
    (beats: Beat[]) => {
      for (const b of beats) {
        toStage(b.stage);
        addLog(b.log);
        if (b.kind === "turn" && b.turn) showBanner(b.turn, b.announced ?? 0);
        if (b.kind === "end" && b.status) endBattle(b.status);
      }
    },
    [toStage, addLog, showBanner, endBattle],
  );

  const showAgentBeat = useCallback(
    (ph: Phase, index: number) => {
      const b = ph.beats[index];
      const next: Phase = { ...ph, shown: index + 1 };
      phaseRef.current = next;
      setPhase(next);
      toStage(b.stage);
      addLog(b.log);
      const last = index === ph.beats.length - 1;
      const endsBattle = ph.rest.some((r) => r.kind === "end");
      if (b.toast) showToast(b.toast, readingMs(b.toast, 3600, 8500), last ? (endsBattle ? "Finish" : "Next turn") : "Next");
    },
    [toStage, addLog, showToast],
  );

  const finishPhase = useCallback(() => {
    const ph = phaseRef.current;
    if (!ph) return;
    phaseRef.current = null;
    setPhase(null);
    setToast(null);
    applyRest(ph.rest);
  }, [applyRest]);

  const advance = useCallback(() => {
    const ph = phaseRef.current;
    if (!ph) {
      setToast(null);
      return;
    }
    if (ph.shown < ph.beats.length) showAgentBeat(ph, ph.shown);
    else finishPhase();
  }, [showAgentBeat, finishPhase]);

  const skipPhase = useCallback(() => {
    const ph = phaseRef.current;
    if (!ph) return;
    for (let i = ph.shown; i < ph.beats.length; i++) addLog(ph.beats[i].log);
    finishPhase();
  }, [addLog, finishPhase]);

  // Toast timer: during the agent's turn it advances to the next beat.
  useEffect(() => {
    if (!toast) return;
    const id = toast.id;
    const t = window.setTimeout(() => {
      setToast((cur) => (cur && cur.id === id && !phaseRef.current ? null : cur));
      if (phaseRef.current) advance();
    }, toast.ms);
    return () => window.clearTimeout(t);
  }, [toast, advance]);

  // Turn banner lifetime.
  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), reducedMotion ? 1400 : 1600);
    return () => window.clearTimeout(t);
  }, [banner, reducedMotion]);

  // Leaving intents clear after their stamp + exit animation.
  useEffect(() => {
    if (!leaving.length) return;
    const t = window.setTimeout(() => setLeaving([]), reducedMotion ? 900 : 1450);
    return () => window.clearTimeout(t);
  }, [leaving, reducedMotion]);

  // Opening beat: announce the turn (fresh battle or resumed save). Once per mount.
  const opened = useRef(false);
  useEffect(() => {
    const s0 = latest.current;
    if (s0.status !== "playing" || opened.current) return;
    opened.current = true;
    showBanner(s0.turn, s0.announced.length);
    toStage([{ type: "agent-mood", mood: s0.announced.length ? "eager" : "idle" }]);
    addLog([
      `${encounter.title}. Turn ${s0.turn} of ${encounter.maxTurns}. ${agentFull} has ${s0.announced.length} ${
        s0.announced.length === 1 ? "plan" : "plans"
      }.`,
    ]);
    headingRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stage just became ready: sync its mood.
  useEffect(() => {
    if (!stageReady) return;
    const s0 = latest.current;
    toStage([{ type: "agent-mood", mood: s0.status !== "playing" ? "idle" : s0.announced.length ? "eager" : "idle" }]);
  }, [stageReady, toStage]);

  // Height decides whether quips clamp to one line.
  useIsoLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    setHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  /* ---------------------------------------------------------------- */
  /* Actions                                                           */
  /* ---------------------------------------------------------------- */

  const locked = phase !== null || ended !== null || state.status !== "playing";
  const selectedCard = selectedUid ? state.hand.find((c) => c.uid === selectedUid) : undefined;
  const selectedDef = selectedCard ? CARDS[selectedCard.cardId] : undefined;
  const targets = useMemo(
    () => (selectedCard && !locked ? new Set(validTargets(state, encounter, selectedCard.cardId)) : null),
    [selectedCard, locked, state, encounter],
  );

  const tryPlay = useCallback(
    (uid: string, targetStepId?: string, viaKeyboard = false): PlayResult => {
      const prev = latest.current;
      const handIndex = prev.hand.findIndex((c) => c.uid === uid);
      const cardEl = cardEls.current.get(uid) ?? null;
      const targetEl = targetStepId ? intentEls.current.get(targetStepId) ?? trayEls.current.get(targetStepId) ?? null : null;
      const r = play(uid, targetStepId);
      if (!r.ok) {
        hint(r.reason);
        return r;
      }
      if (!reducedMotion) flyCard(cardEl, targetEl, rootRef.current);
      setSelectedUid(null);
      const next = r.state;
      const beats = eventsToBeats(newEvents(prev, next), encounter);
      let reveal: string | undefined;
      for (const b of beats) {
        toStage(b.stage);
        addLog(b.log);
        if (b.toast) showToast(b.toast, readingMs(b.toast));
        if (b.openEvidence) reveal = b.openEvidence;
        if (b.kind === "end" && b.status) endBattle(b.status);
      }
      // Intents the play removed get a stamp, then slide away.
      const gone: Leaving[] = [];
      prev.announced.forEach((id, index) => {
        if (next.announced.includes(id)) return;
        const rt = next.steps[id];
        const stamp: IntentStamp =
          rt.status === "blocked"
            ? { label: "Caught!", tone: "good" }
            : rt.status === "escalated"
              ? encounter.steps.find((x) => x.id === id)?.safe
                ? { label: "Escalated", tone: "warn" }
                : { label: "Caught!", tone: "good" }
              : { label: "False alarm", tone: "warn" };
        gone.push({ stepId: id, index, turn: prev.turn, stamp });
      });
      if (gone.length) setLeaving((l) => [...l, ...gone]);
      setEvidence(reveal ? { id: reveal, reveal: true } : null);
      if (viaKeyboard && !reveal) focusHandNext.current = handIndex;
      return r;
    },
    [play, hint, reducedMotion, encounter, toStage, addLog, showToast, endBattle],
  );

  const onSelectCard = useCallback(
    (uid: string, viaKeyboard: boolean) => {
      if (locked) return;
      if (selectedUid === uid) {
        setSelectedUid(null);
        return;
      }
      setSelectedUid(uid);
      focusTargetsNext.current = viaKeyboard;
    },
    [locked, selectedUid],
  );

  const onIntent = useCallback(
    (stepId: string, viaKeyboard: boolean) => {
      if (phaseRef.current) return;
      if (selectedUid && !locked) {
        tryPlay(selectedUid, stepId, viaKeyboard);
        return;
      }
      setEvidence({ id: stepId, reveal: false });
    },
    [selectedUid, locked, tryPlay],
  );

  const onTray = useCallback(
    (stepId: string, viaKeyboard: boolean) => {
      if (phaseRef.current) return;
      if (selectedUid && !locked) {
        tryPlay(selectedUid, stepId, viaKeyboard);
        return;
      }
      setEvidence({ id: stepId, reveal: false });
    },
    [selectedUid, locked, tryPlay],
  );

  const onEndTurn = useCallback(() => {
    if (locked) return;
    setSelectedUid(null);
    setEvidence(null);
    setToast(null);
    const prev = latest.current;
    const next = endTurn();
    if (next === prev) return;
    const beats = eventsToBeats(newEvents(prev, next), encounter);
    const agentBeats = beats.filter((b) => b.kind === "agent");
    const rest = beats.filter((b) => b.kind !== "agent");
    addLog([`You let ${agent} proceed.`]);
    if (!agentBeats.length) {
      applyRest(rest);
      return;
    }
    showAgentBeat({ prev, beats: agentBeats, rest, shown: 0 }, 0);
  }, [locked, endTurn, encounter, agent, addLog, applyRest, showAgentBeat]);

  // Keyboard: after selecting a card, move focus to its first target (or its Play button).
  useEffect(() => {
    if (!focusTargetsNext.current) return;
    focusTargetsNext.current = false;
    if (!selectedDef) return;
    if (selectedDef.target === "none") {
      playNoneRef.current?.focus();
      return;
    }
    const first = targets ? [...targets][0] : undefined;
    const el = first ? intentEls.current.get(first) ?? trayEls.current.get(first) : undefined;
    el?.focus();
  }, [selectedDef, targets]);

  // The intent list can scroll on short screens: fade its bottom edge while more is below.
  const checkMore = useCallback(() => {
    const el = intentsRef.current;
    if (!el) return;
    setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);
  useIsoLayoutEffect(() => {
    checkMore();
  });

  // A card was picked: make sure its first target is on screen.
  useEffect(() => {
    if (!targets || targets.size === 0) return;
    const first = [...targets][0];
    const el = intentEls.current.get(first);
    if (el && intentsRef.current) {
      const box = intentsRef.current.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (r.top < box.top || r.bottom > box.bottom) el.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
    }
  }, [targets, reducedMotion]);

  // Keyboard: after a play, focus the card that took its place (or End turn).
  useEffect(() => {
    const i = focusHandNext.current;
    if (i === null) return;
    focusHandNext.current = null;
    const hand = state.hand;
    const card = hand[Math.min(i, hand.length - 1)];
    const el = card ? cardEls.current.get(card.uid) : null;
    (el ?? endTurnRef.current)?.focus();
  }, [state.hand]);

  // When the battle ends (and the last outcome has been read), offer the result screen,
  // and go there on its own after a moment.
  const showEnd = ended !== null && !toast;
  useEffect(() => {
    if (!showEnd) return;
    const focus = window.setTimeout(() => resultBtnRef.current?.focus({ preventScroll: true }), 60);
    const auto = window.setTimeout(() => onShowResult(latest.current), 4500);
    return () => {
      window.clearTimeout(focus);
      window.clearTimeout(auto);
    };
  }, [showEnd, onShowResult]);

  /* ---------------------------------------------------------------- */
  /* View model                                                        */
  /* ---------------------------------------------------------------- */

  const shownBeats = phase ? phase.beats.slice(0, phase.shown) : [];
  const view = phase ? phase.prev : state;
  const risk = phase ? phase.prev.risk + shownBeats.reduce((n, b) => n + (b.risk ?? 0), 0) : state.risk;
  const resolved = phase ? resolvedCount(phase.prev) + shownBeats.length : resolvedCount(state);

  const items: IntentItem[] = useMemo(() => {
    if (phase) {
      return phase.prev.announced.map((id, i) => ({
        stepId: id,
        keySuffix: phase.prev.turn,
        stamp: i < phase.shown ? stampFor(phase.beats[i]) : null,
        running: i === phase.shown - 1,
        animateIn: true,
      }));
    }
    const list: IntentItem[] = state.announced.map((id) => ({ stepId: id, keySuffix: state.turn, animateIn: true }));
    for (const l of leaving) {
      if (l.turn !== state.turn || list.some((x) => x.stepId === l.stepId)) continue;
      list.splice(Math.min(l.index, list.length), 0, { stepId: l.stepId, keySuffix: l.turn, stamp: l.stamp, leaving: true });
    }
    return list;
  }, [phase, state.announced, state.turn, leaving]);

  const autoInspected = useMemo(() => autoInspectedIds(view), [view]);
  const liveCount = items.filter((i) => !i.leaving).length;
  const compact = (liveCount >= 3 && height < 860) || (liveCount >= 2 && height < 660);
  const intentTargeting =
    selectedDef && selectedDef.target === "intent" && targets ? { valid: targets, verb: VERB[selectedDef.id] ?? "Play" } : null;
  const trayTargets = selectedDef && selectedDef.target === "executed" && targets ? targets : null;
  const willRun = state.announced.length;

  let promptTitle = "";
  let promptText = "";
  if (selectedDef) {
    promptText = selectedDef.text;
    if (selectedDef.cost > state.energy) promptTitle = `Not enough energy. ${selectedDef.name} costs ${selectedDef.cost}.`;
    else if (selectedDef.target === "none") promptTitle = selectedDef.name;
    else if (targets && targets.size === 0)
      promptTitle =
        selectedDef.target === "executed"
          ? "Nothing to roll back right now."
          : selectedDef.id === "inspect"
            ? "Every plan is already inspected."
            : "No plans to pick right now.";
    else promptTitle = PROMPT[selectedDef.id] ?? "Pick a target.";
  }

  const endInfo = ended && showEnd ? endCopy(ended) : null;

  return (
    <div className={s.frame}>
      <aside className={s.side} aria-label="Dana's rules">
        <div className={s.note}>
          <p className={s.noteEyebrow}>Dana&apos;s rules</p>
          <p className={s.noteTitle}>3 questions before you approve</p>
          <ol className={s.noteList}>
            <li>Who asked?</li>
            <li>Does it match the record?</li>
            <li>Can we undo it?</li>
          </ol>
          <p className={s.noteFoot}>Inspect first. Evidence beats vibes.</p>
        </div>
        <div className={s.legend}>
          <p className={s.feedTitle}>How a turn works</p>
          <p>
            <span className={s.legendGem} aria-hidden="true">
              1
            </span>
            Cards cost energy. You get {encounter.energyPerTurn} each turn.
          </p>
          <p>Pick a card, then pick a plan.</p>
          <p>When you let {agent} proceed, every plan left on the board runs.</p>
        </div>
      </aside>
      <section
        ref={rootRef}
        className={s.battle}
        aria-labelledby="hl-battle-title"
        onKeyDown={(e) => {
          if (e.key === "Escape" && selectedUid) {
            const uid = selectedUid;
            setSelectedUid(null);
            cardEls.current.get(uid)?.focus();
          }
        }}
      >
        <h1 id="hl-battle-title" ref={headingRef} tabIndex={-1} className={s.srOnly}>
          {encounter.title}: supervise {agentFull}
        </h1>

        <Meters
          risk={risk}
          maxRisk={encounter.maxRisk}
          resolved={resolved}
          total={encounter.steps.length}
          turn={view.turn}
          maxTurns={encounter.maxTurns}
          energy={view.energy}
          maxEnergy={encounter.energyPerTurn}
        />

        <div className={s.stageWrap}>
          {!stageReady ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={s.stageFallback} src="/game/sprites/resetbot-idle.svg" alt="" width={220} height={220} />
          ) : null}
          {stage}
          {banner && !toast ? (
            <div key={banner.key} className={s.turnBanner} aria-hidden="true">
              <div className={s.turnRibbon}>
                <strong>Turn {banner.turn}</strong>
                <span>
                  {banner.announced === 0
                    ? `${agent} is thinking…`
                    : `${agent} has ${banner.announced} new ${banner.announced === 1 ? "plan" : "plans"}`}
                </span>
              </div>
            </div>
          ) : null}
          <OutcomeToast toast={toast} onDismiss={advance} />
          <RecentActions
            state={view}
            encounter={encounter}
            targets={trayTargets}
            onActivate={onTray}
            registerTarget={(id, el) => {
              if (el) trayEls.current.set(id, el);
              else trayEls.current.delete(id);
            }}
          />
          {endInfo ? (
            <div className={s.endOverlay}>
              <div className={s.endCard}>
                <strong>{endInfo.title}</strong>
                <span className="text-[15px] text-ink-soft">{endInfo.text}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div ref={intentsRef} className={`${s.intents} ${moreBelow ? s.intentsScroll : ""}`} onScroll={checkMore}>
          <IntentList
            items={items}
            encounter={encounter}
            state={view}
            autoInspected={autoInspected}
            targeting={intentTargeting}
            compact={compact}
            headingId="hl-intents-title"
            over={ended !== null}
            onActivate={onIntent}
            registerIntent={(id, el) => {
              if (el) intentEls.current.set(id, el);
              else intentEls.current.delete(id);
            }}
          />
        </div>

        <div className={s.handZone}>
          <Hand
            hand={view.hand}
            energy={view.energy}
            selectedUid={selectedUid}
            locked={locked}
            dealKey={view.turn}
            onSelect={onSelectCard}
            registerCard={(uid, el) => {
              if (el) cardEls.current.set(uid, el);
              else cardEls.current.delete(uid);
            }}
          />
        </div>

        <div className={s.actionBar}>
          {ended ? (
            <button
              ref={resultBtnRef}
              type="button"
              className={s.playButton}
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => onShowResult(latest.current)}
            >
              See how you did
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : phase ? (
            <>
              <p className={s.prompt} aria-hidden="true">
                <span className={`${s.promptTitle} ${s.working}`}>
                  {agent} is working
                  <span className={s.dots}>
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
                <span className={`${s.promptText} block`}>
                  Plan {Math.max(1, phase.shown)} of {phase.beats.length}
                </span>
              </p>
              <button type="button" className={s.iconButton} style={{ width: "auto", paddingInline: 14 }} onClick={skipPhase}>
                <span className="font-display text-[15px] font-semibold">Skip</span>
                <ChevronsRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          ) : selectedDef ? (
            <>
              <button
                type="button"
                className={s.iconButton}
                aria-label={`Cancel ${selectedDef.name}`}
                onClick={() => {
                  const uid = selectedUid;
                  setSelectedUid(null);
                  if (uid) cardEls.current.get(uid)?.focus({ preventScroll: true });
                }}
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
              <p className={s.prompt} aria-live="polite">
                <span className={`${s.promptTitle} block`}>{promptTitle}</span>
                <span className={`${s.promptText} block`}>{promptText}</span>
              </p>
              {selectedDef.target === "none" && selectedUid ? (
                <button ref={playNoneRef} type="button" className={s.playButton} onClick={() => tryPlay(selectedUid, undefined, true)}>
                  <Play className="h-4 w-4" aria-hidden="true" fill="currentColor" />
                  Play
                </button>
              ) : null}
            </>
          ) : (
            <button
              ref={endTurnRef}
              type="button"
              className={`${s.endTurn} ${state.energy === 0 || state.hand.length === 0 ? s.nudge : ""}`}
              aria-disabled={locked || undefined}
              aria-label={`Let ${agent} proceed: ${willRun} ${willRun === 1 ? "plan" : "plans"} will run.`}
              onClick={onEndTurn}
            >
              Let {agent} proceed
              <span className={s.countBadge} aria-hidden="true">
                {willRun}
              </span>
              <Play className="h-4 w-4" aria-hidden="true" fill="currentColor" />
            </button>
          )}
        </div>

        <BattleLog lines={log.slice(-8)} />

        <EvidencePanel
          stepId={evidence?.id ?? null}
          encounter={encounter}
          state={state}
          autoInspected={autoInspected}
          reveal={!!evidence?.reveal && !reducedMotion}
          canAct={!locked}
          onPlay={(uid, stepId) => tryPlay(uid, stepId)}
          onClose={() => setEvidence(null)}
          returnFocusRef={endTurnRef}
        />
      </section>
      <aside className={s.side} aria-hidden="true">
        <div className={s.feed}>
          <p className={s.feedTitle}>Shift log</p>
          <ol className={s.feedList}>
            {log
              .slice()
              .reverse()
              .slice(0, 14)
              .map((l) => (
                <li key={l.id}>{l.text}</li>
              ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}

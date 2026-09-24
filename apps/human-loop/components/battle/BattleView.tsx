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
  /** The player's first shift: show the how-a-turn-works coach until they play a card. */
  firstShift?: boolean;
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

/** After a new turn starts, "Let ResetBot proceed" ignores taps for a moment (no double-tap skips a turn). */
const TURN_COOLDOWN_MS = 700;

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
  firstShift = false,
}: BattleViewProps) {
  const { state, play, endTurn } = useBattle(encounter, initial, onSave);
  const latest = useRef(state);
  latest.current = state;

  const rootRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const endTurnRef = useRef<HTMLButtonElement>(null);
  const playNoneRef = useRef<HTMLButtonElement>(null);
  const resultBtnRef = useRef<HTMLButtonElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const actionBarRef = useRef<HTMLDivElement>(null);
  const toastAnchorRef = useRef<HTMLDivElement>(null);
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const insetSent = useRef("");
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
  // Turn cooldown: a new turn ignores "proceed" briefly, so a double tap on Skip can't end it unseen.
  const turnReadyAt = useRef(0);
  const [turnCooling, setTurnCooling] = useState(0);
  const endTurnViaFocus = useRef(false);
  // Player-phase toasts pause while the pointer or focus is on them, or the tab is hidden.
  const [toastHold, setToastHold] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const toastLeft = useRef({ id: 0, left: 0 });
  const [coach, setCoach] = useState(
    () => firstShift && initial.status === "playing" && initial.turn === 1 && !initial.events.some((e) => e.t === "card-played"),
  );

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

  const armTurn = useCallback(() => {
    turnReadyAt.current = performance.now() + TURN_COOLDOWN_MS;
    setTurnCooling((c) => c + 1);
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
        if (b.kind === "turn" && b.turn) {
          showBanner(b.turn, b.announced ?? 0);
          armTurn();
        }
        if (b.kind === "end" && b.status) endBattle(b.status);
      }
    },
    [toStage, addLog, showBanner, armTurn, endBattle],
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
      // Agent beats wait for the player ("Next" / "Skip"): the consequence is the lesson, so it never times out.
      if (b.toast) showToast(b.toast, 0, last ? (endsBattle ? "Finish" : "Next turn") : "Next");
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

  // Toast timer (player-phase toasts only; agent beats wait for Next). It pauses while the toast is
  // hovered, touched or focused, and while the tab is hidden, then resumes with the time that was left.
  useEffect(() => {
    if (!toast || toast.nextLabel || toastHold || pageHidden) return;
    const id = toast.id;
    if (toastLeft.current.id !== id) toastLeft.current = { id, left: toast.ms };
    const start = performance.now();
    const t = window.setTimeout(() => setToast((cur) => (cur && cur.id === id ? null : cur)), toastLeft.current.left);
    return () => {
      window.clearTimeout(t);
      if (toastLeft.current.id === id) toastLeft.current.left = Math.max(0, toastLeft.current.left - (performance.now() - start));
    };
  }, [toast, toastHold, pageHidden]);

  // A new toast starts un-held (the old one may have unmounted under the pointer).
  const toastId = toast?.id;
  useEffect(() => {
    setToastHold(false);
  }, [toastId]);

  useEffect(() => {
    const on = () => setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  // Turn cooldown lifetime (the ref is the real guard; this state only updates the button's look).
  useEffect(() => {
    if (!turnCooling) return;
    const t = window.setTimeout(() => setTurnCooling(0), Math.max(0, turnReadyAt.current - performance.now()));
    return () => window.clearTimeout(t);
  }, [turnCooling]);

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
    armTurn();
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

  // The "Done" tray covers the bottom of the stage: tell the stage, so ResetBot sits above it.
  useIsoLayoutEffect(() => {
    const tray = stageWrapRef.current?.querySelector<HTMLElement>("[data-tray]");
    const h = tray ? Math.round(tray.offsetHeight) : 0;
    // Send again once the stage is ready (it misses messages sent before it started).
    const key = `${h}:${stageReady}`;
    if (key === insetSent.current) return;
    insetSent.current = key;
    bus.toStage.emit({ type: "stage-inset", bottom: h });
  });
  useEffect(() => () => bus.toStage.emit({ type: "stage-inset", bottom: 0 }), [bus]);

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
      setCoach(false);
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
    if (locked || phaseRef.current || performance.now() < turnReadyAt.current) return;
    endTurnViaFocus.current = document.activeElement === endTurnRef.current;
    setCoach(false);
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

  // Focus: the proceed button is swapped for Skip while the agent works, and back afterwards.
  // Keep keyboard and screen-reader focus on the action bar instead of dropping it to <body>.
  const hadPhase = useRef(false);
  const phaseOn = phase !== null;
  useEffect(() => {
    const ae = document.activeElement;
    const lost = !ae || ae === document.body;
    if (phaseOn && !hadPhase.current) {
      if (endTurnViaFocus.current || lost) skipRef.current?.focus({ preventScroll: true });
      endTurnViaFocus.current = false;
    } else if (!phaseOn && hadPhase.current) {
      if (lost || actionBarRef.current?.contains(ae) || toastAnchorRef.current?.contains(ae)) {
        (resultBtnRef.current ?? endTurnRef.current)?.focus({ preventScroll: true });
      }
    }
    hadPhase.current = phaseOn;
  }, [phaseOn]);

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

  // When the battle ends (and the last outcome has been read), offer the result screen.
  // It waits for the player: no timed jump away from the last outcome.
  const showEnd = ended !== null && !toast;
  useEffect(() => {
    if (!showEnd) return;
    const focus = window.setTimeout(() => resultBtnRef.current?.focus({ preventScroll: true }), 60);
    return () => window.clearTimeout(focus);
  }, [showEnd]);

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
  // Quips keep their punchlines: clamp (to two lines) only when three plans share a short screen.
  const clampQuip = liveCount >= 3 && height < 740;
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
          <p className={s.noteFoot}>Inspect first. Trust evidence, not feelings.</p>
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

        {/* Toasts hang from the meters over the stage (and the plan list if they need the room),
            so a long outcome is never clipped by the stage on short phones. */}
        <div ref={toastAnchorRef} className={s.toastAnchor}>
          <OutcomeToast toast={toast} paused={toastHold || pageHidden} onHold={setToastHold} onDismiss={advance} />
        </div>

        <div ref={stageWrapRef} className={s.stageWrap}>
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
          {coach && !banner && !toast && !ended ? (
            <div className={s.coach} role="note" aria-label="How a turn works">
              <p>
                <strong>Tap a card, then tap a plan.</strong> Cards cost energy: you get {encounter.energyPerTurn} each
                turn. <strong>Done?</strong> Tap “Let {agent} proceed”. Every plan left on the board runs.
              </p>
              <button type="button" className={s.coachClose} aria-label="Hide these tips" onClick={() => setCoach(false)}>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
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
            clampQuip={clampQuip}
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
            maxHeight={height}
            onSelect={onSelectCard}
            registerCard={(uid, el) => {
              if (el) cardEls.current.set(uid, el);
              else cardEls.current.delete(uid);
            }}
          />
        </div>

        <div
          ref={actionBarRef}
          className={s.actionBar}
          onKeyDownCapture={(e) => {
            // A held Enter/Space must not click through Skip, then proceed, then the next turn.
            if (e.repeat && (e.key === "Enter" || e.key === " ")) e.preventDefault();
          }}
        >
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
              <button
                ref={skipRef}
                type="button"
                className={s.iconButton}
                style={{ width: "auto", paddingInline: 14 }}
                onClick={skipPhase}
              >
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
              <p className={s.prompt}>
                <span className={`${s.promptTitle} block`}>{promptTitle}</span>
                <span className={`${s.promptText} block`}>{promptText}</span>
                <span className={`${s.promptFlavor} block`}>{selectedDef.flavor}</span>
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
              className={`${s.endTurn} ${!turnCooling && (state.energy === 0 || state.hand.length === 0) ? s.nudge : ""}`}
              aria-disabled={locked || turnCooling > 0 || undefined}
              aria-label={`Let ${agent} proceed: ${willRun} ${willRun === 1 ? "plan" : "plans"} will run.`}
              onClick={onEndTurn}
            >
              Let {agent} proceed
              <span className={s.countBadge} aria-hidden="true">
                {willRun} {willRun === 1 ? "plan" : "plans"}
              </span>
              <Play className="h-4 w-4" aria-hidden="true" fill="currentColor" />
            </button>
          )}
        </div>

        {/* One persistent live region for the card prompt, so it is announced when a card is picked. */}
        <p className={s.srOnly} aria-live="polite">
          {selectedDef ? `${promptTitle} ${promptText}` : ""}
        </p>

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

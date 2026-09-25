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
import { ChevronRight, ChevronsRight, Lock, Play, Target, X } from "lucide-react";
import type { StageBus, ToStage } from "@/lib/game/bus";
import { CARDS } from "@/lib/game/cards";
import { coachHint, plainHint, sheetCoach } from "@/lib/game/coach";
import { validTargets } from "@/lib/game/engine";
import { liveGrade } from "@/lib/game/skillsView";
import type { BattleState, BattleStatus, CardDef, CardId, Encounter, PlayResult } from "@/lib/game/types";
import {
  agentShortName,
  autoInspectedIds,
  deckAtTurn,
  eventsToBeats,
  groupHand,
  newCardIds,
  newEvents,
  readingMs,
  resolvedCount,
  stepById,
  unlockedThisTurn,
  useBattle,
  type Beat,
  type ToastSpec,
} from "@/lib/game/useBattle";
import { BattleLog } from "./BattleLog";
import { EnergyOrb } from "./EnergyOrb";
import { EvidencePanel } from "./EvidencePanel";
import { Hand } from "./Hand";
import { HintText } from "./HintText";
import type { IntentStamp } from "./IntentCard";
import { IntentList, type IntentItem } from "./IntentList";
import { Meters } from "./Meters";
import { OutcomeToast, type ActiveToast, type ToastChip } from "./OutcomeToast";
import { RecentActions } from "./RecentActions";
import { SpeakerFace } from "./SpeakerFace";
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
  /** The player's first real shift: Dana's hint line adds the first-shift tips. */
  firstShift?: boolean;
  /** Drills: the skill's "Where to look" line for the top of the evidence sheet (until Solid). */
  sheetNote?: string | null;
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

/** After a new turn starts, "Approve" ignores taps for a moment (no double-tap skips a turn). */
const TURN_COOLDOWN_MS = 700;

const VERB: Partial<Record<CardDef["id"], string>> = {
  inspect: "Inspect",
  block: "Block",
  escalate: "Escalate",
  rollback: "Roll Back",
};

function stampFor(beat: Beat): IntentStamp {
  return beat.safe ? { label: "Done", tone: "good" } : { label: `Risk +${beat.risk ?? 0}`, tone: "bad" };
}

function endCopy(status: BattleStatus, practice: boolean): { title: string; text: string } {
  if (practice) {
    return status === "won"
      ? { title: "Practice done!", text: "Every ticket is handled." }
      : { title: "Practice is over", text: "Some tickets are still waiting." };
  }
  if (status === "won") return { title: "Shift complete!", text: "Every plan is handled." };
  if (status === "lost-breach") return { title: "Breach!", text: "Risk hit the limit." };
  return { title: "Out of time!", text: "The shift is over." };
}

/** The turn banner's two lines. */
function bannerCopy(
  enc: Encounter,
  turn: number,
  announced: number,
  unlocked: boolean,
  returned: boolean,
): { title: string; sub: string } {
  const agent = agentShortName(enc);
  const last = turn >= enc.maxTurns;
  if (enc.practice) {
    return {
      title: returned ? "It's back" : "New ticket",
      sub: last ? "Last turn!" : returned ? `${agent} is trying again` : `${agent} has a plan`,
    };
  }
  return {
    title: `Turn ${turn}${unlocked ? " · New card!" : ""}`,
    sub: last
      ? "Last turn!"
      : turn === enc.maxTurns - 1
        ? "2 turns left"
        : announced === 0
          ? `${agent} is thinking…`
          : `${announced} new ${announced === 1 ? "plan" : "plans"}`,
  };
}

/** Laptop-sized screens have room for quips on up to two plans. */
function useRoomy(): boolean {
  const [roomy, setRoomy] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1100px) and (min-height: 820px)");
    const on = () => setRoomy(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return roomy;
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
  sheetNote = null,
}: BattleViewProps) {
  const { state, play, endTurn } = useBattle(encounter, initial, onSave);
  const latest = useRef(state);
  latest.current = state;
  const practice = !!encounter.practice;

  const rootRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // One ref for the main action button, whatever it says (Approve / Next / See how you did), so
  // focus that falls back to "the main button" always lands on something that exists.
  const endTurnRef = useRef<HTMLButtonElement>(null);
  const resultBtnRef = useRef<HTMLButtonElement>(null);
  const mainRef = useCallback((el: HTMLButtonElement | null) => {
    endTurnRef.current = el;
    resultBtnRef.current = el && el.dataset.main === "result" ? el : null;
  }, []);
  const playNoneRef = useRef<HTMLButtonElement>(null);
  // After each agent beat, "Next" ignores taps briefly, so a double tap never skips an outcome unseen.
  const beatReadyAt = useRef(0);
  const actionBarRef = useRef<HTMLDivElement>(null);
  const toastAnchorRef = useRef<HTMLDivElement>(null);
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const insetSent = useRef("");
  const cardEls = useRef(new Map<CardId, HTMLButtonElement>());
  const intentEls = useRef(new Map<string, HTMLButtonElement>());
  const trayEls = useRef(new Map<string, HTMLButtonElement>());

  const [selectedCardId, setSelectedCardId] = useState<CardId | null>(null);
  const [evidence, setEvidence] = useState<{ id: string; reveal: boolean } | null>(null);
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const [log, setLog] = useState<{ id: number; text: string }[]>([]);
  const [phase, setPhase] = useState<Phase | null>(null);
  const phaseRef = useRef<Phase | null>(null);
  const [banner, setBanner] = useState<{ title: string; sub: string; key: number } | null>(null);
  const [leaving, setLeaving] = useState<Leaving[]>([]);
  const [ended, setEnded] = useState<BattleStatus | null>(state.status === "playing" ? null : state.status);
  const [height, setHeight] = useState(760);
  const intentsRef = useRef<HTMLDivElement>(null);
  const [moreBelow, setMoreBelow] = useState(false);
  const counter = useRef(0);
  const focusTargetsNext = useRef(false);
  const focusHandNext = useRef<number | null>(null);
  // Turn cooldown: a new turn ignores "Approve" briefly, so a double tap on Skip can't end it unseen.
  const turnReadyAt = useRef(0);
  const [turnCooling, setTurnCooling] = useState(0);
  const endTurnViaFocus = useRef(false);
  // Player-phase toasts pause while the pointer or focus is on them, or the tab is hidden.
  const [toastHold, setToastHold] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const toastLeft = useRef({ id: 0, left: 0 });
  // A locked control was tapped: the hint line shakes once (and the ring pulses).
  const [shakeKey, setShakeKey] = useState(0);
  const roomy = useRoomy();

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

  const nudge = useCallback(() => {
    const root = document.getElementById("hl-game-root");
    if (root) root.dataset.nudge = root.dataset.nudge === "a" ? "b" : "a";
    setShakeKey((k) => k + 1);
  }, []);

  /* ---------------------------------------------------------------- */
  /* Beats                                                             */
  /* ---------------------------------------------------------------- */

  const showBanner = useCallback(
    (turn: number, announced: number, unlocked: boolean) => {
      const st = latest.current;
      const first = st.announced[0];
      const returned = !!first && (st.steps[first]?.requeues ?? 0) > 0;
      setBanner({ ...bannerCopy(encounter, turn, announced, unlocked, returned), key: ++counter.current });
    },
    [encounter],
  );

  const armTurn = useCallback(() => {
    turnReadyAt.current = performance.now() + TURN_COOLDOWN_MS;
    setTurnCooling((c) => c + 1);
  }, []);

  const endBattle = useCallback(
    (status: BattleStatus) => {
      setEnded(status);
      setSelectedCardId(null);
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
          showBanner(b.turn, b.announced ?? 0, (b.unlocked?.length ?? 0) > 0);
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
      if (b.toast) showToast(b.toast, 0, last ? (endsBattle ? "Finish" : practice ? "Next ticket" : "Next turn") : "Next");
      beatReadyAt.current = performance.now() + 350;
    },
    [toStage, addLog, showToast, practice],
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
    if (performance.now() < beatReadyAt.current) return;
    if (ph.shown < ph.beats.length) showAgentBeat(ph, ph.shown);
    else finishPhase();
  }, [showAgentBeat, finishPhase]);

  // "Skip" only skips the plain "Done." beats: it stops at the next plan that added risk, because
  // that consequence is the lesson.
  const skipPhase = useCallback(() => {
    const ph = phaseRef.current;
    if (!ph) return;
    let i = ph.shown;
    while (i < ph.beats.length && !((ph.beats[i].risk ?? 0) > 0 || ph.beats[i].safe === false)) {
      addLog(ph.beats[i].log);
      i++;
    }
    if (i < ph.beats.length) showAgentBeat(ph, i);
    else finishPhase();
  }, [addLog, finishPhase, showAgentBeat]);
  const phaseHasRiskAhead = (ph: Phase) =>
    ph.beats.slice(ph.shown).some((b) => (b.risk ?? 0) > 0 || b.safe === false);

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
    showBanner(s0.turn, s0.announced.length, unlockedThisTurn(s0).length > 0);
    armTurn();
    toStage([{ type: "agent-mood", mood: s0.announced.length ? "eager" : "idle" }]);
    addLog([
      practice
        ? `${encounter.title}. ${encounter.subtitle}. ${agentFull} has a plan.`
        : `${encounter.title}. Turn ${s0.turn} of ${encounter.maxTurns}. ${agentFull} has ${s0.announced.length} ${
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

  // The "Done" tray covers the bottom of the stage: tell the stage, so Ollie sits above it.
  // While the tray is hidden (before Roll Back unlocks) the inset is 0.
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

  // Column height: the hand shrinks on short screens.
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
  const selectedUid = selectedCardId ? state.hand.find((c) => c.cardId === selectedCardId)?.uid ?? null : null;
  const selectedDef = selectedUid && selectedCardId ? CARDS[selectedCardId] : undefined;
  const targets = useMemo(
    () => (selectedDef && !locked ? new Set(validTargets(state, encounter, selectedDef.id)) : null),
    [selectedDef, locked, state, encounter],
  );

  const tryPlay = useCallback(
    (uid: string, targetStepId?: string, viaKeyboard = false): PlayResult => {
      const prev = latest.current;
      const card = prev.hand.find((c) => c.uid === uid);
      const stacks = groupHand(prev.hand, newCardIds(prev));
      const stackIndex = card ? stacks.findIndex((x) => x.cardId === card.cardId) : -1;
      const cardEl = card ? cardEls.current.get(card.cardId) ?? null : null;
      const targetEl = targetStepId ? intentEls.current.get(targetStepId) ?? trayEls.current.get(targetStepId) ?? null : null;
      const r = play(uid, targetStepId);
      if (!r.ok) {
        hint(r.reason);
        return r;
      }
      if (!reducedMotion) flyCard(cardEl, targetEl, rootRef.current);
      setSelectedCardId(null);
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
              ? next.events.some((e) => e.t === "escalated-safe" && e.stepId === id)
                ? { label: "Escalated", tone: "warn" }
                : { label: "Caught!", tone: "good" }
              : { label: "False alarm", tone: "warn" };
        gone.push({ stepId: id, index, turn: prev.turn, stamp });
      });
      if (gone.length) setLeaving((l) => [...l, ...gone]);
      setEvidence(reveal ? { id: reveal, reveal: true } : null);
      if (viaKeyboard && !reveal) focusHandNext.current = stackIndex;
      return r;
    },
    [play, hint, reducedMotion, encounter, toStage, addLog, showToast, endBattle],
  );

  const onSelectCard = useCallback(
    (cardId: CardId, viaKeyboard: boolean) => {
      if (locked) return;
      if (selectedCardId === cardId) {
        setSelectedCardId(null);
        return;
      }
      setSelectedCardId(cardId);
      focusTargetsNext.current = viaKeyboard;
    },
    [locked, selectedCardId],
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

  const onTray = onIntent;

  const onEndTurn = useCallback(() => {
    if (locked || phaseRef.current || performance.now() < turnReadyAt.current) return;
    endTurnViaFocus.current = document.activeElement === endTurnRef.current;
    setSelectedCardId(null);
    setEvidence(null);
    setToast(null);
    const prev = latest.current;
    const n = prev.announced.length;
    const next = endTurn();
    if (next === prev) return;
    const beats = eventsToBeats(newEvents(prev, next), encounter);
    const agentBeats = beats.filter((b) => b.kind === "agent");
    const rest = beats.filter((b) => b.kind !== "agent");
    addLog([n > 0 ? `You approved ${n} ${n === 1 ? "plan" : "plans"}.` : practice ? "Next ticket." : "Next turn."]);
    if (!agentBeats.length) {
      applyRest(rest);
      return;
    }
    showAgentBeat({ prev, beats: agentBeats, rest, shown: 0 }, 0);
  }, [locked, endTurn, encounter, addLog, applyRest, showAgentBeat, practice]);

  // Focus: the Approve button is swapped for "Next" while the agent works, and back afterwards.
  // Keep keyboard and screen-reader focus on the action bar instead of dropping it to <body>.
  const hadPhase = useRef(false);
  const phaseOn = phase !== null;
  useEffect(() => {
    const ae = document.activeElement;
    const lost = !ae || ae === document.body;
    if (phaseOn && !hadPhase.current) {
      if (endTurnViaFocus.current || lost) endTurnRef.current?.focus({ preventScroll: true });
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

  // Keyboard: after a play, focus the stack that took its place (or Approve).
  useEffect(() => {
    const i = focusHandNext.current;
    if (i === null) return;
    focusHandNext.current = null;
    const cur = latest.current;
    const stacks = groupHand(cur.hand, newCardIds(cur));
    const stack = i >= 0 ? stacks[Math.min(i, stacks.length - 1)] : undefined;
    const el = stack ? cardEls.current.get(stack.cardId) : null;
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

  // Screen readers only announce changes to a live region that is already on the page, so the
  // hint region mounts empty and is filled a moment later (and on every change after that).
  const [announce, setAnnounce] = useState("");

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
  const showQuip = liveCount <= 1 || (roomy && liveCount <= 2);
  const intentTargeting =
    selectedDef && selectedDef.target === "intent" && targets ? { valid: targets, verb: VERB[selectedDef.id] ?? "Play" } : null;
  const trayTargets = selectedDef && selectedDef.target === "executed" && targets ? targets : null;
  const willRun = state.announced.length;
  const newIds = useMemo(() => newCardIds(view), [view]);
  const stacks = useMemo(() => groupHand(view.hand, newIds), [view.hand, newIds]);
  // The Done tray appears with Roll Back, the only card that uses it (never in practice).
  const showTray = !practice && deckAtTurn(encounter, view.turn).includes("rollback");

  // Dana's hint line, its ring and (practice tickets 1-2) its locks. Recomputed from state every render.
  const coach =
    !phase && !ended && state.status === "playing"
      ? coachHint(state, encounter, { selectedCardId: selectedDef ? selectedDef.id : null, sheetStepId: evidence?.id ?? null, firstShift })
      : null;
  const lock = coach?.lock;
  const approveLocked = !!lock?.approve;
  const coachCard = coach?.target?.startsWith("card:") && !selectedDef ? (coach.target.slice(5) as CardId) : null;
  const sheetHint = evidence && !phase && !ended ? sheetCoach(state, encounter, evidence.id, { selectedCardId: null }) : null;

  // After a plan resolves, its toast names the skill it tested and how it went (not in practice).
  const chipStep = !practice && toast?.stepId ? stepById(encounter, toast.stepId) : undefined;
  // The shape shows only once the outcome is final (liveGrade), so it never disagrees with the result screen.
  const canRollBack = state.status === "playing" && deckAtTurn(encounter, encounter.maxTurns).includes("rollback");
  const chip: ToastChip | null = chipStep?.skill
    ? { skill: chipStep.skill, ...liveGrade(chipStep, state.steps[chipStep.id], { canRollBack }) }
    : null;
  const drillTitle = encounter.mode === "drill" ? encounter.title : null;

  const endInfo = ended && showEnd ? endCopy(ended, practice) : null;
  const coachId = coach?.id ?? null;
  const coachTarget = coach?.target ?? null;
  const nextLabel = practice ? "Next ticket" : "Next turn";
  const mainLabel = willRun > 0 ? `Approve ${willRun} ${willRun === 1 ? "plan" : "plans"}` : nextLabel;
  // The accessible name starts with the visible label (voice control users say what they see).
  const mainAria =
    `${mainLabel}.` +
    (willRun > 0 ? ` ${agent} does ${willRun === 1 ? "it" : "them"} now.` : "") +
    (approveLocked && lock ? ` Locked: ${lock.label}.` : "");
  const liveText = selectedDef && coach ? `${plainHint(coach.text)} ${selectedDef.text}` : coach ? plainHint(coach.text) : "";
  useEffect(() => {
    const t = window.setTimeout(() => setAnnounce(liveText), 150);
    return () => window.clearTimeout(t);
  }, [liveText]);

  // Short screens (landscape phones) scroll the column: bring the control Dana names into view,
  // once per new hint.
  useEffect(() => {
    if (!coachId || !coachTarget) return;
    const el = coachTarget.startsWith("card:")
      ? cardEls.current.get(coachTarget.slice(5) as CardId)
      : coachTarget === "plan"
        ? rootRef.current?.querySelector<HTMLElement>("[data-coach='on']")
        : null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const bottom = actionBarRef.current?.getBoundingClientRect().top ?? window.innerHeight;
    if (r.top >= 0 && r.bottom <= bottom) return;
    el.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  return (
    <div className={s.frame}>
      <section
        ref={rootRef}
        className={s.battle}
        aria-labelledby="hl-battle-title"
        onKeyDown={(e) => {
          if (e.key === "Escape" && selectedCardId) {
            const id = selectedCardId;
            setSelectedCardId(null);
            cardEls.current.get(id)?.focus();
          }
        }}
      >
        <h1 id="hl-battle-title" ref={headingRef} tabIndex={-1} className={s.srOnly}>
          {encounter.title}: supervise {agentFull}
        </h1>

        {drillTitle ? (
          <p className={s.drillHead}>
            <Target className="h-4 w-4 flex-none" strokeWidth={2.6} aria-hidden="true" />
            {drillTitle}
          </p>
        ) : null}

        <Meters
          risk={risk}
          maxRisk={encounter.maxRisk}
          done={resolved}
          total={encounter.steps.length}
          turn={view.turn}
          maxTurns={encounter.maxTurns}
          showTurn={!practice}
        />

        {/* Toasts hang from the meters over the stage (and the plan list if they need the room),
            so a long outcome is never clipped by the stage on short phones. */}
        <div ref={toastAnchorRef} className={s.toastAnchor}>
          <OutcomeToast toast={toast} chip={chip} paused={toastHold || pageHidden} onHold={setToastHold} onDismiss={advance} />
        </div>

        <div ref={stageWrapRef} className={s.stageWrap}>
          {!stageReady ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={s.stageFallback} src="/game/sprites/ollie-idle.svg" alt="" width={220} height={220} />
          ) : null}
          {stage}
          {banner && !toast ? (
            <div key={banner.key} className={s.turnBanner} aria-hidden="true">
              <div className={s.turnRibbon}>
                <strong>{banner.title}</strong>
                <span>{banner.sub}</span>
              </div>
            </div>
          ) : null}
          {showTray ? (
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
          ) : null}
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
            showQuip={showQuip}
            headingId="hl-intents-title"
            over={ended !== null}
            coach={coach?.target === "plan"}
            quietEmpty={!!coach?.text}
            onActivate={onIntent}
            registerIntent={(id, el) => {
              if (el) intentEls.current.set(id, el);
              else intentEls.current.delete(id);
            }}
          />
        </div>

        <div className={s.handZone}>
          {!practice ? <EnergyOrb energy={view.energy} max={encounter.energyPerTurn} coach={coach?.target === "energy"} /> : null}
          <Hand
            stacks={stacks}
            energy={view.energy}
            selectedCardId={selectedDef ? selectedDef.id : null}
            locked={locked}
            dealKey={view.turn}
            maxHeight={height}
            showCost={!practice}
            newIds={newIds}
            lockedCards={lock?.cards ?? []}
            lockedLabel={lock?.label}
            emptyText={coach?.text || ended || practice ? null : "No cards left this turn."}
            coachCardId={coachCard}
            onSelect={onSelectCard}
            onLockedTap={nudge}
            registerCard={(id, el) => {
              if (el) cardEls.current.set(id, el);
              else cardEls.current.delete(id);
            }}
          />
        </div>

        <div
          ref={actionBarRef}
          className={s.actionBar}
          onKeyDownCapture={(e) => {
            // A held Enter/Space must not click through Skip, then Approve, then the next turn.
            if (e.repeat && (e.key === "Enter" || e.key === " ")) e.preventDefault();
          }}
        >
          {ended ? (
            <button ref={mainRef} type="button" data-main="result" className={s.mainBtn} onClick={() => onShowResult(latest.current)}>
              See how you did
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : phase ? (
            <>
              <div className={s.workingRow}>
                <p className={s.working} aria-hidden="true">
                  {agent} is working
                  {phase.beats.length >= 2 ? ` · Plan ${Math.max(1, phase.shown)} of ${phase.beats.length}` : ""}
                  <span className={s.dots}>
                    <i />
                    <i />
                    <i />
                  </span>
                </p>
                {phase.shown < phase.beats.length ? (
                  <button type="button" className={s.skipLink} onClick={skipPhase}>
                    {phaseHasRiskAhead(phase) ? "Skip to the next risk" : "Skip"}
                    <ChevronsRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              {/* The same spot as Approve: each tap shows one outcome ("Next"), never skips it. */}
              <button ref={mainRef} type="button" className={s.mainBtn} onClick={advance}>
                {toast?.nextLabel ?? "Next"}
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          ) : selectedDef && selectedCardId ? (
            <>
              <div className={s.promptRow} aria-hidden="true">
                <p className={s.promptTitle}>{coach ? <HintText text={coach.text} /> : null}</p>
                <p className={s.promptText}>{selectedDef.text}</p>
              </div>
              <div className={s.btnRow}>
                <button
                  type="button"
                  className={s.cancelBtn}
                  aria-label={`Cancel ${selectedDef.name}`}
                  onClick={() => {
                    const id = selectedCardId;
                    setSelectedCardId(null);
                    cardEls.current.get(id)?.focus({ preventScroll: true });
                  }}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                  Cancel
                </button>
                {selectedDef.target === "none" && selectedUid ? (
                  <button ref={playNoneRef} type="button" className={s.playBtn} onClick={() => tryPlay(selectedUid, undefined, true)}>
                    <Play className="h-4 w-4" aria-hidden="true" fill="currentColor" />
                    Play
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <>
              {coach?.text ? (
                <p key={shakeKey} className={`${s.hintRow} ${shakeKey ? s.hintShake : ""}`} aria-hidden="true">
                  <SpeakerFace speaker="dana" size={28} />
                  <span className={s.hintText}>
                    <HintText text={coach.text} />
                  </span>
                </p>
              ) : null}
              <button
                ref={mainRef}
                type="button"
                className={`${s.mainBtn} ${approveLocked ? s.isLocked : ""}`}
                aria-disabled={locked || turnCooling > 0 || approveLocked || undefined}
                aria-label={mainAria}
                data-coach={coach?.target === "approve" ? "on" : undefined}
                onClick={approveLocked ? nudge : onEndTurn}
              >
                {approveLocked ? <Lock className="h-5 w-5" aria-hidden="true" /> : null}
                {mainLabel}
                <Play className="h-4 w-4" aria-hidden="true" fill="currentColor" />
              </button>
            </>
          )}
        </div>

        {/* One persistent live region for Dana's hint (and the card prompt), announced when it changes. */}
        <p className={s.srOnly} aria-live="polite">
          {announce}
        </p>

        <BattleLog lines={log.slice(-8)} />

        <EvidencePanel
          stepId={evidence?.id ?? null}
          encounter={encounter}
          state={state}
          autoInspected={autoInspected}
          reveal={!!evidence?.reveal && !reducedMotion}
          canAct={!locked}
          showCost={!practice}
          coach={sheetHint}
          note={sheetNote}
          shakeKey={shakeKey}
          onLockedTap={nudge}
          onPlay={(uid, stepId) => tryPlay(uid, stepId)}
          onClose={() => setEvidence(null)}
          returnFocusRef={endTurnRef}
        />
      </section>
    </div>
  );
}

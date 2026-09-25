"use client";

/**
 * /play/<pathway>: the whole game on one screen, for one pathway (the `pathway` prop). Everything
 * pathway-specific (content, cast, copy, room) comes from that bundle; the tree below reads it
 * with usePathway().
 *
 * State machine: boot -> (resume | intro | hub) -> battle -> result -> (battle | hub).
 * One Phaser stage lives for the whole visit. It is portaled into a detached host node that
 * each view's <StageSlot> adopts, so switching views never restarts Phaser.
 *
 * Save wiring (lib/client/save.ts): intro seen, hub position, the in-progress battle after
 * every action, and history / attempts / wins / best when a battle ends.
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Accessibility,
  BookOpen,
  Building,
  ChevronDown,
  LayoutGrid,
  List,
  Menu,
  Play,
  RotateCcw,
  Target,
} from "lucide-react";
import { BattleView } from "@/components/battle/BattleView";
import { PracticeResult } from "@/components/battle/PracticeResult";
import { ResultScreen } from "@/components/battle/ResultScreen";
import { ShiftResult, type SkillMove } from "@/components/battle/ShiftResult";
import { SkillsScreen } from "@/components/skills/SkillsScreen";
import { Sheet } from "@/components/battle/Sheet";
import { cardIcon } from "@/components/battle/icons";
import { HubOverlay, type HubChooser, type ResumeKind } from "@/components/hub/HubOverlay";
import { IntroSequence } from "@/components/hub/IntroSequence";
import { ShiftIntro } from "@/components/hub/ShiftIntro";
import { RoomList } from "@/components/hub/RoomList";
import { DciLogo } from "@/components/site/Logo";
import { preloadStage } from "@/lib/client/preloadStage";
import { prefetchSvgs } from "@/components/game/stage/svgCache";
import { getPathwayProgress, loadSave, practiceDone, syncFromCloud, updateSave, type SaveData } from "@/lib/client/save";
import { createBus, type StageMode } from "@/lib/game/bus";
import { canResume, createBattle, deckAtTurn, scoreBattle } from "@/lib/game/engine";
import type { HubTargetId } from "@/lib/game/hub";
import { stageSprites } from "@/lib/game/hubMap";
import { drillCoach } from "@/lib/game/coach";
import { applyBattle, localDay, shiftTally, skillChanges } from "@/lib/game/mastery";
import { skillName } from "@/lib/game/skills";
import { beginShift } from "@/lib/game/shiftGen";
import { dailyDoneToday, dailyNote, dailyUnlocked, hasSkills, nextUpSkill, planLines, weakestInShift } from "@/lib/game/skillsView";
import type { BattleState, CardId, Encounter, HistoryEntry, MasterySkillId, PathwayProgress, ShiftSpec } from "@/lib/game/types";
import { HAND_ORDER } from "@/lib/game/useBattle";
import { PathwayProvider, usePathway } from "@/lib/pathways/context";
import type { PathwayBundle } from "@/lib/pathways/types";
import g from "./GameShell.module.css";

const PhaserStage = dynamic(() => import("@/components/game/PhaserStage"), { ssr: false });

/** A Daily practice or drill battle (its encounter is rebuilt from progress.shift). */
function isGenerated(enc: Encounter): boolean {
  return enc.mode === "daily" || enc.mode === "drill";
}

/** "brief": the one-screen intro before a Daily practice or drill (its battle is already saved). */
type View = "boot" | "resume" | "intro" | "hub" | "brief" | "battle" | "result" | "skills";

/** The player's local day (the one clock read; everything below takes it as input). */
function today(): string {
  return localDay(new Date());
}

/**
 * Save and planning helpers bound to one pathway. Anything that belongs to a saved battle uses
 * pathway.encounterFor(battle.encounterId, progress).
 */
function pathwayOps(pathway: PathwayBundle) {
  const id = pathway.id;
  const progressOf = (s: SaveData) => getPathwayProgress(s, id);
  return {
    progressOf,
    patchProgress(fn: (p: PathwayProgress) => PathwayProgress): SaveData {
      return updateSave((s) => ({ ...s, pathways: { ...s.pathways, [id]: fn(progressOf(s)) } }));
    },
    /** A saved battle that is still in progress and fits the current content of its own encounter. */
    resumable(b: BattleState | null | undefined, p: PathwayProgress | null | undefined): BattleState | null {
      return b && b.status === "playing" && canResume(b, pathway.encounterFor(b.encounterId, p)) ? b : null;
    },
    /** Plan the next Daily practice (pure: the same progress gives the same shift, so the preview is the real thing). */
    nextDaily(p: PathwayProgress, playerId: string): ShiftSpec {
      return pathway.planDaily(p, { playerId, today: today() });
    },
    nextDrill(p: PathwayProgress, playerId: string, skill: MasterySkillId): ShiftSpec {
      return pathway.planDrill(p, skill, { playerId, today: today() });
    },
    practiceDone(p: PathwayProgress): boolean {
      return practiceDone(p, id);
    },
  };
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function newSeed(): number {
  const buf = new Uint32Array(1);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(buf);
  else buf[0] = Math.floor(Math.random() * 2 ** 32);
  return buf[0] >>> 0;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Adopts the shared stage host node while mounted. */
function StageSlot({ host, className }: { host: HTMLDivElement | null; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || !host) return;
    el.appendChild(host);
    return () => {
      if (host.parentNode === el) el.removeChild(host);
    };
  }, [host]);
  return <div ref={ref} className={className ?? g.fill} />;
}

/* ------------------------------------------------------------------ */
/* Top bar + menu                                                      */
/* ------------------------------------------------------------------ */

function GameMenu({
  view,
  battleOver,
  reducedMotion,
  onToggleMotion,
  onOfficeList,
  onLeaveBattle,
  onHowTo,
  onPracticeAgain,
  canPracticeAgain,
  onSkills,
}: {
  view: View;
  /** The battle has ended (its result screen is one tap away): no "Pause". */
  battleOver: boolean;
  reducedMotion: boolean;
  onToggleMotion: () => void;
  onOfficeList: () => void;
  onLeaveBattle: () => void;
  onHowTo: () => void;
  onPracticeAgain: () => void;
  /** False while a real shift is saved: practice would take its battle slot and lose it. */
  canPracticeAgain: boolean;
  /** "Your skills" (only once there are skills to show). */
  onSkills?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    const t = window.setTimeout(() => boxRef.current?.querySelector<HTMLElement>("button, a")?.focus(), 20);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.clearTimeout(t);
    };
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus();
  };
  // Focus the Menu button first, so a sheet opened from the menu returns focus there when it closes.
  const run = (fn: () => void) => () => {
    close(true);
    fn();
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={g.menuButton}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
        Menu
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <div
          ref={boxRef}
          id={menuId}
          className={g.menu}
          role="group"
          aria-label="Game menu"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          onBlur={(e) => {
            // Tabbing out of the menu closes it (it would cover the office otherwise).
            const to = e.relatedTarget as Node | null;
            if (to && !boxRef.current?.contains(to) && to !== btnRef.current) setOpen(false);
          }}
        >
          <button type="button" role="switch" aria-checked={reducedMotion} className={g.menuItem} onClick={onToggleMotion}>
            <span className={g.menuIcon} aria-hidden="true">
              <Accessibility className="h-5 w-5" />
            </span>
            Reduce motion
            <span className={`${g.switch} ${reducedMotion ? g.switchOn : ""}`} aria-hidden="true" />
          </button>
          <button type="button" className={g.menuItem} onClick={run(onHowTo)}>
            <span className={g.menuIcon} aria-hidden="true">
              <BookOpen className="h-5 w-5" />
            </span>
            How to play
          </button>
          {view === "hub" || view === "intro" || view === "resume" ? (
            <button type="button" className={g.menuItem} onClick={run(onOfficeList)}>
              <span className={g.menuIcon} aria-hidden="true">
                <List className="h-5 w-5" />
              </span>
              Office list
            </button>
          ) : null}
          {view === "hub" && onSkills ? (
            <button type="button" className={g.menuItem} onClick={run(onSkills)}>
              <span className={g.menuIcon} aria-hidden="true">
                <Target className="h-5 w-5" />
              </span>
              Your skills
            </button>
          ) : null}
          {view === "hub" && canPracticeAgain ? (
            <button type="button" className={g.menuItem} onClick={run(onPracticeAgain)}>
              <span className={g.menuIcon} aria-hidden="true">
                <RotateCcw className="h-5 w-5" />
              </span>
              Practice again
            </button>
          ) : null}
          {view === "battle" && !battleOver ? (
            <button type="button" className={g.menuItem} onClick={run(onLeaveBattle)}>
              <span className={g.menuIcon} aria-hidden="true">
                <Building className="h-5 w-5" />
              </span>
              Pause: back to the office
            </button>
          ) : null}
          <div className={g.divider} />
          <Link href="/play" className={g.menuItem}>
            <span className={g.menuIcon} aria-hidden="true">
              <LayoutGrid className="h-5 w-5" />
            </span>
            Choose a pathway
          </Link>
        </div>
      ) : null}
    </>
  );
}

/** Cards to list in "How to play": the practice pair, the cards unlocked so far, or all six. */
export interface HowDeck {
  practice: boolean;
  cards: CardId[];
}

const ALL_CARDS: HowDeck = { practice: false, cards: HAND_ORDER };

function HowToPlay({ open, deck, onClose }: { open: boolean; deck: HowDeck; onClose: () => void }) {
  const titleId = useId();
  const { agent, coach, config, cardCopy } = usePathway();
  const agentShort = agent.name.split(" ")[0];
  return (
    <Sheet
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      header={
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-teal">{config.copy.guideEyebrow}</p>
          <h2 id={titleId} className="mt-0.5 font-display text-xl font-bold text-ink">
            How to play
          </h2>
        </div>
      }
    >
      {deck.practice ? (
        <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-[16px] leading-relaxed text-ink">
          <li>{agentShort} shows a plan.</li>
          <li>Tap Inspect, then the plan, to see the evidence.</li>
          <li>Something wrong? Block it. Looks fine? Approve.</li>
        </ol>
      ) : (
        <>
          <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-[16px] leading-relaxed text-ink">
            <li>
              <strong className="font-display">Check.</strong> Tap Inspect, then a plan, to see the evidence.
            </li>
            <li>
              <strong className="font-display">Decide.</strong> Block what&apos;s wrong. Not sure? Escalate to {coach.name}.
            </li>
            <li>
              <strong className="font-display">Approve.</strong> {agentShort} does every plan you didn&apos;t
              stop.
            </li>
          </ol>
          <ul className="mb-3 space-y-1 text-[15px] text-ink">
            <li>
              <strong className="font-display">Risk:</strong> risky plans that run fill the bar. Full bar = breach.
            </li>
            <li>
              <strong className="font-display">Turns:</strong> handle every plan before the shift ends.
            </li>
          </ul>
          <p className="mb-3 rounded-xl bg-teal-tint px-3 py-2 text-[15px] text-ink">
            <strong className="font-display">3 questions before you approve:</strong> Who asked? Does it match the record? Can
            we undo it?
          </p>
        </>
      )}
      <ul className={g.howList}>
        {deck.cards.map((id) => {
          const c = cardCopy(id);
          const Icon = cardIcon(c.icon);
          const power = c.kind === "power";
          return (
            <li key={id} className={g.howCard}>
              <span
                className={g.howIcon}
                style={{
                  background: power ? "var(--hl-orange-tint)" : "var(--hl-teal-tint)",
                  color: power ? "var(--hl-orange-text)" : "var(--hl-teal)",
                }}
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" />
                {deck.practice ? null : <span className={g.howCost}>{c.cost}</span>}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[16px] font-bold text-ink">
                  {c.name}
                  {deck.practice ? null : <span className="sr-only">, costs {c.cost} energy</span>}
                  {c.exhaust ? <span className="ml-2 text-[13px] font-semibold text-muted">One use</span> : null}
                </span>
                <span className="block text-[15px] text-ink">{c.text}</span>
                <span className="block text-[14px] italic text-ink-soft">{c.flavor}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

export function GameShell({ pathway }: { pathway: PathwayBundle }) {
  return (
    <PathwayProvider value={pathway}>
      <Shell pathway={pathway} />
    </PathwayProvider>
  );
}

function Shell({ pathway }: { pathway: PathwayBundle }) {
  const router = useRouter();
  const api = useMemo(() => pathwayOps(pathway), [pathway]);
  const ENC = pathway.story;
  const PRACTICE = pathway.practice;
  const HUB = pathway.hub;
  const { copy } = pathway.config;
  const bus = useMemo(() => createBus(), []);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [save, setSave] = useState<SaveData | null>(null);
  const [view, setView] = useState<View>("boot");
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [battleKey, setBattleKey] = useState(0);
  const [finalState, setFinalState] = useState<BattleState | null>(null);
  const [stageReady, setStageReady] = useState(false);
  // The stage could not start, or lost its WebGL context and did not come back: show a retry.
  const [stageFailed, setStageFailed] = useState(false);
  const [stageKey, setStageKey] = useState(0);
  const [dialogue, setDialogue] = useState<HubTargetId | null>(null);
  const [walking, setWalking] = useState<HubTargetId | null>(null);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [howDeck, setHowDeck] = useState<HowDeck>(ALL_CARDS);
  // One-time office note: a saved shift no longer fits the updated content and was cleared.
  const [note, setNote] = useState<string | null>(null);
  const [initialHubPos, setInitialHubPos] = useState<{ x: number; y: number } | null>(null);
  // Skills whose level changed in the battle that just ended (for the Daily / drill result).
  const [moved, setMoved] = useState<{ key: string; list: SkillMove[] } | null>(null);
  const walkingRef = useRef<HubTargetId | null>(null);
  const viewRef = useRef<View>("boot");
  const recorded = useRef<string | null>(null);
  const hubHeadingRef = useRef<HTMLHeadingElement>(null);
  const resumeBtnRef = useRef<HTMLButtonElement>(null);
  const prevView = useRef<View>("boot");
  const systemReduced = usePrefersReducedMotion();
  const reducedMotion = save?.settings.reducedMotion ?? systemReduced;

  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  useEffect(() => {
    walkingRef.current = walking;
  }, [walking]);

  /* Boot: load the save, pick the first view. */
  useEffect(() => {
    // Start fetching the stage (Phaser) and this pathway's art now, in parallel with the boot work below.
    preloadStage();
    prefetchSvgs(stageSprites(pathway.stage));
    const el = document.createElement("div");
    el.style.cssText = "position:absolute;inset:0;";
    setHost(el);

    const s = loadSave();
    if (!s.profile) {
      router.replace("/play");
      return;
    }
    setSave(s);
    // Signed-up players: re-check the cloud backup (a reload of this page skips /play).
    if (!s.profile.guest) void syncFromCloud({ adopt: false });
    const p = api.progressOf(s);
    setInitialHubPos(p.hub);

    const params = new URLSearchParams(window.location.search);
    const fixture = process.env.NODE_ENV !== "production" ? params.get("fixture") : null;
    // Dev only: the `process.env.NODE_ENV` test is inlined at build time, so production builds drop
    // this branch and its import (the fixtures module would bring the Help Desk content along).
    if (process.env.NODE_ENV !== "production" && fixture) {
      if (fixture === "intro") {
        setView("intro");
        return;
      }
      if (fixture === "hub") {
        setView("hub");
        return;
      }
      import("@/lib/game/fixtures").then(({ fixtureBattle, fixtureEncounter, FIXTURE_NAMES }) => {
        const name = FIXTURE_NAMES.find((n) => n === fixture) ?? "start";
        const st = fixtureBattle(name, fixtureEncounter(name, pathway), pathway);
        if (st.status === "playing") {
          setBattle(st);
          setView("battle");
        } else {
          setFinalState(st);
          setView("result");
        }
      });
      return;
    }

    // /play's "Your skills" link: open the skills screen (the office is one tap away).
    if (params.get("view") === "skills") {
      window.history.replaceState(null, "", window.location.pathname);
      if (hasSkills(p)) {
        if (p.pendingResult) setSave(api.patchProgress((x) => ({ ...x, pendingResult: null, shift: x.battle?.encounterId === x.shift?.id ? x.shift : null })));
        setView("skills");
        return;
      }
    }

    // Every saved battle is checked against its own encounter (practice, the real shift, or the
    // Daily practice / drill rebuilt from progress.shift).
    const pending = p.pendingResult;
    if (pending && pending.status !== "playing" && canResume(pending, pathway.encounterFor(pending.encounterId, p))) {
      // The last shift ended but its result screen was never left (reload, or the tab closed).
      setFinalState(pending);
      setView("result");
    } else if (api.resumable(p.battle, p)) {
      setView("resume");
    } else {
      // A shift saved before the content changed (e.g. the old 12-card deck, or a daily built from
      // an older ticket bank) starts fresh. History, attempts, best and skills are kept.
      const staleShift = !!p.shift && (!pathway.shiftUsable(p.shift) || p.battle?.encounterId === p.shift.id);
      if (p.battle?.encounterId === ENC.id || staleShift) setNote("The shift was updated, so it starts fresh.");
      if (p.battle || p.pendingResult || p.shift) {
        setSave(api.patchProgress((x) => ({ ...x, battle: null, pendingResult: null, shift: null })));
      }
      setView(p.introSeen ? "hub" : "intro");
    }
  }, [router, ENC, api, pathway]);

  /* Stage -> React. */
  useEffect(() => {
    let moveTimer: number | undefined;
    let lostTimer: number | undefined;
    const off = bus.fromStage.on((msg) => {
      switch (msg.type) {
        case "ready":
        case "restored":
          window.clearTimeout(lostTimer);
          setStageReady(true);
          setStageFailed(false);
          break;
        case "lost":
          // The fallbacks show while the canvas is blank. Not restored within 3 s: rebuild the stage.
          setStageReady(false);
          window.clearTimeout(lostTimer);
          lostTimer = window.setTimeout(() => setStageKey((k) => k + 1), 3000);
          break;
        case "failed":
          setStageReady(false);
          setStageFailed(true);
          break;
        case "hub-tap":
          if (viewRef.current !== "hub") break;
          setWalking(msg.target);
          setDialogue(null);
          break;
        case "hub-arrived":
          if (viewRef.current !== "hub") break;
          setWalking(null);
          setDialogue(msg.target);
          break;
        case "hub-moved":
          if (!walkingRef.current) setDialogue(null);
          window.clearTimeout(moveTimer);
          moveTimer = window.setTimeout(() => {
            api.patchProgress((p) => ({ ...p, hub: { x: msg.x, y: msg.y } }));
          }, 250);
          break;
      }
    });
    return () => {
      off();
      window.clearTimeout(moveTimer);
      window.clearTimeout(lostTimer);
    };
  }, [bus, api]);

  // If the stage never reports an arrival (no WebGL, slow device), open the dialogue anyway.
  useEffect(() => {
    if (!walking) return;
    const t = window.setTimeout(() => {
      if (walkingRef.current === walking) {
        setWalking(null);
        setDialogue(walking);
      }
    }, stageReady ? 8000 : 50);
    return () => window.clearTimeout(t);
  }, [walking, stageReady]);

  // Result screen: the agent's mood matches how the shift went.
  useEffect(() => {
    if (view !== "result" || !finalState || !stageReady) return;
    const won = finalState.status === "won";
    bus.toStage.emit({ type: "agent-mood", mood: won ? "celebrate" : "sad" });
  }, [view, finalState, stageReady, bus]);

  // Focus: entering the hub from another view lands on the hub heading.
  useEffect(() => {
    const from = prevView.current;
    prevView.current = view;
    if (view === "hub" && from !== "boot" && from !== "hub") hubHeadingRef.current?.focus({ preventScroll: true });
    if (view === "resume") window.setTimeout(() => resumeBtnRef.current?.focus(), 30);
  }, [view]);

  /* ---------------------------------------------------------------- */
  /* Actions                                                           */
  /* ---------------------------------------------------------------- */

  const goTo = useCallback(
    (target: HubTargetId) => {
      setRoomsOpen(false);
      setDialogue(null);
      if (stageReady) bus.toStage.emit({ type: "walk-to", target });
      setWalking(target);
    },
    [bus, stageReady],
  );

  const beginBattle = useCallback((st: BattleState, next: "battle" | "brief" = "battle") => {
    // A Daily practice or drill spec lives only as long as its own battle.
    setSave(api.patchProgress((p) => ({ ...p, battle: st, pendingResult: null, shift: p.shift?.id === st.encounterId ? p.shift : null })));
    setBattle(st);
    setBattleKey((k) => k + 1);
    setFinalState(null);
    setDialogue(null);
    setWalking(null);
    setView(next);
  }, [api]);

  const startPractice = useCallback(() => beginBattle(createBattle(PRACTICE, newSeed())), [beginBattle, PRACTICE]);
  const newShift = useCallback(() => beginBattle(createBattle(ENC, newSeed())), [beginBattle, ENC]);

  /** Save a generated shift's spec (dailyCount / drillCount go up), then its one-screen intro. */
  const startSpec = useCallback(
    (spec: ShiftSpec) => {
      setSave(api.patchProgress((p) => beginShift(p, spec)));
      beginBattle(createBattle(pathway.shiftEncounter(spec), spec.seed), "brief");
    },
    [beginBattle, api, pathway],
  );

  /**
   * A paused battle is saved: never replace it by accident (it would be lost, and a daily's count
   * already went up). Show the Resume / Start over prompt instead. True when it did.
   */
  const guardSaved = useCallback((): boolean => {
    const p = api.progressOf(loadSave());
    if (!api.resumable(p.battle, p)) return false;
    setDialogue(null);
    setWalking(null);
    setRoomsOpen(false);
    setView("resume");
    return true;
  }, [api]);

  /** "Start today's practice" / "One more shift": the next Daily practice. */
  const startDaily = useCallback(() => {
    if (guardSaved()) return;
    const s = loadSave();
    startSpec(api.nextDaily(api.progressOf(s), s.playerId));
  }, [startSpec, guardSaved, api]);

  /** "Practice this": a drill for one skill. */
  const startDrill = useCallback(
    (skill: MasterySkillId) => {
      if (guardSaved()) return;
      const s = loadSave();
      startSpec(api.nextDrill(api.progressOf(s), s.playerId, skill));
    },
    [startSpec, guardSaved, api],
  );

  /** The hub's main button: resume a saved battle, else practice (first time), else the real shift. */
  const startShift = useCallback(() => {
    const p = api.progressOf(loadSave());
    const saved = api.resumable(p.battle, p);
    if (saved) beginBattle(saved);
    else if (!api.practiceDone(p)) startPractice();
    else if (dailyUnlocked(p)) startDaily();
    else newShift();
  }, [beginBattle, startPractice, newShift, startDaily, api]);

  /** "Start over" in the resume prompt: a fresh battle of the same kind. */
  const restartSaved = useCallback(() => {
    const p = api.progressOf(loadSave());
    const enc = p.battle ? pathway.encounterFor(p.battle.encounterId, p) : ENC;
    // A Daily practice or drill starts over with the same plans (its spec stays in progress.shift).
    if (isGenerated(enc) && p.shift && pathway.shiftUsable(p.shift)) beginBattle(createBattle(pathway.shiftEncounter(p.shift), p.shift.seed));
    else if (enc.practice) startPractice();
    else newShift();
  }, [beginBattle, startPractice, newShift, ENC, api, pathway]);

  const onBattleSave = useCallback((st: BattleState) => {
    if (st.status === "playing") {
      api.patchProgress((p) => ({ ...p, battle: st }));
      return;
    }
    const key = `${st.seed}:${st.events.length}`;
    if (recorded.current === key) return;
    recorded.current = key;
    const now = new Date();
    // Skills: every mode counts (practice, Monday, Daily practice, drills), once per battle
    // (applyBattle is keyed by encounter id + seed, so a reload never counts a battle twice).
    const day = localDay(now);
    const before = api.progressOf(loadSave()).skills;
    const next = api.patchProgress((p) => {
        const enc = pathway.encounterFor(st.encounterId, p);
        const base: PathwayProgress = { ...p, battle: null, pendingResult: st };
        if (enc.practice) {
          // Practice never counts toward attempts, wins, best or history. It only unlocks the real shift.
          return applyBattle({ ...base, practiceDone: true }, st, enc, day);
        }
        const score = scoreBattle(st, enc);
        const tally = shiftTally(st, enc);
        const generated = isGenerated(enc);
        const entry: HistoryEntry = {
          encounterId: st.encounterId,
          status: st.status,
          // Stars, attempts, wins and best are for the fixed Monday shift only.
          stars: generated ? 0 : score.stars,
          at: now.toISOString(),
          catches: score.catches,
          falseAlarms: score.falseAlarms,
          misses: score.misses,
          mode: enc.mode ?? "story",
          ...tally,
          ...(generated && p.shift?.focus[0] ? { focus: p.shift.focus[0] } : {}),
        };
        const won = st.status === "won";
        const counted: PathwayProgress = generated
          ? base
          : {
              ...base,
              attempts: p.attempts + 1,
              wins: p.wins + (won ? 1 : 0),
              best:
                won && (!p.best || score.stars > p.best.stars) ? { stars: score.stars, completedAt: entry.at } : p.best,
            };
        // pendingResult (and a daily's spec) stay until the result screen is left, so a reload
        // right now still shows the debrief.
        return applyBattle({ ...counted, history: [...p.history, entry].slice(-50) }, st, enc, day);
    });
    setSave(next);
    setMoved({ key: key, list: skillChanges(before, api.progressOf(next).skills) });
    setFinalState(st);
  }, [api, pathway]);

  const showResult = useCallback((st: BattleState) => {
    setFinalState(st);
    setView("result");
  }, []);

  const backToOffice = useCallback(() => {
    setDialogue(null);
    setWalking(null);
    if (viewRef.current === "result") {
      // Leaving the result screen also lets go of a finished Daily practice or drill spec.
      setSave(
        api.patchProgress((p) => ({
          ...p,
          pendingResult: null,
          shift: p.shift && p.battle?.encounterId !== p.shift.id ? null : p.shift,
        })),
      );
    }
    setView("hub");
  }, [api]);

  /** Your skills. Leaving a result screen for it also lets go of that result (like the office). */
  const openSkills = useCallback(() => {
    setDialogue(null);
    setWalking(null);
    setRoomsOpen(false);
    if (viewRef.current === "result") {
      setSave(
        api.patchProgress((p) => ({
          ...p,
          pendingResult: null,
          shift: p.shift && p.battle?.encounterId !== p.shift.id ? null : p.shift,
        })),
      );
    }
    setView("skills");
  }, [api]);

  const finishIntro = useCallback(() => {
    const next = api.patchProgress((p) => ({ ...p, introSeen: true }));
    setSave(next);
    // New players go straight from the intro into practice (no walk through the office first).
    if (!api.practiceDone(api.progressOf(next))) startPractice();
    else setView("hub");
  }, [startPractice, api]);

  /** For presenters: mark practice as done and go to the office, where "Start shift" waits. */
  const skipPractice = useCallback(() => {
    setSave(api.patchProgress((p) => ({ ...p, introSeen: true, practiceDone: true })));
    setDialogue(null);
    setView("hub");
  }, [api]);

  const openHowTo = useCallback(() => {
    if (viewRef.current === "battle") {
      const p = api.progressOf(loadSave());
      const b = p.battle;
      const enc = pathway.encounterFor(b?.encounterId, p);
      const deck = new Set(deckAtTurn(enc, b?.turn ?? 1));
      setHowDeck({ practice: !!enc.practice, cards: HAND_ORDER.filter((id) => deck.has(id)) });
    } else {
      setHowDeck(ALL_CARDS);
    }
    setHowOpen(true);
  }, [api, pathway]);

  const toggleMotion = useCallback(() => {
    setSave(updateSave((s) => ({ ...s, settings: { ...s.settings, reducedMotion: !reducedMotion } })));
  }, [reducedMotion]);

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  const stageMode: StageMode = view === "battle" || view === "result" ? "battle" : "hub";
  const progress = save ? api.progressOf(save) : null;
  const savedBattle = api.resumable(progress?.battle, progress);
  const savedEnc = savedBattle ? pathway.encounterFor(savedBattle.encounterId, progress) : null;
  const resumeKind: ResumeKind = savedEnc
    ? savedEnc.practice
      ? "practice"
      : savedEnc.mode === "daily" || savedEnc.mode === "drill"
        ? savedEnc.mode
        : "shift"
    : null;
  const day = today();
  const playerId = save?.playerId ?? "guest";
  const unlocked = !!progress && api.practiceDone(progress) && dailyUnlocked(progress);
  const skillsOn = !!progress && hasSkills(progress);
  // The next Daily practice, planned ahead so the note tells the truth (planning is pure and cheap).
  const dailyPreview = useMemo(
    () => (progress && unlocked && !resumeKind && view === "hub" ? api.nextDaily(progress, playerId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [save, unlocked, resumeKind, view, playerId],
  );
  const resumeLabel = resumeKind
    ? resumeKind === "drill"
      ? "Resume drill"
      : resumeKind === "shift"
        ? "Resume shift"
        : "Resume practice"
    : null;
  const doneToday = dailyDoneToday(progress?.history, day);
  const chooser: HubChooser | null = unlocked
    ? {
        label: resumeLabel ?? (doneToday ? "One more shift" : "Start today's practice"),
        note: dailyPreview ? dailyNote(dailyPreview) : null,
        onReplayStory: resumeKind ? undefined : newShift,
        onSkills: skillsOn ? openSkills : undefined,
        objective: doneToday ? "Done for today. One more shift is optional." : "Today's practice: new tickets picked for your skills.",
      }
    : null;
  const practiceNext = !!progress && !api.practiceDone(progress);
  const resumeState = view === "resume" ? savedBattle : null;
  const inHub = view === "hub" || view === "intro" || view === "resume" || view === "brief";
  const battleOver = view === "battle" && !!finalState && finalState.status !== "playing";
  const battleEnc = battle ? pathway.encounterFor(battle.encounterId, progress) : ENC;
  const resultEnc = finalState ? pathway.encounterFor(finalState.encounterId, progress) : ENC;
  const firstShift = !!progress && progress.attempts === 0 && !battleEnc.practice && !isGenerated(battleEnc);
  // Drills: "Where to look" at the top of the evidence sheet until the skill is Solid.
  const drillSkill = battleEnc.mode === "drill" && progress?.shift?.id === battleEnc.id ? progress.shift.focus[0] : undefined;
  const sheetNote = drillSkill ? drillCoach(drillSkill, progress?.skills?.[drillSkill]?.level ?? 0) : null;
  // Result screens: the weakest skill of this shift ("Practice this: ..."), once Daily practice is open.
  const resultLines = finalState && view === "result" ? planLines(finalState, resultEnc) : [];
  const practiceSkill = unlocked && finalState ? weakestInShift(resultLines, progress?.skills, day) ?? nextUpSkill(progress?.skills, day) : null;
  const resultFocus =
    finalState && progress?.shift?.id === finalState.encounterId ? progress.shift.focus[0] ?? null : null;

  return (
    <div id="hl-game-root" className={`${g.root} ${reducedMotion ? "hl-rm" : ""}`} data-view={view}>
      <a href="#main" className="hl-skip-link">
        Skip to the game
      </a>
      {/* While the resume prompt (a modal) is open, the bar behind it is inert. */}
      <header className={g.bar} inert={view === "resume"}>
        <Link href="/play" className="-mx-1 flex min-h-11 flex-none items-center rounded-lg px-1" aria-label="DCI Resources: choose a pathway">
          <DciLogo decorative className="h-7 w-auto" priority />
        </Link>
        <span aria-hidden="true" className="h-6 w-px flex-none bg-line" />
        <p className={g.title}>
          {copy.barTitle} <span className={g.titleSub}>{copy.barSub}</span>
        </p>
        {view !== "boot" ? (
          <GameMenu
            view={view}
            battleOver={battleOver}
            reducedMotion={reducedMotion}
            onToggleMotion={toggleMotion}
            onOfficeList={() => setRoomsOpen(true)}
            onLeaveBattle={backToOffice}
            onHowTo={openHowTo}
            onPracticeAgain={startPractice}
            canPracticeAgain={!resumeKind || resumeKind === "practice"}
            onSkills={skillsOn && view === "hub" ? openSkills : undefined}
          />
        ) : null}
      </header>

      <main id="main" className={`${g.main} ${view === "battle" || view === "result" || view === "skills" ? g.mainFramed : ""}`}>
        {view === "boot" ? (
          <div className={g.boot} role="status">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/game/sprites/${pathway.stage.agentSprite}-eager.svg`} alt="" width={220} height={220} className={g.bootBot} />
              <p className="mt-3 font-display text-lg font-semibold text-ink">Clocking in…</p>
            </div>
          </div>
        ) : null}

        {inHub ? (
          <>
            <h1 ref={hubHeadingRef} tabIndex={-1} className="sr-only">
              {HUB.officeName}
            </h1>
            <StageSlot host={host} />
            {stageFailed ? (
              <div className={g.stageFailed}>
                <div>
                  <p>The office picture didn&apos;t load. You can still use the Office list below.</p>
                  <button
                    type="button"
                    className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-ink bg-paper px-4 font-display text-[15px] font-semibold text-ink shadow-[0_3px_0_0_var(--hl-ink)]"
                    onClick={() => {
                      setStageFailed(false);
                      setStageKey((k) => k + 1);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Try again
                  </button>
                </div>
              </div>
            ) : !stageReady ? (
              <p className={g.stageLoading} aria-hidden="true">
                Opening the office…
              </p>
            ) : null}
            {view === "hub" ? (
              <HubOverlay
                hub={HUB}
                encounter={ENC}
                dialogue={dialogue}
                walking={walking}
                resumeKind={resumeKind}
                practiceNext={practiceNext}
                note={note}
                onDismissNote={() => setNote(null)}
                onSkipPractice={skipPractice}
                reducedMotion={reducedMotion}
                onOpenRooms={() => setRoomsOpen(true)}
                onCloseDialogue={() => {
                  // Keep keyboard focus in the game when the dialogue (and its focused button) goes away.
                  const hadFocus = document.activeElement?.closest("section") != null;
                  setDialogue(null);
                  if (hadFocus) hubHeadingRef.current?.focus({ preventScroll: true });
                }}
                onStartShift={startShift}
                chooser={chooser}
                onSkills={skillsOn ? openSkills : undefined}
              />
            ) : null}
            {view === "intro" ? (
              <IntroSequence
                encounter={practiceNext ? PRACTICE : ENC}
                reducedMotion={reducedMotion}
                onDone={finishIntro}
                onSkipPractice={practiceNext ? skipPractice : undefined}
              />
            ) : null}
            {view === "brief" && battle ? (
              <ShiftIntro
                encounter={battleEnc}
                focus={progress?.shift?.id === battleEnc.id && progress.shift.focus[0] ? skillName(progress.shift.focus[0]) : null}
                tickets={progress?.shift?.id === battleEnc.id ? progress.shift.ticketIds.length : 0}
                onStart={() => setView("battle")}
              />
            ) : null}
            {view === "resume" && resumeState ? (
              <div className="absolute inset-0 z-40 grid place-items-center bg-ink/35 p-4">
                <section
                  className="w-full max-w-[420px] rounded-[22px] border-2 border-ink bg-paper p-5 text-center shadow-[0_6px_0_0_var(--hl-ink)]"
                  aria-labelledby="hl-resume-title"
                  role="dialog"
                  aria-modal="true"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/game/sprites/${pathway.stage.agentSprite}-eager.svg`} alt="" width={220} height={220} className="mx-auto h-24 w-24" />
                  <h2 id="hl-resume-title" className="mt-1 font-display text-2xl font-bold text-ink">
                    {resumeKind === "practice" || resumeKind === "daily"
                      ? "Your practice is still open"
                      : resumeKind === "drill"
                        ? "Your drill is still open"
                        : "Your shift is still open"}
                  </h2>
                  <p className="mt-1 text-[16px] text-ink-soft">{ENC.agent.name} saved your spot. Pick up where you left off?</p>
                  {resumeKind !== "practice" && savedEnc ? (
                    <p className="mt-3 flex flex-wrap justify-center gap-1.5">
                      <span className="rounded-full border-2 border-line bg-paper-soft px-3 py-0.5 font-display text-[14px] font-semibold">
                        Turn {resumeState.turn} of {savedEnc.maxTurns}
                      </span>
                      {isGenerated(savedEnc) ? null : (
                        <span className="rounded-full border-2 border-line bg-paper-soft px-3 py-0.5 font-display text-[14px] font-semibold">
                          Risk {resumeState.risk}/{savedEnc.maxRisk}
                        </span>
                      )}
                    </p>
                  ) : null}
                  <div className="mt-5 flex flex-col gap-2.5">
                    <button
                      ref={resumeBtnRef}
                      type="button"
                      onClick={() => beginBattle(resumeState)}
                      className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-ink bg-orange px-5 font-display text-lg font-bold text-ink shadow-[0_4px_0_0_var(--hl-ink)] active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--hl-ink)]"
                    >
                      <Play className="h-5 w-5" aria-hidden="true" fill="currentColor" />
                      {resumeKind === "practice" || resumeKind === "daily"
                        ? "Resume practice"
                        : resumeKind === "drill"
                          ? "Resume drill"
                          : "Resume your shift"}
                    </button>
                    <button
                      type="button"
                      onClick={restartSaved}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-ink bg-paper px-5 font-display text-base font-semibold text-ink shadow-[0_4px_0_0_var(--hl-ink)] active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--hl-ink)]"
                    >
                      <RotateCcw className="h-5 w-5" aria-hidden="true" />
                      {resumeKind === "shift" ? "Start a new shift" : "Start over"}
                    </button>
                  </div>
                </section>
              </div>
            ) : null}
          </>
        ) : null}

        {view === "battle" && battle ? (
          <BattleView
            key={battleKey}
            encounter={battleEnc}
            initial={battle}
            bus={bus}
            stage={<StageSlot host={host} />}
            stageReady={stageReady}
            reducedMotion={reducedMotion}
            onSave={onBattleSave}
            onShowResult={showResult}
            firstShift={firstShift}
            sheetNote={sheetNote}
          />
        ) : null}

        {view === "result" && finalState && resultEnc.practice ? (
          <PracticeResult
            state={finalState}
            encounter={resultEnc}
            next={ENC}
            stage={<StageSlot host={host} />}
            stageReady={stageReady}
            onStartShift={newShift}
            onPracticeAgain={startPractice}
            onOffice={backToOffice}
            practiceSkill={practiceSkill}
            onPractice={startDrill}
          />
        ) : view === "result" && finalState && isGenerated(resultEnc) && progress ? (
          <ShiftResult
            state={finalState}
            encounter={resultEnc}
            progress={progress}
            today={day}
            moved={moved?.key === `${finalState.seed}:${finalState.events.length}` ? moved.list : []}
            focus={resultFocus}
            stage={<StageSlot host={host} />}
            stageReady={stageReady}
            onPractice={startDrill}
            onOneMore={startDaily}
            onSkills={openSkills}
            onOffice={backToOffice}
          />
        ) : view === "result" && finalState ? (
          <ResultScreen
            state={finalState}
            encounter={resultEnc}
            stage={<StageSlot host={host} />}
            stageReady={stageReady}
            onPlayAgain={newShift}
            onOffice={backToOffice}
            practiceSkill={practiceSkill}
            onPractice={startDrill}
          />
        ) : null}

        {view === "skills" && progress ? (
          <SkillsScreen
            progress={progress}
            today={day}
            drillTickets={(skill) => api.nextDrill(progress, playerId, skill).ticketIds.length}
            onPractice={startDrill}
            onBack={backToOffice}
            resume={savedBattle && resumeLabel ? { label: resumeLabel, onResume: startShift } : null}
          />
        ) : null}
      </main>

      {host && view !== "boot"
        ? createPortal(
            <PhaserStage
              key={stageKey}
              bus={bus}
              stage={pathway.stage}
              mode={stageMode}
              reducedMotion={reducedMotion}
              initialHubPos={initialHubPos}
              className="absolute inset-0"
            />,
            host,
          )
        : null}

      <RoomList open={roomsOpen} hub={HUB} onClose={() => setRoomsOpen(false)} onGo={goTo} />
      <HowToPlay open={howOpen} deck={howDeck} onClose={() => setHowOpen(false)} />
    </div>
  );
}

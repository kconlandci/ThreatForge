"use client";

/**
 * /play/help-desk: the whole game on one screen.
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
} from "lucide-react";
import { BattleView } from "@/components/battle/BattleView";
import { ResultScreen } from "@/components/battle/ResultScreen";
import { Sheet } from "@/components/battle/Sheet";
import { cardIcon } from "@/components/battle/icons";
import { HubOverlay } from "@/components/hub/HubOverlay";
import { IntroSequence } from "@/components/hub/IntroSequence";
import { RoomList } from "@/components/hub/RoomList";
import { DciLogo } from "@/components/site/Logo";
import { preloadStage } from "@/lib/client/preloadStage";
import { getPathwayProgress, loadSave, syncFromCloud, updateSave, type SaveData } from "@/lib/client/save";
import { createBus, type StageMode } from "@/lib/game/bus";
import { CARDS } from "@/lib/game/cards";
import { HELP_DESK_ENCOUNTER, HELP_DESK_HUB } from "@/lib/game/content";
import { canResume, createBattle, scoreBattle } from "@/lib/game/engine";
import type { HubTargetId } from "@/lib/game/hub";
import type { BattleState, CardId, PathwayProgress } from "@/lib/game/types";
import g from "./GameShell.module.css";

const PhaserStage = dynamic(() => import("@/components/game/PhaserStage"), { ssr: false });

const ENC = HELP_DESK_ENCOUNTER;
const HUB = HELP_DESK_HUB;
const PATHWAY = "help-desk" as const;

type View = "boot" | "resume" | "intro" | "hub" | "battle" | "result";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function newSeed(): number {
  const buf = new Uint32Array(1);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(buf);
  else buf[0] = Math.floor(Math.random() * 2 ** 32);
  return buf[0] >>> 0;
}

function patchProgress(fn: (p: PathwayProgress) => PathwayProgress): SaveData {
  return updateSave((s) => ({ ...s, pathways: { ...s.pathways, [PATHWAY]: fn(getPathwayProgress(s, PATHWAY)) } }));
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
}: {
  view: View;
  /** The battle has ended (its result screen is one tap away): no "Pause". */
  battleOver: boolean;
  reducedMotion: boolean;
  onToggleMotion: () => void;
  onOfficeList: () => void;
  onLeaveBattle: () => void;
  onHowTo: () => void;
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

function HowToPlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  const order: CardId[] = ["inspect", "block", "escalate", "rollback", "policy-callback", "coffee"];
  return (
    <Sheet
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      header={
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-teal">Dana&apos;s quick guide</p>
          <h2 id={titleId} className="mt-0.5 font-display text-xl font-bold text-ink">
            How to play
          </h2>
        </div>
      }
    >
      <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-[16px] leading-relaxed text-ink">
        <li>Each turn, {ENC.agent.name} shows its plans. They run in order.</li>
        <li>Tap a card, then tap a plan. Cards cost energy (the orange number).</li>
        <li>When you are done, let it proceed. Anything you did not stop will happen.</li>
        <li>Stop the risky plans. Let the safe ones run. Finish before the shift ends.</li>
      </ol>
      <p className="mb-3 rounded-xl bg-teal-tint px-3 py-2 text-[15px] text-ink">
        <strong className="font-display">3 questions before you approve:</strong> Who asked? Does it match the record? Can we
        undo it?
      </p>
      <ul className={g.howList}>
        {order.map((id) => {
          const c = CARDS[id];
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
                <span className={g.howCost}>{c.cost}</span>
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[16px] font-bold text-ink">
                  {c.name}
                  <span className="sr-only">, costs {c.cost} energy</span>
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

export function GameShell() {
  const router = useRouter();
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
  const [initialHubPos, setInitialHubPos] = useState<{ x: number; y: number } | null>(null);
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
    // Start fetching the stage (Phaser) now, in parallel with the boot work below.
    preloadStage();
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
    const p = getPathwayProgress(s, PATHWAY);
    setInitialHubPos(p.hub);

    const params = new URLSearchParams(window.location.search);
    const fixture = process.env.NODE_ENV !== "production" ? params.get("fixture") : null;
    if (fixture) {
      if (fixture === "intro") {
        setView("intro");
        return;
      }
      if (fixture === "hub") {
        setView("hub");
        return;
      }
      import("@/lib/game/fixtures").then(({ fixtureBattle, FIXTURE_NAMES }) => {
        const name = FIXTURE_NAMES.find((n) => n === fixture) ?? "start";
        const st = fixtureBattle(name, ENC);
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

    if (p.pendingResult && p.pendingResult.status !== "playing" && canResume(p.pendingResult, ENC)) {
      // The last shift ended but its result screen was never left (reload, or the tab closed).
      setFinalState(p.pendingResult);
      setView("result");
    } else if (p.battle && p.battle.status === "playing" && canResume(p.battle, ENC)) {
      setView("resume");
    } else {
      if (p.battle) setSave(patchProgress((x) => ({ ...x, battle: null })));
      setView(p.introSeen ? "hub" : "intro");
    }
  }, [router]);

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
            patchProgress((p) => ({ ...p, hub: { x: msg.x, y: msg.y } }));
          }, 250);
          break;
      }
    });
    return () => {
      off();
      window.clearTimeout(moveTimer);
      window.clearTimeout(lostTimer);
    };
  }, [bus]);

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

  // Result screen: ResetBot's mood matches how the shift went.
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

  const beginBattle = useCallback((st: BattleState) => {
    setSave(patchProgress((p) => ({ ...p, battle: st, pendingResult: null })));
    setBattle(st);
    setBattleKey((k) => k + 1);
    setFinalState(null);
    setDialogue(null);
    setWalking(null);
    setView("battle");
  }, []);

  const startShift = useCallback(() => {
    const p = getPathwayProgress(loadSave(), PATHWAY);
    const saved = p.battle && p.battle.status === "playing" && canResume(p.battle, ENC) ? p.battle : null;
    beginBattle(saved ?? createBattle(ENC, newSeed()));
  }, [beginBattle]);

  const newShift = useCallback(() => beginBattle(createBattle(ENC, newSeed())), [beginBattle]);

  const onBattleSave = useCallback((st: BattleState) => {
    if (st.status === "playing") {
      patchProgress((p) => ({ ...p, battle: st }));
      return;
    }
    const key = `${st.seed}:${st.events.length}`;
    if (recorded.current === key) return;
    recorded.current = key;
    const score = scoreBattle(st, ENC);
    const now = new Date().toISOString();
    const won = st.status === "won";
    setSave(
      patchProgress((p) => ({
        ...p,
        battle: null,
        // Kept until the result screen is left, so a reload right now still shows the debrief.
        pendingResult: st,
        attempts: p.attempts + 1,
        wins: p.wins + (won ? 1 : 0),
        best: won && (!p.best || score.stars > p.best.stars) ? { stars: score.stars, completedAt: now } : p.best,
        history: [
          ...p.history,
          {
            encounterId: st.encounterId,
            status: st.status,
            stars: score.stars,
            at: now,
            catches: score.catches,
            falseAlarms: score.falseAlarms,
            misses: score.misses,
          },
        ].slice(-50),
      })),
    );
    setFinalState(st);
  }, []);

  const showResult = useCallback((st: BattleState) => {
    setFinalState(st);
    setView("result");
  }, []);

  const backToOffice = useCallback(() => {
    setDialogue(null);
    setWalking(null);
    if (viewRef.current === "result") setSave(patchProgress((p) => ({ ...p, pendingResult: null })));
    setView("hub");
  }, []);

  const finishIntro = useCallback(() => {
    setSave(patchProgress((p) => ({ ...p, introSeen: true })));
    setView("hub");
  }, []);

  const toggleMotion = useCallback(() => {
    setSave(updateSave((s) => ({ ...s, settings: { ...s.settings, reducedMotion: !reducedMotion } })));
  }, [reducedMotion]);

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  const stageMode: StageMode = view === "battle" || view === "result" ? "battle" : "hub";
  const hasBattle = !!(save && getPathwayProgress(save, PATHWAY).battle);
  const resumeState = view === "resume" && save ? getPathwayProgress(save, PATHWAY).battle : null;
  const inHub = view === "hub" || view === "intro" || view === "resume";
  const battleOver = view === "battle" && !!finalState && finalState.status !== "playing";
  const firstShift = !!save && getPathwayProgress(save, PATHWAY).attempts === 0;

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
          Help Desk <span className={g.titleSub}>· Fenwick IT</span>
        </p>
        {view !== "boot" ? (
          <GameMenu
            view={view}
            battleOver={battleOver}
            reducedMotion={reducedMotion}
            onToggleMotion={toggleMotion}
            onOfficeList={() => setRoomsOpen(true)}
            onLeaveBattle={backToOffice}
            onHowTo={() => setHowOpen(true)}
          />
        ) : null}
      </header>

      <main id="main" className={`${g.main} ${view === "battle" || view === "result" ? g.mainFramed : ""}`}>
        {view === "boot" ? (
          <div className={g.boot} role="status">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/game/sprites/resetbot-eager.svg" alt="" width={220} height={220} className={g.bootBot} />
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
                hasBattle={hasBattle}
                reducedMotion={reducedMotion}
                onOpenRooms={() => setRoomsOpen(true)}
                onGo={goTo}
                onCloseDialogue={() => {
                  // Keep keyboard focus in the game when the dialogue (and its focused button) goes away.
                  const hadFocus = document.activeElement?.closest("section") != null;
                  setDialogue(null);
                  if (hadFocus) hubHeadingRef.current?.focus({ preventScroll: true });
                }}
                onStartShift={startShift}
              />
            ) : null}
            {view === "intro" ? <IntroSequence encounter={ENC} reducedMotion={reducedMotion} onDone={finishIntro} /> : null}
            {view === "resume" && resumeState ? (
              <div className="absolute inset-0 z-40 grid place-items-center bg-ink/35 p-4">
                <section
                  className="w-full max-w-[420px] rounded-[22px] border-2 border-ink bg-paper p-5 text-center shadow-[0_6px_0_0_var(--hl-ink)]"
                  aria-labelledby="hl-resume-title"
                  role="dialog"
                  aria-modal="true"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/game/sprites/resetbot-eager.svg" alt="" width={220} height={220} className="mx-auto h-24 w-24" />
                  <h2 id="hl-resume-title" className="mt-1 font-display text-2xl font-bold text-ink">
                    Your shift is still open
                  </h2>
                  <p className="mt-1 text-[16px] text-ink-soft">{ENC.agent.name} saved your spot. Pick up where you left off?</p>
                  <p className="mt-3 flex flex-wrap justify-center gap-1.5">
                    <span className="rounded-full border-2 border-line bg-paper-soft px-3 py-0.5 font-display text-[14px] font-semibold">
                      Turn {resumeState.turn} of {ENC.maxTurns}
                    </span>
                    <span className="rounded-full border-2 border-line bg-paper-soft px-3 py-0.5 font-display text-[14px] font-semibold">
                      Risk {resumeState.risk}/{ENC.maxRisk}
                    </span>
                  </p>
                  <div className="mt-5 flex flex-col gap-2.5">
                    <button
                      ref={resumeBtnRef}
                      type="button"
                      onClick={() => beginBattle(resumeState)}
                      className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-ink bg-orange px-5 font-display text-lg font-bold text-ink shadow-[0_4px_0_0_var(--hl-ink)] active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--hl-ink)]"
                    >
                      <Play className="h-5 w-5" aria-hidden="true" fill="currentColor" />
                      Resume your shift
                    </button>
                    <button
                      type="button"
                      onClick={newShift}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-ink bg-paper px-5 font-display text-base font-semibold text-ink shadow-[0_4px_0_0_var(--hl-ink)] active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--hl-ink)]"
                    >
                      <RotateCcw className="h-5 w-5" aria-hidden="true" />
                      Start a new shift
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
            encounter={ENC}
            initial={battle}
            bus={bus}
            stage={<StageSlot host={host} />}
            stageReady={stageReady}
            reducedMotion={reducedMotion}
            onSave={onBattleSave}
            onShowResult={showResult}
            firstShift={firstShift}
          />
        ) : null}

        {view === "result" && finalState ? (
          <ResultScreen
            state={finalState}
            encounter={ENC}
            stage={<StageSlot host={host} />}
            stageReady={stageReady}
            onPlayAgain={newShift}
            onOffice={backToOffice}
          />
        ) : null}
      </main>

      {host && view !== "boot"
        ? createPortal(
            <PhaserStage
              key={stageKey}
              bus={bus}
              mode={stageMode}
              reducedMotion={reducedMotion}
              initialHubPos={initialHubPos}
              className="absolute inset-0"
            />,
            host,
          )
        : null}

      <RoomList open={roomsOpen} hub={HUB} onClose={() => setRoomsOpen(false)} onGo={goTo} />
      <HowToPlay open={howOpen} onClose={() => setHowOpen(false)} />
    </div>
  );
}

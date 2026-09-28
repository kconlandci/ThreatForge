"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { ArrowUpRight, Check, CircleHelp, Flag, Hand, Lock, PenLine, ScrollText, Search, Undo2 } from "lucide-react";
import { coachName, noBlockOptions, type CoachHint } from "@/lib/game/coach";
import { CARDS } from "@/lib/game/cards";
import type { Reveal } from "@/lib/game/reveal";
import { HINT_BUTTON, SPOT_PROMPT, rowName, stepById, undoText } from "@/lib/game/useBattle";
import type { BattleState, CardId, CardInstance, Encounter, Evidence, PlayResult } from "@/lib/game/types";
import { ARTIFACT_ICON, CATEGORY_ICON, artifactKind, type ArtifactKind } from "./icons";
import { HintText } from "./HintText";
import { Sheet } from "./Sheet";
import { SpeakerFace } from "./SpeakerFace";
import s from "./battle.module.css";

/* ------------------------------------------------------------------ */
/* Artifact text: emails, phone numbers, times, file names and codes    */
/* are set in mono so evidence reads like real logs and records.       */
/* ------------------------------------------------------------------ */

// Emails never take the sentence's full stop ("…@cairnholt-custody.co." shows ".co"), and a bare
// domain on file ("cairnholtcustody.com", "@harlowcolewp.com", "filebarrow.net/s/8Hq2") is in mono
// too, so the real and the look-alike can be compared in the same font.
const TOKEN =
  /([\w.+-]+@[\w-]+(?:\.[\w-]+)+|\(\d{3}\) \d{3}-\d{4}|\b\d{1,2}:\d{2}(?: ?[AP]M)?|\b[\w-]+\.(?:ps1|sh|exe|bat|csv|pdf)\b|#\d{3,}|\b[A-Z]{2,}(?:-[A-Z0-9]+)+\b|\b[A-Z][a-z]+-(?:[A-Z][a-z]+)\b|(?:@|\b)[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|co|org)\b(?:\/[\w/]+)?)/g;

function renderTokens(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    out.push(
      <span key={i} className={s.token}>
        {m[0]}
      </span>,
    );
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const ARTIFACT_CLASS: Record<ArtifactKind, string> = {
  terminal: s.artTerminal,
  message: s.artMessage,
  policy: s.artPolicy,
  record: s.artRecord,
  email: s.artEmail,
};

/** One evidence detail as a realistic artifact. `inline`: a span (inside a row button). */
export function Artifact({ label, detail, inline = false }: { label: string; detail: string; inline?: boolean }) {
  const kind = artifactKind(label, detail);
  const Tag = inline ? "span" : "div";
  return <Tag className={`${s.artifact} ${ARTIFACT_CLASS[kind]}`}>{kind === "terminal" ? detail : renderTokens(detail)}</Tag>;
}

/** Red pen: a loop drawn around a row (it wipes in over 500 ms; instantly with reduced motion). */
function PenCircle({ tone = "danger" }: { tone?: "danger" | "key" }) {
  return (
    // A rounded loop that hugs the row (no viewBox: rx is in px, so the corners stay round at any
    // row size). An ellipse cuts its corners through the row label on wide rows.
    <svg className={`${s.pen} ${tone === "key" ? s.penKey : ""}`} aria-hidden="true" focusable="false">
      <rect data-pen="" />
    </svg>
  );
}

function RowBody({ ev }: { ev: Evidence }) {
  const RowIcon = ARTIFACT_ICON[artifactKind(ev.label, ev.detail)];
  return (
    <>
      <span className={s.evIcon} aria-hidden="true">
        <RowIcon className="h-4 w-4" strokeWidth={2.2} />
      </span>
      <span className={s.evMain}>
        <span className={s.evLabel}>{ev.label}</span>
        {ev.gloss ? <span className={s.evGloss}>{ev.gloss}</span> : null}
        <Artifact label={ev.label} detail={ev.detail} inline />
      </span>
    </>
  );
}

function MarkedBadge() {
  return (
    <span className={s.markBadge}>
      <PenLine className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />
      Marked
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export interface EvidencePanelProps {
  stepId: string | null;
  encounter: Encounter;
  state: BattleState;
  autoInspected: Set<string>;
  /** Animate the evidence rows in (right after an Inspect). */
  reveal: boolean;
  /** Player can act (their turn, battle on). */
  canAct: boolean;
  /** Show energy costs (hidden in practice). */
  showCost: boolean;
  /** Practice: the coach's hint for this sheet (before Inspect, or the pull hint's line). */
  coach: Pick<CoachHint, "text" | "target" | "lock"> | null;
  /** A line for the top of the sheet (drills: where to look). */
  note?: string | null;
  /** Changes when a locked control is tapped: the hint shakes once. */
  shakeKey?: number;
  /** The plan card on the board already shows the agent's quip: don't repeat it here. */
  hideQuip?: boolean;
  /** Spot it: the content index of the row marked on this plan, or null. */
  mark?: number | null;
  onMark?: (stepId: string, index: number | null) => void;
  /** Practice: the pull hint ("Where do I look?") is on for this plan. null: no pull hint (not practice). */
  hintOn?: boolean | null;
  onHint?: (stepId: string) => void;
  /** Practice: "Let it run" approves the plan in one tap (else the button only closes the sheet). */
  onLetItRun?: () => void;
  onLockedTap: () => void;
  onPlay: (cardUid: string, stepId: string) => PlayResult;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

function firstOf(hand: CardInstance[], id: CardId) {
  return hand.find((c) => c.cardId === id);
}

/**
 * Evidence for one plan, shown as realistic artifacts. On an inspected plan that is still on the
 * board, every row is a button: the player can mark the one line that looks wrong ("spot it").
 * Nothing here shows which rows are red flags (or the key row) before the plan resolves.
 */
export function EvidencePanel({
  stepId,
  encounter,
  state,
  autoInspected,
  reveal,
  canAct,
  showCost,
  coach,
  note = null,
  shakeKey = 0,
  hideQuip = false,
  mark = null,
  onMark,
  hintOn = null,
  onHint,
  onLetItRun,
  onLockedTap,
  onPlay,
  onClose,
  returnFocusRef,
}: EvidencePanelProps) {
  const titleId = useId();
  const [error, setError] = useState<string | null>(null);
  // Keep showing the last step while the sheet animates closed.
  const [shownId, setShownId] = useState(stepId);
  // Tap guard: right after a play (or when the sheet opens or reveals) the footer can reflow under
  // the finger, so a double tap on Inspect must not land on Block or Let it run.
  const armedAt = useRef(0);
  // After Inspect inside the sheet, its button is replaced by the evidence: move focus there.
  const evidenceRef = useRef<HTMLHeadingElement>(null);
  const hintLineRef = useRef<HTMLParagraphElement>(null);
  const focusHintLine = useRef(false);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Roving tabindex: the one row in the tab order.
  const [rover, setRover] = useState(0);
  const [markMsg, setMarkMsg] = useState("");
  useEffect(() => {
    if (stepId) setShownId(stepId);
    setError(null);
    armedAt.current = performance.now() + 450;
  }, [stepId, reveal]);
  useEffect(() => {
    setRover(mark ?? 0);
    setMarkMsg("");
    // Only when the plan changes (a new mark keeps the rover where the player is).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownId]);
  useEffect(() => {
    if (hintOn && focusHintLine.current) {
      focusHintLine.current = false;
      hintLineRef.current?.focus({ preventScroll: true });
    }
  }, [hintOn]);

  const step = shownId ? stepById(encounter, shownId) : undefined;
  const rt = shownId ? state.steps[shownId] : undefined;
  if (!step || !rt) return <Sheet open={false} onClose={onClose} labelledBy={titleId} header={null}>{null}</Sheet>;

  const Icon = CATEGORY_ICON[step.category];
  const announced = state.announced.includes(step.id);
  const executed = rt.status === "executed" || rt.status === "rolled-back";
  const agent = encounter.agent.name;
  const playing = canAct && state.status === "playing";
  const lock = coach?.lock;
  const ring = (target: string) => (coach?.target === target ? "on" : undefined);
  // Spot it: only on an inspected plan that is still waiting for a decision.
  const spotting = rt.inspected && announced && state.status === "playing" && !!onMark;
  const markIdx = mark !== null && mark >= 0 && mark < step.evidence.length ? mark : null;
  const marked = markIdx !== null ? step.evidence[markIdx] : null;

  const inspect = playing && announced && !rt.inspected ? firstOf(state.hand, "inspect") : undefined;
  const block = playing && announced ? firstOf(state.hand, "block") : undefined;
  const escalate = playing && announced ? firstOf(state.hand, "escalate") : undefined;
  const rollback = playing && rt.status === "executed" && step.reversible ? firstOf(state.hand, "rollback") : undefined;
  const byPolicy = rt.inspected && autoInspected.has(step.id);
  // Real shifts, drills and dailies: with no Block in hand, say what can stop a wrong plan, and show
  // Escalate as a button where Block would be (a "Not sure?" link doesn't read as a stop button).
  // The note only names cards that can be played now (the same check as the shift hint).
  const noBlock = playing && announced && !encounter.practice && !block;
  const can = noBlock ? noBlockOptions(state) : null;
  const noBlockNote = !can
    ? null
    : can.escalate && can.coffee
      ? `No Block card in your hand. Escalate it to ${coachName(encounter)}, or play Coffee to draw 2 cards.`
      : can.escalate
        ? `No Block card in your hand. Escalate it to ${coachName(encounter)}.`
        : can.coffee
          ? "No Block card in your hand. Play Coffee to draw 2 cards."
          : state.energy === 0
            ? "No Block card in your hand. Out of energy."
            : "No Block card in your hand.";

  const doPlay = (uid: string) => {
    if (performance.now() < armedAt.current) return;
    const wasInspect = state.hand.find((c) => c.uid === uid)?.cardId === "inspect";
    const r = onPlay(uid, step.id);
    if (!r.ok) setError(r.reason);
    else {
      armedAt.current = performance.now() + 450;
      if (wasInspect) requestAnimationFrame(() => evidenceRef.current?.focus({ preventScroll: false }));
    }
  };

  const toggleMark = (i: number) => {
    if (!onMark) return;
    const ev = step.evidence[i];
    const on = markIdx !== i;
    onMark(step.id, on ? i : null);
    setRover(i);
    setMarkMsg(`${on ? "Marked" : "Unmarked"}: ${ev.label}`);
  };

  const onRowKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const n = step.evidence.length;
    let to = -1;
    if (e.key === "ArrowDown") to = Math.min(n - 1, rover + 1);
    else if (e.key === "ArrowUp") to = Math.max(0, rover - 1);
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = n - 1;
    if (to < 0) return;
    e.preventDefault();
    setRover(to);
    rowRefs.current[to]?.focus();
  };

  const costOf = (id: CardId) => CARDS[id].cost;
  const short = (id: CardId) => showCost && costOf(id) > state.energy;
  const pip = (id: CardId, cls = "") =>
    showCost ? (
      <span className={`${s.costPip} ${cls}`} aria-hidden="true">
        {costOf(id)}
      </span>
    ) : null;
  const costLabel = (id: CardId) =>
    showCost ? `, costs ${costOf(id)} energy${short(id) ? ". Not enough energy." : ""}` : "";

  const whatHappened =
    rt.status === "executed"
      ? step.outcome.executed
      : rt.status === "rolled-back"
        ? step.outcome.rolledBack ?? step.outcome.executed
        : null;

  const blockLocked = !!lock?.sheetBlock;
  const blockLabel = marked ? "Block it" : "Block";
  const blockAria = marked
    ? `Block it. Your clue: ${marked.label}.${showCost ? ` Costs ${costOf("block")} energy.${short("block") ? " Not enough energy." : ""}` : ""}`
    : `Block${costLabel("block")}${blockLocked && lock ? `. Locked: ${lock.label}.` : ""}`;
  const letItRun = !!onLetItRun && rt.inspected;
  const okLabel = rt.inspected ? (letItRun ? "Let it run" : "Looks OK") : "Not now";
  const onOk = () => {
    if (letItRun && onLetItRun) {
      if (performance.now() < armedAt.current) return;
      onLetItRun();
    } else onClose();
  };

  const footer =
    playing && announced ? (
      <>
        {coach?.text && !rt.inspected ? (
          <p key={shakeKey} className={`${s.sheetHint} ${shakeKey ? s.hintShake : ""}`}>
            <SpeakerFace speaker="coach" size={28} />
            <span>
              <HintText text={coach.text} />
            </span>
          </p>
        ) : null}
        {noBlockNote && rt.inspected ? <p className={`${s.footNote} ${s.noBlockNote}`}>{noBlockNote}</p> : null}
        {marked ? (
          <p className={s.yourClue}>
            <PenLine className="h-4 w-4 flex-none" strokeWidth={2.6} aria-hidden="true" />
            <span>
              Your clue: <strong>{marked.label}</strong>
            </span>
          </p>
        ) : null}
        <div className={s.footRow}>
          {noBlock && escalate ? (
            <button
              type="button"
              className={`${s.actionBtn} ${s.actionTeal}`}
              aria-disabled={short("escalate") || undefined}
              aria-label={`Escalate to ${coachName(encounter)}${costLabel("escalate")}`}
              onClick={() => doPlay(escalate.uid)}
            >
              <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
              Escalate
              {pip("escalate")}
            </button>
          ) : null}
          {block ? (
            <button
              type="button"
              className={`${s.actionBtn} ${s.decideBtn} ${blockLocked ? s.isLocked : ""}`}
              aria-disabled={short("block") || blockLocked || undefined}
              aria-label={blockAria}
              data-coach={ring("sheet:block")}
              data-decide="block"
              onClick={() => (blockLocked ? onLockedTap() : doPlay(block.uid))}
            >
              {blockLocked ? <Lock className="h-5 w-5" aria-hidden="true" /> : <Hand className="h-5 w-5" aria-hidden="true" />}
              {blockLabel}
              {pip("block")}
            </button>
          ) : null}
          {/* Before the evidence is visible this only closes the sheet: it doesn't claim a judgment. */}
          <button
            type="button"
            className={`${s.actionBtn} ${s.decideBtn}`}
            data-coach={ring("sheet:ok")}
            data-decide={letItRun ? "run" : rt.inspected ? "ok" : "later"}
            onClick={onOk}
          >
            {letItRun ? <ArrowUpRight className="h-5 w-5" aria-hidden="true" /> : null}
            {okLabel}
          </button>
        </div>
        {escalate && !noBlock ? (
          <button
            type="button"
            className={s.escalateLink}
            aria-disabled={short("escalate") || undefined}
            aria-label={`Not sure? Escalate to ${coachName(encounter)}${costLabel("escalate")}`}
            onClick={() => doPlay(escalate.uid)}
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            Not sure? Escalate to {coachName(encounter)}
            {pip("escalate")}
          </button>
        ) : null}
        {error ? (
          <p className={s.footNote} role="alert">
            {error}
          </p>
        ) : null}
      </>
    ) : rollback ? (
      <>
        <div className={s.footRow}>
          <button
            type="button"
            className={`${s.actionBtn} ${s.actionPrimary}`}
            aria-disabled={short("rollback") || undefined}
            aria-label={`Roll Back${costLabel("rollback")}`}
            onClick={() => doPlay(rollback.uid)}
          >
            <Undo2 className="h-5 w-5" aria-hidden="true" />
            Roll Back
            {pip("rollback")}
          </button>
        </div>
        {error ? (
          <p className={s.footNote} role="alert">
            {error}
          </p>
        ) : null}
      </>
    ) : null;

  // Practice pull hint: a button until tapped, then the coach's line (read out once).
  const showHintArea = hintOn !== null && spotting;

  return (
    <Sheet
      open={!!stepId}
      onClose={onClose}
      labelledBy={titleId}
      returnFocusRef={returnFocusRef}
      // Focus starts on the sheet (close button), not on Block: the player should read first, and
      // Enter should never block a plan by accident.
      header={
        <div className="flex items-start gap-3">
          <span className={s.cat} aria-hidden="true">
            <Icon className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className={s.evTicket}>Ticket {step.ticket}</p>
            <h2 id={titleId} className={s.evTitle}>
              {step.intent}
            </h2>
          </div>
        </div>
      }
      footer={footer}
    >
      {note && announced ? (
        <p className={s.lookNote}>
          <Search className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" strokeWidth={2.6} />
          <span>{note}</span>
        </p>
      ) : null}
      {hideQuip && announced ? null : (
        <div className={s.says}>
          <SpeakerFace speaker="agent" size={36} />
          <p className={s.saysBubble}>
            <span className={s.srOnly}>{agent} says: </span>
            {step.quip}
          </p>
        </div>
      )}

      {whatHappened ? (
        <>
          <h3 className={s.evHeading}>What happened</h3>
          <p className={`${s.artifact} ${s.artMessage}`}>{whatHappened}</p>
        </>
      ) : null}

      <div className={`${s.evHeadRow} ${hideQuip && announced ? s.evHeadingFirst : ""}`}>
        <h3 ref={evidenceRef} tabIndex={-1} className={s.evHeading}>
          <span className="inline-flex items-center gap-1.5">
            <Search className="h-4 w-4" aria-hidden="true" strokeWidth={2.6} />
            Evidence
          </span>
          {rt.inspected ? (
            <span className={`${s.chip} ${s.chipChecked}`}>
              {byPolicy ? (
                <>
                  <ScrollText className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                  Checked by policy
                </>
              ) : (
                <>
                  Checked <Check className="h-3 w-3" strokeWidth={3.5} aria-hidden="true" />
                </>
              )}
            </span>
          ) : null}
        </h3>
        {/* Practice pull hint: a button until tapped, then the coach's line under the heading. */}
        {showHintArea && !hintOn ? (
          <button
            type="button"
            className={s.pullHintBtn}
            onClick={() => {
              focusHintLine.current = true;
              onHint?.(step.id);
            }}
          >
            <CircleHelp className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
            {HINT_BUTTON}
          </button>
        ) : null}
      </div>
      {showHintArea ? (
        <div className={s.pullHint} aria-live="polite">
          {hintOn && coach?.text ? (
            <p ref={hintLineRef} tabIndex={-1} className={s.pullHintLine}>
              <SpeakerFace speaker="coach" size={28} />
              <span>
                <HintText text={coach.text} />
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      {rt.inspected ? (
        <>
          {spotting ? <p className={s.spotPrompt}>{SPOT_PROMPT}</p> : null}
          {/* Mark announcements ("Marked: Sender address"). Mounted with the sheet, so it is read. */}
          <p className={s.srOnly} aria-live="polite">
            {markMsg}
          </p>
          <ul className={s.evList} onKeyDown={spotting ? onRowKey : undefined}>
            {step.evidence.map((ev, i) =>
              spotting ? (
                <li key={ev.label} className={s.evItem}>
                  <button
                    ref={(el) => {
                      rowRefs.current[i] = el;
                    }}
                    type="button"
                    className={`${s.evRow} ${s.evRowBtn} ${markIdx === i ? s.evRowMarked : ""}`}
                    style={{ "--i": i, animationName: reveal ? undefined : "none" } as CSSProperties}
                    aria-pressed={markIdx === i}
                    aria-label={rowName(ev)}
                    tabIndex={i === rover ? 0 : -1}
                    data-row={i}
                    onFocus={() => setRover(i)}
                    onClick={() => toggleMark(i)}
                  >
                    <RowBody ev={ev} />
                    {markIdx === i ? (
                      <>
                        <PenCircle />
                        <MarkedBadge />
                      </>
                    ) : null}
                  </button>
                </li>
              ) : (
                <li
                  key={ev.label}
                  className={`${s.evItem} ${s.evRow}`}
                  style={{ "--i": i, animationName: reveal ? undefined : "none" } as CSSProperties}
                >
                  <RowBody ev={ev} />
                </li>
              ),
            )}
            <li
              className={`${s.evItem} ${s.evRow} ${s.undoRow}`}
              style={{ "--i": step.evidence.length, animationName: reveal ? undefined : "none" } as CSSProperties}
            >
              <span className={s.evIcon} aria-hidden="true">
                <Undo2 className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <span className={s.evMain}>
                <span className={s.evLabel}>Can we undo it?</span>
                <span className={`${s.artifact} ${s.artRecord}`}>{undoText(step)}</span>
              </span>
            </li>
          </ul>
          {announced && !encounter.practice && !note ? (
            <p className={s.evAsk}>
              <strong>Ask:</strong> Who asked? · Does it match the record? · Can we undo it?
            </p>
          ) : null}
        </>
      ) : (
        <div className={s.locked}>
          <div className={s.lockedRow} aria-hidden="true" />
          <div className={s.lockedRow} aria-hidden="true" />
          <div className={s.lockedRow} aria-hidden="true" />
          <div className={s.lockedMsg}>
            <div className={s.lockedCard}>
              <p className={s.lockedText}>
                <Lock className="h-4 w-4 flex-none" aria-hidden="true" />
                {executed ? "You never inspected this one." : "Evidence is hidden."}
              </p>
              {inspect ? (
                <button
                  type="button"
                  className={`${s.actionBtn} ${s.actionTeal} ${s.inspectBig}`}
                  aria-disabled={short("inspect") || undefined}
                  aria-label={`Inspect${costLabel("inspect")}`}
                  data-coach={ring("sheet:inspect")}
                  onClick={() => doPlay(inspect.uid)}
                >
                  <Search className="h-5 w-5" aria-hidden="true" />
                  Inspect
                  {pip("inspect", s.costPipLight)}
                </button>
              ) : playing && announced ? (
                <p className={s.lockedSub}>No Inspect card in your hand.</p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Show me: the review sheet ("The clue")                              */
/* ------------------------------------------------------------------ */

export interface ReviewSheetProps {
  /** The resolved plan's reveal (lib/game/reveal.ts revealFor), or null (closed). */
  reveal: Reveal | null;
  encounter: Encounter;
  onClose: () => void;
  /** Where focus goes on close: the toast's Next (or its Show me). */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * "Show me" after a wrong call (Oops or False alarm, every mode): the plan's evidence, read-only,
 * with the red-flag rows circled in red pen (or a safe plan's key row ticked), the plan's tell as
 * the caption, and one button, "Got it". Opened only after the plan resolved.
 */
export function ReviewSheet({ reveal, encounter, onClose, returnFocusRef }: ReviewSheetProps) {
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Keep the last reveal while the sheet animates closed.
  const [shown, setShown] = useState(reveal);
  useEffect(() => {
    if (reveal) setShown(reveal);
  }, [reveal]);
  const r = reveal ?? shown;
  const step = r ? stepById(encounter, r.stepId) : undefined;
  if (!r || !step) return <Sheet open={false} onClose={onClose} labelledBy={titleId} header={null}>{null}</Sheet>;
  const flags = new Set(r.flagIdx);
  // The player's own mark, when it is not what the review circles: say why, in one line.
  const mineIdx = r.markedIdx;
  const mineNote =
    mineIdx === null || flags.has(mineIdx) || !step.evidence[mineIdx]
      ? null
      : mineIdx === r.keyIdx
        ? `Your mark: ${step.evidence[mineIdx].label}. It checks out.`
        : `Your mark: ${step.evidence[mineIdx].label}. Odd, but not the risk.`;
  return (
    <Sheet
      open={!!reveal}
      onClose={onClose}
      labelledBy={titleId}
      initialFocusRef={headingRef}
      returnFocusRef={returnFocusRef}
      preferReturnRef
      header={
        <div className="min-w-0">
          <p className={s.evTicket}>Ticket {step.ticket}</p>
          <p className={s.reviewIntent}>{step.intent}</p>
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className={s.evTitle}>
            The clue
          </h2>
        </div>
      }
      footer={
        <div className={s.footRow}>
          <button type="button" className={`${s.actionBtn} ${s.actionPrimary}`} onClick={onClose} data-review="got-it">
            <Check className="h-5 w-5" aria-hidden="true" />
            Got it
          </button>
        </div>
      }
    >
      <ul className={`${s.evList} ${s.reviewList}`}>
        {step.evidence.map((ev, i) => {
          const flag = flags.has(i);
          const key = !flag && r.keyIdx === i;
          const mine = r.markedIdx === i;
          return (
            <li
              key={ev.label}
              className={`${s.evItem} ${s.evRow} ${s.reviewRow} ${flag ? s.clueFlag : ""} ${key ? s.clueKey : ""}`}
              style={{ animationName: "none" } as CSSProperties}
              data-clue={flag ? "flag" : key ? "key" : undefined}
            >
              <RowBody ev={ev} />
              {flag ? <PenCircle /> : key ? <PenCircle tone="key" /> : null}
              <span className={s.clueBadges}>
                {flag ? (
                  <span className={`${s.clueBadge} ${s.clueBadgeFlag}`}>
                    <Flag className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />
                    Clue
                  </span>
                ) : null}
                {key ? (
                  <span className={`${s.clueBadge} ${s.clueBadgeKey}`}>
                    <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                    Checks out
                  </span>
                ) : null}
                {mine ? <MarkedBadge /> : null}
              </span>
            </li>
          );
        })}
      </ul>
      {mineNote ? (
        <p className={s.clueMine} data-review="mine">
          {mineNote}
        </p>
      ) : null}
      <p className={s.clueCaption}>{r.caption}</p>
    </Sheet>
  );
}

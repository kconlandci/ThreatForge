"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { ArrowUpRight, Check, Hand, Lock, ScrollText, Search, Undo2 } from "lucide-react";
import { coachName, type CoachHint } from "@/lib/game/coach";
import { CARDS } from "@/lib/game/cards";
import { stepById } from "@/lib/game/useBattle";
import type { BattleState, CardId, CardInstance, Encounter, PlayResult } from "@/lib/game/types";
import { ARTIFACT_ICON, CATEGORY_ICON, artifactKind, type ArtifactKind } from "./icons";
import { HintText } from "./HintText";
import { Sheet } from "./Sheet";
import { SpeakerFace } from "./SpeakerFace";
import s from "./battle.module.css";

/* ------------------------------------------------------------------ */
/* Artifact text: emails, phone numbers, times, file names and codes    */
/* are set in mono so evidence reads like real logs and records.       */
/* ------------------------------------------------------------------ */

// Emails never take the sentence's full stop ("…@stonebridge-custody.co." shows ".co"), and a bare
// domain on file ("stonebridgecustody.com", "@harlowcole.com", "sharecrate.net/s/8Hq2") is in mono
// too, so the real and the look-alike can be compared in the same font.
const TOKEN =
  /([\w.+-]+@[\w-]+(?:\.[\w-]+)+|\(\d{3}\) \d{3}-\d{4}|\b\d{1,2}:\d{2}(?: ?[AP]M)?|\b[\w-]+\.(?:ps1|sh|exe|bat|csv)\b|#\d{3,}|\b[A-Z]{2,}(?:-[A-Z0-9]+)+\b|\b[A-Z][a-z]+-(?:[A-Z][a-z]+)\b|(?:@|\b)[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|co|org)\b(?:\/[\w/]+)?)/g;

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

export function Artifact({ label, detail }: { label: string; detail: string }) {
  const kind = artifactKind(label, detail);
  return <div className={`${s.artifact} ${ARTIFACT_CLASS[kind]}`}>{kind === "terminal" ? detail : renderTokens(detail)}</div>;
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
  /** Practice: the coach's hint for this sheet, with its ring and locks. */
  coach: Pick<CoachHint, "text" | "target" | "lock"> | null;
  /** A line for the top of the sheet (drills: where to look). */
  note?: string | null;
  /** Changes when a locked control is tapped: the hint shakes once. */
  shakeKey?: number;
  onLockedTap: () => void;
  onPlay: (cardUid: string, stepId: string) => PlayResult;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

function firstOf(hand: CardInstance[], id: CardId) {
  return hand.find((c) => c.cardId === id);
}

/** Evidence for one plan, shown as realistic artifacts. Red flags are never marked here. */
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
  // the finger, so a double tap on Inspect must not land on Block.
  const armedAt = useRef(0);
  // After Inspect inside the sheet, its button is replaced by the evidence: move focus there.
  const evidenceRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (stepId) setShownId(stepId);
    setError(null);
    armedAt.current = performance.now() + 450;
  }, [stepId, reveal]);

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

  const inspect = playing && announced && !rt.inspected ? firstOf(state.hand, "inspect") : undefined;
  const block = playing && announced ? firstOf(state.hand, "block") : undefined;
  const escalate = playing && announced ? firstOf(state.hand, "escalate") : undefined;
  const rollback = playing && rt.status === "executed" && step.reversible ? firstOf(state.hand, "rollback") : undefined;
  const byPolicy = rt.inspected && autoInspected.has(step.id);

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
  const footer =
    playing && announced ? (
      <>
        {coach?.text ? (
          <p key={shakeKey} className={`${s.sheetHint} ${shakeKey ? s.hintShake : ""}`}>
            <SpeakerFace speaker="coach" size={28} />
            <span>
              <HintText text={coach.text} />
            </span>
          </p>
        ) : null}
        <div className={s.footRow}>
          {block ? (
            <button
              type="button"
              className={`${s.actionBtn} ${s.actionPrimary} ${blockLocked ? s.isLocked : ""}`}
              aria-disabled={short("block") || blockLocked || undefined}
              aria-label={`Block${costLabel("block")}${blockLocked && lock ? `. Locked: ${lock.label}.` : ""}`}
              data-coach={ring("sheet:block")}
              onClick={() => (blockLocked ? onLockedTap() : doPlay(block.uid))}
            >
              {blockLocked ? <Lock className="h-5 w-5" aria-hidden="true" /> : <Hand className="h-5 w-5" aria-hidden="true" />}
              Block
              {pip("block")}
            </button>
          ) : null}
          {/* Before the evidence is visible this only closes the sheet: it doesn't claim a judgment. */}
          <button type="button" className={s.actionBtn} data-coach={ring("sheet:ok")} onClick={onClose}>
            {rt.inspected ? "Looks OK" : "Not now"}
          </button>
        </div>
        {escalate ? (
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
      <div className={s.says}>
        <SpeakerFace speaker="agent" size={36} />
        <p className={s.saysBubble}>
          <span className={s.srOnly}>{agent} says: </span>
          {step.quip}
        </p>
      </div>

      {whatHappened ? (
        <>
          <h3 className={s.evHeading}>What happened</h3>
          <p className={`${s.artifact} ${s.artMessage}`}>{whatHappened}</p>
        </>
      ) : null}

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

      {announced && !encounter.practice && !note ? (
        <p className={s.evAsk}>
          <strong>Ask:</strong> Who asked? · Does it match the record? · Can we undo it?
        </p>
      ) : null}

      {rt.inspected ? (
        <ul className={s.evList}>
          {step.evidence.map((ev, i) => {
            const RowIcon = ARTIFACT_ICON[artifactKind(ev.label, ev.detail)];
            return (
              <li
                key={ev.label}
                className={s.evRow}
                style={{ "--i": i, animationName: reveal ? undefined : "none" } as CSSProperties}
              >
                <span className={s.evIcon} aria-hidden="true">
                  <RowIcon className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <div className={s.evMain}>
                  <p className={s.evLabel}>{ev.label}</p>
                  <Artifact label={ev.label} detail={ev.detail} />
                </div>
              </li>
            );
          })}
          <li className={s.evRow} style={{ "--i": step.evidence.length, animationName: reveal ? undefined : "none" } as CSSProperties}>
            <span className={s.evIcon} aria-hidden="true">
              <Undo2 className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <div className={s.evMain}>
              <p className={s.evLabel}>Can we undo it?</p>
              <p className={`${s.artifact} ${s.artRecord}`}>
                {step.category === "lookup"
                  ? "Nothing to undo. It only reads. It changes nothing."
                  : step.reversible
                    ? "Yes. Roll Back can undo this after it runs."
                    : "No. Once this runs, it can't be undone."}
              </p>
            </div>
          </li>
        </ul>
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

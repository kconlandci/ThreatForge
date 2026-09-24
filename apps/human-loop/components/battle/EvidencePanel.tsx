"use client";

import { useEffect, useId, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { Lock, ScrollText, Search } from "lucide-react";
import { CARDS } from "@/lib/game/cards";
import { stepById } from "@/lib/game/useBattle";
import type { BattleState, CardId, CardInstance, Encounter, PlayResult } from "@/lib/game/types";
import { ARTIFACT_ICON, CATEGORY_ICON, artifactKind, cardIcon, type ArtifactKind } from "./icons";
import { Sheet } from "./Sheet";
import { SpeakerFace } from "./SpeakerFace";
import s from "./battle.module.css";

/* ------------------------------------------------------------------ */
/* Artifact text: emails, phone numbers, times, file names and codes    */
/* are set in mono so evidence reads like real logs and records.       */
/* ------------------------------------------------------------------ */

const TOKEN =
  /([\w.+-]+@[\w-]+\.[\w.]+|\(\d{3}\) \d{3}-\d{4}|\b\d{1,2}:\d{2}(?: ?[AP]M)?|\b[\w-]+\.(?:ps1|sh|exe|bat|csv)\b|#\d{3,}|\b[A-Z]{2,}(?:-[A-Z0-9]+)+\b|\b[A-Z][a-z]+-(?:[A-Z][a-z]+)\b)/g;

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
  onPlay: (cardUid: string, stepId: string) => PlayResult;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

function firstOf(hand: CardInstance[], id: CardId) {
  return hand.find((c) => c.cardId === id);
}

/** Evidence for one intent, shown as realistic artifacts. Red flags are never marked here. */
export function EvidencePanel({
  stepId,
  encounter,
  state,
  autoInspected,
  reveal,
  canAct,
  onPlay,
  onClose,
  returnFocusRef,
}: EvidencePanelProps) {
  const titleId = useId();
  const [error, setError] = useState<string | null>(null);
  // Keep showing the last step while the sheet animates closed.
  const [shownId, setShownId] = useState(stepId);
  useEffect(() => {
    if (stepId) setShownId(stepId);
    setError(null);
  }, [stepId]);

  const step = shownId ? stepById(encounter, shownId) : undefined;
  const rt = shownId ? state.steps[shownId] : undefined;
  if (!step || !rt) return <Sheet open={false} onClose={onClose} labelledBy={titleId} header={null}>{null}</Sheet>;

  const Icon = CATEGORY_ICON[step.category];
  const announced = state.announced.includes(step.id);
  const executed = rt.status === "executed" || rt.status === "rolled-back";
  const agent = encounter.agent.name;

  const actions: { card: CardInstance; label: string; tone: "primary" | "teal" | "plain" }[] = [];
  if (canAct && state.status === "playing") {
    if (announced) {
      const inspect = !rt.inspected ? firstOf(state.hand, "inspect") : undefined;
      if (inspect) actions.push({ card: inspect, label: "Inspect", tone: "teal" });
      const block = firstOf(state.hand, "block");
      if (block) actions.push({ card: block, label: "Block", tone: "primary" });
      const escalate = firstOf(state.hand, "escalate");
      if (escalate) actions.push({ card: escalate, label: "Escalate", tone: "plain" });
    } else if (rt.status === "executed" && step.reversible) {
      const rollback = firstOf(state.hand, "rollback");
      if (rollback) actions.push({ card: rollback, label: "Roll Back", tone: "primary" });
    }
  }

  const doPlay = (uid: string) => {
    const r = onPlay(uid, step.id);
    if (!r.ok) setError(r.reason);
  };

  const whatHappened =
    rt.status === "executed"
      ? step.outcome.executed
      : rt.status === "rolled-back"
        ? step.outcome.rolledBack ?? step.outcome.executed
        : null;

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
            <p className={s.evTicket}>{step.ticket}</p>
            <h2 id={titleId} className={s.evTitle}>
              {step.intent}
            </h2>
          </div>
        </div>
      }
      footer={
        announced || actions.length ? (
          <>
            {actions.map((a) => {
              const def = CARDS[a.card.cardId];
              const CardIcon = cardIcon(def.icon);
              const short = def.cost > state.energy;
              return (
                <button
                  key={a.card.uid}
                  type="button"
                  className={`${s.actionBtn} ${a.tone === "primary" ? s.actionPrimary : a.tone === "teal" ? s.actionTeal : ""}`}
                  aria-disabled={short || undefined}
                  aria-label={`${a.label}, costs ${def.cost} energy${short ? ". Not enough energy." : ""}`}
                  onClick={() => doPlay(a.card.uid)}
                >
                  <CardIcon className="h-5 w-5" aria-hidden="true" />
                  {a.label}
                  <span className={s.costPip} aria-hidden="true">
                    {def.cost}
                  </span>
                </button>
              );
            })}
            {announced ? (
              <button type="button" className={s.actionBtn} onClick={onClose}>
                Let it run
              </button>
            ) : null}
            {error ? (
              <p className={s.footNote} role="alert">
                {error}
              </p>
            ) : announced && canAct && actions.length === 0 ? (
              <p className={s.footNote}>No Inspect, Block, or Escalate cards in your hand right now.</p>
            ) : null}
          </>
        ) : null
      }
    >
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

      <h3 className={s.evHeading}>
        <span className="inline-flex items-center gap-1.5">
          <Search className="h-4 w-4" aria-hidden="true" strokeWidth={2.6} />
          Evidence
        </span>
        {rt.inspected && autoInspected.has(step.id) ? (
          <span className={`${s.chip} ${s.chipPolicy}`}>
            <ScrollText className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
            Checked by policy
          </span>
        ) : null}
      </h3>

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
        </ul>
      ) : (
        <div className={s.locked}>
          <div className={s.lockedRow} aria-hidden="true" />
          <div className={s.lockedRow} aria-hidden="true" />
          <div className={s.lockedRow} aria-hidden="true" />
          <p className={s.lockedMsg}>
            <span>
              <Lock className="h-4 w-4 flex-none" aria-hidden="true" />
              {executed
                ? "You never inspected this one."
                : `${step.evidence.length} clues hidden. Play Inspect to see them.`}
            </span>
          </p>
        </div>
      )}
    </Sheet>
  );
}

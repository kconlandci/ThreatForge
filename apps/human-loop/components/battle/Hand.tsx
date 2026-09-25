"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { usePathway } from "@/lib/pathways/context";
import type { CardId } from "@/lib/game/types";
import type { HandStack } from "@/lib/game/useBattle";
import { CardView } from "./CardView";
import s from "./battle.module.css";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface HandProps {
  /** The hand grouped into one stack per card type (groupHand in lib/game/useBattle.ts). */
  stacks: HandStack[];
  energy: number;
  selectedCardId: CardId | null;
  /** The agent is taking its turn: cards are shown but can't be used. */
  locked: boolean;
  /** Changes every turn so a fresh hand deals in. */
  dealKey: string | number;
  /** Height of the battle column: on short screens (landscape, zoom) the cards shrink to fit. */
  maxHeight?: number;
  showCost: boolean;
  newIds: Set<CardId>;
  /** Cards the practice coach has locked, and the reason for their accessible names. */
  lockedCards: CardId[];
  lockedLabel?: string;
  /** Shown when the hand is empty (null: say nothing, e.g. the coach's hint already covers it). */
  emptyText?: string | null;
  /** The stack the coach points at. */
  coachCardId: CardId | null;
  onSelect: (cardId: CardId, viaKeyboard: boolean) => void;
  onLockedTap: () => void;
  /** Lets the parent find stack elements (for focus and the play fly-out). */
  registerCard?: (cardId: CardId, el: HTMLButtonElement | null) => void;
}

/** The hand, one card per type with a ×n badge for copies. Cards overlap only when the row does not fit. */
export function Hand({
  stacks,
  energy,
  selectedCardId,
  locked,
  dealKey,
  maxHeight,
  showCost,
  newIds,
  lockedCards,
  lockedLabel,
  emptyText = "No cards left this turn.",
  coachCardId,
  onSelect,
  onLockedTap,
  registerCard,
}: HandProps) {
  const { cardCopy } = usePathway();
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);

  useIsoLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || 320);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = stacks.length;
  const cards = stacks.reduce((sum, x) => sum + x.uids.length, 0);
  // Room for the outer cards' tilt, the stack edge and the cost gems.
  const inner = Math.max(180, width - 24);
  const gap = n > 1 ? 10 : 0;
  // Four types get a slightly smaller floor, so they overlap less on a phone.
  const floor = n >= 4 ? 84 : 92;
  // Wide columns (tall desktop screens) get bigger cards, so the rules text is readable at a distance.
  const cap = inner >= 600 ? 176 : 140;
  const byWidth = Math.min(cap, Math.max(floor, (inner - gap * (n - 1)) / Math.max(1, n)));
  // A card is 1.42 × its width tall: keep the hand to about a quarter of a short column.
  const byHeight = maxHeight ? (maxHeight * 0.25) / 1.42 : Infinity;
  const cw = Math.round(Math.max(72, Math.min(byWidth, byHeight)));
  // Overlap whenever the row does not fit (never spill past the screen edge or onto the energy orb).
  const overlapNeeded = n >= 2 ? Math.max(0, (n * cw + gap * (n - 1) - inner) / (n - 1)) : 0;
  const overlap = overlapNeeded > 0 ? overlapNeeded + gap : 0;
  const mid = (n - 1) / 2;
  const step = n > 1 ? Math.min(2.4, 8 / (n - 1)) : 0;
  const selectedIndex = stacks.findIndex((x) => x.cardId === selectedCardId);
  const showRules = n <= 3;

  return (
    <div
      ref={boxRef}
      className={`${s.hand} ${locked ? s.handLocked : ""}`}
      style={{ "--cw": `${cw}px` } as CSSProperties}
      role="group"
      aria-label={`Your hand: ${cards} ${cards === 1 ? "card" : "cards"}${showCost ? `. ${energy} energy left` : ""}.`}
    >
      {n === 0 && emptyText ? <p className={s.handEmpty}>{emptyText}</p> : null}
      {stacks.map((x, i) => {
        const d = i - mid;
        const def = cardCopy(x.cardId);
        const isLocked = lockedCards.includes(x.cardId);
        const covered = i < n - 1 && overlap > cw * 0.12 ? overlap - gap : 0;
        const spread =
          overlap === 0 || selectedIndex < 0 || i === selectedIndex
            ? 0
            : i < selectedIndex
              ? -Math.min(10, overlap * 0.4)
              : Math.min(10, overlap * 0.4);
        return (
          <div
            key={`${x.cardId}-${dealKey}`}
            className={`${s.cardSlot} ${s.deal}`}
            style={
              {
                "--i": i,
                "--z": i === selectedIndex ? 40 : 10 + i,
                "--spread": `${spread}px`,
                marginLeft: i === 0 ? 0 : overlap > 0 ? -overlap + gap : gap,
              } as CSSProperties
            }
          >
            {x.uids.length > 1 ? <span className={s.stackEdge} aria-hidden="true" /> : null}
            <CardView
              ref={(el) => registerCard?.(x.cardId, el)}
              cardId={x.cardId}
              count={x.uids.length}
              data-uid={x.uids[0]}
              selected={x.cardId === selectedCardId}
              covered={covered}
              affordable={def.cost <= energy}
              showCost={showCost}
              showRules={showRules}
              isNew={newIds.has(x.cardId)}
              // A covered card's ribbon would collide with its neighbour; its name still says "New card".
              showRibbon={covered === 0 || x.cardId === selectedCardId}
              lockedLabel={isLocked ? lockedLabel ?? "not yet" : null}
              coach={coachCardId === x.cardId}
              disabled={locked}
              style={{ "--rot": `${d * step}deg`, "--arc": `${Math.abs(d) * Math.abs(d) * 1.2}px` } as CSSProperties}
              onSelect={(kb) => (isLocked ? onLockedTap() : onSelect(x.cardId, kb))}
            />
          </div>
        );
      })}
    </div>
  );
}

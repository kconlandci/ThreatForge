"use client";

import { forwardRef, type CSSProperties } from "react";
import { Lock } from "lucide-react";
import { CARDS } from "@/lib/game/cards";
import type { CardId } from "@/lib/game/types";
import { cardIcon } from "./icons";
import s from "./battle.module.css";

export interface CardViewProps {
  cardId: CardId;
  /** Copies of this card in the hand (a stack of 2+ shows an edge behind it and a ×n badge). */
  count?: number;
  selected?: boolean;
  /** Enough energy to play it. */
  affordable?: boolean;
  /** Show the cost gem (hidden in practice, where energy never runs out). */
  showCost?: boolean;
  /** Show the rules text (few stacks, or the card is selected). */
  showRules?: boolean;
  /** Just unlocked and not played yet: an orange NEW ribbon. */
  isNew?: boolean;
  /** Draw the NEW ribbon (false for a card half hidden under its neighbour). */
  showRibbon?: boolean;
  /** Locked by the practice coach: dimmed with a lock, still focusable; ends the accessible name. */
  lockedLabel?: string | null;
  /** The coach points at this card. */
  coach?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  onSelect?: (viaKeyboard: boolean) => void;
  /** Pixels of this card hidden under the next card in the fan: its text moves into the visible part. */
  covered?: number;
  "data-uid"?: string;
}

/** One card (or a stack of copies), Slay-the-Spire style: cost gem, name band, icon art, rules text. */
export const CardView = forwardRef<HTMLButtonElement, CardViewProps>(function CardView(
  {
    cardId,
    count = 1,
    selected = false,
    affordable = true,
    showCost = true,
    showRules = true,
    isNew = false,
    showRibbon = true,
    lockedLabel = null,
    coach = false,
    disabled = false,
    style,
    onSelect,
    covered = 0,
    ...rest
  },
  ref,
) {
  const card = CARDS[cardId];
  const Icon = cardIcon(card.icon);
  const long = card.name.length > 9;
  const rules = showRules || selected;
  const label =
    `${card.name}, ${count} in hand.` +
    (showCost ? ` Costs ${card.cost} energy.` : "") +
    ` ${card.text}` +
    (card.exhaust ? " One use." : "") +
    (isNew ? " New card." : "") +
    (showCost && !affordable ? " Not enough energy." : "") +
    (lockedLabel ? ` Locked: ${lockedLabel}.` : "");

  return (
    <button
      ref={ref}
      type="button"
      className={[
        s.card,
        card.kind === "power" ? s.power : "",
        showCost && !affordable ? s.unaffordable : "",
        covered > 0 && !selected ? s.covered : "",
        rules ? "" : s.cardNoRules,
        lockedLabel ? s.cardLocked : "",
      ].join(" ")}
      style={covered > 0 ? ({ ...style, "--ov": `${Math.round(covered)}px` } as CSSProperties) : style}
      aria-pressed={selected}
      aria-label={label}
      aria-disabled={disabled || lockedLabel ? true : undefined}
      data-coach={coach ? "on" : undefined}
      onClick={(e) => {
        if (disabled) return;
        // detail 0 = keyboard or assistive tech activation: focus then moves to the targets.
        onSelect?.(e.detail === 0);
      }}
      data-card={cardId}
      {...rest}
    >
      {showCost ? (
        <span className={`${s.gem} ${affordable ? "" : s.gemShort}`} aria-hidden="true">
          {card.cost}
        </span>
      ) : null}
      {isNew && showRibbon ? (
        <span className={s.newRibbon} aria-hidden="true">
          New
        </span>
      ) : null}
      {count > 1 ? (
        <span className={s.stackCount} aria-hidden="true">
          ×{count}
        </span>
      ) : null}
      <span className={`${s.cardBand} ${long ? s.cardBandLong : ""} ${showCost ? "" : s.cardBandNoGem}`} aria-hidden="true">
        {card.name}
      </span>
      <span className={s.cardArt} aria-hidden="true">
        <Icon />
        {card.exhaust ? <span className={s.oneUse}>1×</span> : null}
        {lockedLabel ? (
          <span className={s.lockGlyph}>
            <Lock className="h-4 w-4" strokeWidth={2.6} />
          </span>
        ) : null}
      </span>
      {rules ? (
        <span className={s.cardRules} aria-hidden="true">
          {covered > 0 && !selected && card.short ? card.short : card.text}
        </span>
      ) : null}
      {selected ? (
        <span className={s.cardFlavor} aria-hidden="true">
          {card.flavor}
        </span>
      ) : null}
    </button>
  );
});

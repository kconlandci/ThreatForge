"use client";

import { forwardRef, type CSSProperties } from "react";
import { CARDS } from "@/lib/game/cards";
import type { CardId } from "@/lib/game/types";
import { cardIcon } from "./icons";
import s from "./battle.module.css";

export interface CardViewProps {
  cardId: CardId;
  selected?: boolean;
  /** Enough energy to play it. */
  affordable?: boolean;
  /** Show the flavor line (only when the card is big enough to read it). */
  showFlavor?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  onSelect?: (viaKeyboard: boolean) => void;
  /** Accessible description id (e.g. the hand's instructions). */
  describedBy?: string;
  /** Pixels of this card hidden under the next card in the fan: its text moves into the visible part. */
  covered?: number;
  "data-uid"?: string;
}

/** One portrait card, Slay-the-Spire style: cost gem, name band, icon art, rules text. */
export const CardView = forwardRef<HTMLButtonElement, CardViewProps>(function CardView(
  {
    cardId,
    selected = false,
    affordable = true,
    showFlavor = false,
    disabled = false,
    style,
    onSelect,
    describedBy,
    covered = 0,
    ...rest
  },
  ref,
) {
  const card = CARDS[cardId];
  const Icon = cardIcon(card.icon);
  const long = card.name.length > 9;
  const kind = card.kind === "power" ? "Power" : "Skill";
  const label =
    `${card.name}. ${kind}, costs ${card.cost} energy${card.exhaust ? ", one use" : ""}. ${card.text}` +
    (affordable ? "" : " Not enough energy.");

  return (
    <button
      ref={ref}
      type="button"
      className={[
        s.card,
        card.kind === "power" ? s.power : "",
        affordable ? "" : s.unaffordable,
        covered > 0 && !selected ? s.covered : "",
      ].join(" ")}
      style={covered > 0 ? ({ ...style, "--ov": `${Math.round(covered)}px` } as CSSProperties) : style}
      aria-pressed={selected}
      aria-label={label}
      aria-describedby={describedBy}
      aria-disabled={disabled || undefined}
      onClick={(e) => {
        if (disabled) return;
        // detail 0 = keyboard or assistive tech activation: focus then moves to the targets.
        onSelect?.(e.detail === 0);
      }}
      data-card={cardId}
      {...rest}
    >
      <span className={`${s.gem} ${affordable ? "" : s.gemShort}`} aria-hidden="true">
        {card.cost}
      </span>
      <span className={`${s.cardBand} ${long ? s.cardBandLong : ""}`} aria-hidden="true">
        {card.name}
      </span>
      <span className={s.cardArt} aria-hidden="true">
        <Icon />
        {card.exhaust ? <span className={s.oneUse}>1×</span> : null}
      </span>
      <span className={s.cardRules} aria-hidden="true">
        {card.text}
      </span>
      {showFlavor ? (
        <span className={s.cardFlavor} aria-hidden="true">
          {card.flavor}
        </span>
      ) : null}
    </button>
  );
});

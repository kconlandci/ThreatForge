"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { CARDS } from "@/lib/game/cards";
import type { CardInstance } from "@/lib/game/types";
import { CardView } from "./CardView";
import s from "./battle.module.css";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface HandProps {
  hand: CardInstance[];
  energy: number;
  selectedUid: string | null;
  /** The agent is taking its turn: cards are shown but can't be used. */
  locked: boolean;
  /** Changes every turn so a fresh hand deals in. */
  dealKey: string | number;
  onSelect: (uid: string, viaKeyboard: boolean) => void;
  /** Lets the parent find card elements (for focus and the play fly-out). */
  registerCard?: (uid: string, el: HTMLButtonElement | null) => void;
}

/** The fanned hand of cards. Cards overlap to fit a phone; the selected card lifts and grows. */
export function Hand({ hand, energy, selectedUid, locked, dealKey, onSelect, registerCard }: HandProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);

  useIsoLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || 360);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = hand.length;
  // Room for the outer cards' tilt and their cost gems, so nothing leaves the screen.
  const inner = Math.max(200, width - 56);
  const cw = Math.round(Math.min(118, Math.max(96, inner / 4.2)));
  const natural = n * cw;
  const minOverlap = n > 1 ? cw * 0.06 : 0;
  const overlap = n > 1 ? Math.max(minOverlap, (natural - inner) / (n - 1)) : 0;
  const mid = (n - 1) / 2;
  const step = n > 1 ? Math.min(2.6, 10 / (n - 1)) : 0;
  const selectedIndex = hand.findIndex((c) => c.uid === selectedUid);
  const showFlavor = cw >= 112;

  return (
    <div
      ref={boxRef}
      className={`${s.hand} ${locked ? s.handLocked : ""}`}
      style={{ "--cw": `${cw}px` } as CSSProperties}
      role="group"
      aria-label={`Your hand: ${n} ${n === 1 ? "card" : "cards"}. ${energy} energy left.`}
    >
      {n === 0 ? <p className={s.handEmpty}>No cards left this turn.</p> : null}
      {hand.map((c, i) => {
        const d = i - mid;
        const spread = selectedIndex < 0 || i === selectedIndex ? 0 : i < selectedIndex ? -Math.min(8, overlap * 0.4) : Math.min(8, overlap * 0.4);
        return (
          <div
            key={`${c.uid}-${dealKey}`}
            className={`${s.cardSlot} ${s.deal}`}
            style={
              {
                "--i": i,
                "--z": i === selectedIndex ? 40 : 10 + i,
                "--spread": `${spread}px`,
                marginLeft: i === 0 ? 0 : -overlap,
              } as CSSProperties
            }
          >
            <CardView
              ref={(el) => registerCard?.(c.uid, el)}
              cardId={c.cardId}
              data-uid={c.uid}
              selected={c.uid === selectedUid}
              covered={i < n - 1 && overlap > cw * 0.12 ? overlap : 0}
              affordable={CARDS[c.cardId].cost <= energy}
              showFlavor={showFlavor}
              disabled={locked}
              style={{ "--rot": `${d * step}deg`, "--arc": `${Math.abs(d) * Math.abs(d) * 1.3}px` } as CSSProperties}
              onSelect={(kb) => onSelect(c.uid, kb)}
            />
          </div>
        );
      })}
    </div>
  );
}

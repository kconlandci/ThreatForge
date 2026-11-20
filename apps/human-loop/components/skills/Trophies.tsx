"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, Award, CalendarCheck, Flag, Hand, Lock, PenLine, Sparkles, Star, Undo2, Users, type LucideIcon } from "lucide-react";
import { TROPHIES, TROPHY_IDS, trophyHow, type TrophyDef, type TrophyId, type TrophyRecord } from "@/lib/game/trophies";
import t from "./trophies.module.css";

const ICONS: Record<TrophyDef["icon"], LucideIcon> = { ArrowUpRight, Award, CalendarCheck, Flag, Hand, PenLine, Sparkles, Star, Undo2, Users };

export function TrophyIcon({ id, className = "h-5 w-5" }: { id: TrophyId; className?: string }) {
  const Icon = ICONS[TROPHIES[id].icon];
  return <Icon className={className} strokeWidth={2.4} aria-hidden="true" />;
}

/** "New trophy!" on a result screen: one row per trophy this battle earned. */
export function NewTrophies({ ids, coach }: { ids: readonly TrophyId[]; coach: string }) {
  if (!ids.length) return null;
  return (
    <section className={t.new} aria-labelledby="hl-new-trophies" data-new-trophies={ids.join(" ")}>
      <h2 id="hl-new-trophies" className={t.newTitle}>
        {ids.length === 1 ? "New trophy!" : `${ids.length} new trophies!`}
      </h2>
      <ul className={t.newList}>
        {ids.map((id) => (
          <li key={id} className={t.newItem}>
            <span className={t.badge}>
              <TrophyIcon id={id} />
            </span>
            <span>
              <span className={t.name}>{TROPHIES[id].name}</span>
              <span className={t.how}>{trophyHow(id, coach)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Your skills: all ten trophies, earned ones in colour with the day, locked ones with how to earn them. */
export function TrophyShelf({ trophies = {}, coach, children }: { trophies?: TrophyRecord; coach: string; children?: ReactNode }) {
  const count = TROPHY_IDS.filter((id) => trophies[id]).length;
  return (
    <section className={t.shelf} aria-labelledby="hl-trophies">
      <h2 id="hl-trophies" className={t.shelfTitle}>
        Trophies <span className={t.count}>{count} of {TROPHY_IDS.length}</span>
      </h2>
      {children}
      <ul className={t.grid}>
        {TROPHY_IDS.map((id) => {
          const day = trophies[id];
          return (
            <li key={id} className={`${t.cell} ${day ? t.earned : t.locked}`} data-trophy={id} data-earned={day ? "yes" : "no"}>
              <span className={t.badge}>{day ? <TrophyIcon id={id} /> : <Lock className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />}</span>
              <span className={t.name}>{TROPHIES[id].name}</span>
              <span className={t.how}>{day ? <>Earned {shortDay(day)}</> : trophyHow(id, coach)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** "Nov 20" from "2026-11-20" (no time zone shifts: the day is already local). */
function shortDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

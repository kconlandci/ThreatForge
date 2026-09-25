/**
 * The Help Desk wording the shared game code falls back to.
 *
 * Every pure library works for any pathway: pathway facts reach it through fields hydrated onto
 * the Encounter (coach, headlines, coachScript), through CARDS, or through explicit options. When
 * a field is missing, the default here applies, and it is exactly what the Help Desk has always
 * shown (the Help Desk golden test holds it). This is the ONE shared module allowed to name the
 * Help Desk cast (see the "no hard-coded cast" test in lib/pathways/registry.test.ts).
 */
import type { CoachInfo, HeadlineKey } from "./types";

/** The Help Desk lead (content/help-desk/pathway.json has the same values). */
export const DEFAULT_COACH: CoachInfo = { name: "Dana", role: "Help desk manager", spriteKey: "dana" };

/**
 * Partly-right reasons as STORED in saves (SkillRecord.missWhy). Never change these strings: old
 * saves hold them. Display them through mastery.reasonText(), which swaps in the pathway's coach.
 */
export const STORED_COACH_CHECKED = "Dana did the check";
export const STORED_COACH_NOT_NEEDED = "Dana didn't need this one";
/** The coach name at the start of the stored reasons above. */
export const STORED_REASON_COACH = "Dana";

/** Help Desk wording of the cards whose copy names the cast (CARDS in cards.ts). */
export const HELP_DESK_CARD_COPY = {
  escalate: {
    text: "Send a plan to Dana. She gets it right.",
    short: "Send a plan to Dana.",
    flavor: "Dana has seen things. Dana fears nothing.",
  },
  coffeeFlavor: "Brewed before Ollie “fixed” the machine.",
} as const;

/**
 * Result-screen headline pools, used when an encounter has no `headlines` of its own. The pick is
 * by index (engine.ts pick), so never reorder or resize these lists.
 */
export const HEADLINES: Record<HeadlineKey, string[]> = {
  /** 3 stars, no misses, no false alarms. */
  perfect: [
    "Flawless shift. {agent} wants your autograph.",
    "Zero misses. Zero false alarms. Dana almost smiled.",
    "Perfect shift. {agent} is writing you a thank-you haiku.",
  ],
  /** 3 stars with one false alarm. */
  sharp: [
    "Nothing got past you. One flinch. We'll allow it.",
    "Sharp shift. One false alarm. Dana is counting.",
  ],
  /** Won, nothing bad got through, but a risky plan was blocked without looking (2 stars). */
  lucky: [
    "Nothing got past you. Some of that was a lucky guess.",
    "Clean shift, but you blocked blind. Inspect first next time.",
  ],
  /** Won, nothing bad got through, but lots of false alarms. */
  jumpy: [
    "Nothing bad got through. A lot of good stuff didn't either.",
    "Safe shift. The ticket queue took the scenic route.",
  ],
  /** Won, few false alarms, but something bad got through. */
  leaky: [
    "Good calls, mostly. Something slipped past you.",
    "You won, but something got through. Check the debrief.",
  ],
  /** Won with misses and false alarms. */
  scraped: [
    "You made it. The ticket queue has questions.",
    "A win is a win. Dana is refilling her tea.",
  ],
  breach: [
    "{agent} did the wrong thing. Confidently.",
    "Breach! {agent} says it was mostly a good idea.",
    "Risk maxed out. Every phone in the office is ringing.",
  ],
  timeout: [
    "Shift over. The tickets won this round.",
    "Out of time. The queue is still blinking at you.",
  ],
  playing: ["Shift in progress."],
};

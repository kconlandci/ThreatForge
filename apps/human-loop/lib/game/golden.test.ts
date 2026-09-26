/**
 * Help Desk golden: everything a player can see or a save depends on, captured before the
 * multi-pathway refactor (lib/game/__golden__/help-desk.json). The refactor must keep it
 * byte-identical. Re-capture ONLY for an intended Help Desk change:
 *   GOLDEN_WRITE=1 npx vitest run lib/game/golden.test.ts
 * Intended changes so far:
 * - The no-Block hint (every pathway): with no Block in hand, the hint names Escalate or Coffee.
 *   One trace changed (hd-daily-1|1330687161|perfect), only in its "All checked" hint line.
 * - Renamed made-up names that matched real ones (QuickChat, Kestrel, FastFreight, harlowcole.com).
 *   Audited: with the old names swapped back in, the capture equals the previous golden exactly.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cardPrompt, coachHint, drillCoach, sheetCoach, type CoachUi } from "./coach";
import { createBattle, endTurn, scoreBattle } from "./engine";
import { FIXTURE_NAMES, fixtureBattle, fixtureEncounter, tryPlay } from "./fixtures";
import { HELP_DESK } from "@/lib/pathways/help-desk";
import { reasonText } from "./mastery";
import { QUESTION_TITLES, MASTERY_SKILLS } from "./skills";
import { planLines } from "./skillsView";
import type { BattleState, CardId, Encounter, HistoryEntry, MasterySkillId, PathwayProgress, ShiftSpec, SkillRecord } from "./types";
import { HAND_ORDER, debriefRows, eventsToBeats, newEvents } from "./useBattle";

const FILE = join(__dirname, "__golden__", "help-desk.json");
const B = HELP_DESK;

/* ------------------------------------------------------------------ */
/* Adapter: the only part that follows API moves.                      */
/* ------------------------------------------------------------------ */

const H = {
  bankVersion: B.bankVersion,
  practice: B.practice,
  story: B.story,
  planDaily: (p: PathwayProgress, playerId: string, today: string) => B.planDaily(p, { playerId, today }),
  planDrill: (p: PathwayProgress, skill: MasterySkillId, playerId: string, today: string, k: number) =>
    B.planDrill(p, skill, { playerId, today, k }),
  build: (spec: ShiftSpec) => B.shiftEncounter(spec),
  skill: (id: MasterySkillId) => {
    const s = B.skill(id);
    return { name: s.name, oneLiner: s.oneLiner, whereToLook: s.whereToLook, question: s.question };
  },
  card: (id: CardId) => {
    const c = B.cardCopy(id);
    return { name: c.name, text: c.text, short: c.short ?? null, flavor: c.flavor, cost: c.cost };
  },
  drillCoach: (id: MasterySkillId, level: 0 | 1 | 2 | 3) => drillCoach(id, level, B.skill(id).whereToLook),
  reason: (r: string) => reasonText(r, B.coach.name),
  ui: {
    barTitle: B.config.copy.barTitle,
    barSub: B.config.copy.barSub,
    guideEyebrow: B.config.copy.guideEyebrow,
    replayStory: B.config.copy.replayStory,
    resultWon: B.config.copy.resultHeading.won,
    resultLost: B.config.copy.resultHeading.lost,
    coachName: B.coach.name,
    coachRole: B.coach.role,
    coachSprite: `${B.coach.spriteKey}.svg`,
    agentPortrait: `${B.stage.agentSprite}-eager.svg`,
    escalateLabel: `Not sure? Escalate to ${B.coach.name}`,
    howDecide: `Block what's wrong. Not sure? Escalate to ${B.coach.name}.`,
    skillsAria: `${B.coach.name}'s 3 questions`,
    officeName: B.hub.officeName,
    questions: QUESTION_TITLES,
  },
};

/* ------------------------------------------------------------------ */
/* Capture                                                             */
/* ------------------------------------------------------------------ */

const PLAYERS = ["guest", "p-1", "5f0c2a8e-1111-4c2b-9d3e-000000000001", "hl-aa", "zz-9"];
const TODAY = "2026-09-25";

function fresh(over: Partial<PathwayProgress> = {}): PathwayProgress {
  return { introSeen: true, hub: null, battle: null, pendingResult: null, best: null, attempts: 1, wins: 1, history: [], ...over };
}

const rec = (recent: string, level: 0 | 1 | 2 | 3 | 4, last: string): SkillRecord => ({
  recent,
  n: recent.length + 2,
  level,
  days: ["2026-09-20", last],
  last,
  solidOn: level >= 3 ? "2026-09-20" : null,
});

const dailies = (n: number): HistoryEntry[] =>
  Array.from({ length: n }, (_, i) => ({
    encounterId: `hd-daily-${i}`,
    status: "won" as const,
    stars: 0,
    at: "2026-09-20T10:00:00.000Z",
    catches: 0,
    falseAlarms: 0,
    misses: 0,
    mode: "daily" as const,
  }));

const SKILLED = (n: number): PathwayProgress =>
  fresh({
    dailyCount: n,
    history: dailies(3),
    recentTickets: [["a-sim-swap"], ["b-back-from-vacation", "c-lost-phone"]],
    skills: {
      "verify-identity": rec("RrWr", 2, "2026-09-22"),
      "check-approval": rec("rrRRr", 3, "2026-09-24"),
      "guard-data": rec("W", 1, "2026-09-23"),
      "approve-checked": rec("rrP", 1, "2026-09-21"),
    },
    scored: { "a-sim-swap-1": "2026-09-24" },
  });

const sha = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 16);

/**
 * The encounter as it was before the refactor: the new optional hydrated keys stripped, and the
 * coach's dialogue speaker under its old name ("dana"; speakers are never saved).
 */
function plain(enc: Encounter): Encounter {
  const rest = { ...enc } as Encounter & { coach?: unknown; headlines?: unknown; coachScript?: unknown };
  delete rest.coach;
  delete rest.headlines;
  delete rest.coachScript;
  return JSON.parse(JSON.stringify(rest).split('"speaker":"coach"').join('"speaker":"dana"'));
}

type Policy = (s: BattleState, e: Encounter) => BattleState;
const perfect: Policy = (start, e) => {
  let s = start;
  for (const id of s.announced.slice()) s = tryPlay(s, e, "inspect", id);
  for (const id of s.announced.slice()) {
    const step = e.steps.find((x) => x.id === id);
    if (!step || step.safe) continue;
    const before = s;
    s = tryPlay(s, e, "block", id);
    if (s === before) s = tryPlay(s, e, "escalate", id);
  }
  s = tryPlay(s, e, "policy-callback");
  return s;
};
const trusting: Policy = (s) => s;
const jumpy: Policy = (start, e) => {
  let s = start;
  for (const id of s.announced.slice()) s = tryPlay(s, e, "block", id);
  return s;
};
const escalating: Policy = (start, e) => {
  let s = tryPlay(start, e, "coffee");
  for (const id of s.announced.slice()) {
    const before = s;
    s = tryPlay(s, e, "escalate", id);
    if (s === before) s = tryPlay(s, e, "inspect", id);
  }
  s = tryPlay(s, e, "rollback");
  return s;
};

function trace(e: Encounter, seed: number, policy: Policy, firstShift: boolean) {
  const uis = (s: BattleState): CoachUi[] => [
    { selectedCardId: null, sheetStepId: null },
    { selectedCardId: null, sheetStepId: s.announced[0] ?? null },
    { selectedCardId: "inspect", sheetStepId: null },
    { selectedCardId: "block", sheetStepId: null },
    { selectedCardId: "escalate", sheetStepId: null },
  ];
  const out: unknown[] = [];
  const snap = (s: BattleState) => {
    out.push(
      uis(s).map((ui) => {
        const h = coachHint(s, e, { ...ui, firstShift });
        const sh = s.announced[0] ? sheetCoach(s, e, s.announced[0], ui) : null;
        return [h.id, h.text, h.target, h.lock ?? null, sh?.text ?? null];
      }),
    );
    out.push((["inspect", "block", "escalate", "rollback", "policy-callback", "coffee"] as CardId[]).map((c) => cardPrompt(s, e, c).text));
  };
  let s = createBattle(e, seed);
  snap(s);
  out.push(eventsToBeats(s.events, e).map((b) => [b.toast ?? null, b.log]));
  for (let i = 0; i < 30 && s.status === "playing"; i++) {
    let prev = s;
    s = policy(s, e);
    out.push(eventsToBeats(newEvents(prev, s), e).map((b) => [b.toast ?? null, b.log]));
    snap(s);
    if (s.status !== "playing") break;
    prev = s;
    s = endTurn(s, e);
    out.push(eventsToBeats(newEvents(prev, s), e).map((b) => [b.toast ?? null, b.log]));
    snap(s);
  }
  out.push(debriefRows(s, e).map((r) => [r.resolution, r.plan.result, H.reason(r.plan.reason)]));
  out.push(planLines(s, e).map((l) => [l.step.id, l.question, l.text]));
  out.push(scoreBattle(s, e));
  return sha(out);
}

function capture() {
  const plans: Record<string, unknown> = {};
  const built: Record<string, string> = {};
  const full: Record<string, unknown> = {};
  const specs: ShiftSpec[] = [];
  for (const pid of PLAYERS) {
    for (let n = 0; n <= 5; n++) {
      for (const [name, p] of [["fresh", fresh({ dailyCount: n })], ["skilled", SKILLED(n)]] as const) {
        const spec = H.planDaily(p, pid, TODAY);
        plans[`daily|${pid}|${name}|${n}`] = spec;
        specs.push(spec);
      }
      for (const skill of MASTERY_SKILLS) {
        const spec = H.planDrill(fresh(), skill, pid, TODAY, n);
        plans[`drill|${pid}|${skill}|${n}`] = spec;
        if (n < 2) specs.push(spec);
      }
    }
  }
  specs.forEach((spec, i) => {
    const enc = plain(H.build(spec));
    built[`${spec.id}|${spec.seed}`] = sha(enc);
    if (i < 3 || spec.kind === "drill" && i < 20) full[`${spec.id}|${spec.seed}`] = enc;
  });

  const headlines: Record<string, string> = {};
  for (const name of FIXTURE_NAMES) {
    const e = fixtureEncounter(name) === fixtureEncounter("start") ? H.story : H.practice;
    headlines[`fixture|${name}`] = scoreBattle(fixtureBattle(name, e), e).headline;
  }

  const traces: Record<string, string> = {};
  const pols: [string, Policy][] = [["perfect", perfect], ["trusting", trusting], ["jumpy", jumpy], ["escalating", escalating]];
  for (const seed of [1, 2, 3, 7, 11, 42]) {
    for (const [pn, pol] of pols) {
      traces[`practice|${seed}|${pn}`] = trace(H.practice, seed, pol, false);
      traces[`story|${seed}|${pn}|first`] = trace(H.story, seed, pol, true);
      traces[`story|${seed}|${pn}`] = trace(H.story, seed, pol, false);
    }
  }
  for (const spec of specs.slice(0, 12)) {
    const e = H.build(spec);
    for (const [pn, pol] of pols) traces[`${spec.id}|${spec.seed}|${pn}`] = trace(e, spec.seed, pol, false);
  }
  for (let seed = 1; seed <= 80; seed++) {
    for (const [pn, pol] of pols) {
      let s = createBattle(H.story, seed);
      for (let i = 0; i < 20 && s.status === "playing"; i++) {
        s = pol(s, H.story);
        if (s.status === "playing") s = endTurn(s, H.story);
      }
      headlines[`story|${seed}|${pn}`] = scoreBattle(s, H.story).headline;
    }
  }

  const skills = Object.fromEntries(MASTERY_SKILLS.map((id) => [id, { ...H.skill(id), drill: [0, 1, 2, 3].map((l) => H.drillCoach(id, l as 0)) }]));
  const cards = Object.fromEntries(HAND_ORDER.filter((id) => id !== ("policy-look-first" as CardId) && id !== ("policy-change-window" as CardId) && id !== ("policy-code-review" as CardId) && id !== ("policy-source-check" as CardId)).map((id) => [id, H.card(id)]));
  const reasons = ["Lucky guess", "Dana did the check", "Caught it late", "Dana didn't need this one", "Fixed it later", "Caught"].map(H.reason);

  return {
    bankVersion: H.bankVersion,
    plans,
    built,
    full,
    headlines,
    traces,
    skills,
    cards,
    reasons,
    ui: H.ui,
    practice: plain(H.practice),
    story: plain(H.story),
  };
}

describe("Help Desk golden (unchanged by the multi-pathway refactor)", () => {
  const now = capture();
  if (process.env.GOLDEN_WRITE === "1" || !existsSync(FILE)) {
    writeFileSync(FILE, `${JSON.stringify(now, null, 1)}\n`);
  }
  const gold = JSON.parse(readFileSync(FILE, "utf8"));
  for (const key of Object.keys(gold)) {
    it(`matches: ${key}`, () => {
      expect(JSON.parse(JSON.stringify((now as Record<string, unknown>)[key]))).toEqual(gold[key]);
    });
  }
});

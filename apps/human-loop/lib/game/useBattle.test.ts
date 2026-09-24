import { describe, expect, it } from "vitest";
import { HELP_DESK_ENCOUNTER as E } from "./content";
import { createBattle, endTurn } from "./engine";
import { FIXTURE_NAMES, fixtureBattle, tryPlay } from "./fixtures";
import { debriefRows, eventsToBeats, newEvents, resolvedCount } from "./useBattle";

describe("fixtures", () => {
  it("builds every fixture with the expected status", () => {
    const want: Record<string, string> = {
      start: "playing",
      mid: "playing",
      rollback: "playing",
      won: "won",
      lost: "lost-breach",
      timeout: "lost-timeout",
    };
    for (const name of FIXTURE_NAMES) expect(fixtureBattle(name).status, name).toBe(want[name]);
  });
});

describe("eventsToBeats", () => {
  it("turns the opening events into one turn beat", () => {
    const s = createBattle(E, 3);
    const beats = eventsToBeats(s.events, E);
    expect(beats).toHaveLength(1);
    expect(beats[0].kind).toBe("turn");
    expect(beats[0].announced).toBe(s.announced.length);
  });

  it("makes one agent beat per executed intent, then a turn beat", () => {
    const s0 = createBattle(E, 3);
    const s1 = endTurn(s0, E);
    const beats = eventsToBeats(newEvents(s0, s1), E);
    const agent = beats.filter((b) => b.kind === "agent");
    expect(agent).toHaveLength(s0.announced.length);
    expect(agent[0].toast?.text).toBeTruthy();
    expect(beats[beats.length - 1].kind).toBe("turn");
  });

  it("reports a manual inspect as a player beat that opens the evidence", () => {
    let s = createBattle(E, 5);
    for (let i = 0; i < 4 && !s.hand.some((c) => c.cardId === "inspect"); i++) s = endTurn(s, E);
    const before = s;
    s = tryPlay(s, E, "inspect");
    if (s === before) return; // no inspect in hand for this seed
    const beats = eventsToBeats(newEvents(before, s), E);
    expect(beats[0].kind).toBe("player");
    expect(beats[0].openEvidence).toBe(before.announced.find((id) => s.steps[id].inspected));
  });
});

describe("debrief", () => {
  it("grades every step of a won battle", () => {
    const s = fixtureBattle("won");
    const rows = debriefRows(s, E);
    expect(rows).toHaveLength(E.steps.length);
    expect(resolvedCount(s)).toBe(E.steps.length);
    expect(rows.filter((r) => r.grade === "bad")).toHaveLength(s.stats.misses);
    expect(rows.filter((r) => !r.step.safe).every((r) => r.redFlags.length > 0)).toBe(true);
  });
});

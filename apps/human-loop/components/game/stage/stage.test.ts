import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SPRITES } from "@/lib/game/assets";
import { buildWalkable, characterByRole, isWalkable, stageSprites, targetAtTile } from "@/lib/game/hubMap";
import { TEST_PATHWAYS } from "@/lib/pathways/testing";
import { tileToWorld, worldToTile, worldToGridFloat } from "./iso";
import { findPath, nearestWalkable } from "./pathfind";

describe("iso math", () => {
  it("round-trips tile centres and diamond edges", () => {
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        const c = tileToWorld(x, y);
        expect(worldToTile(c.x, c.y)).toEqual({ x, y });
        // Just inside each diamond corner still maps to the same tile.
        expect(worldToTile(c.x, c.y - 15)).toEqual({ x, y });
        expect(worldToTile(c.x + 31, c.y)).toEqual({ x, y });
        expect(worldToTile(c.x - 31, c.y)).toEqual({ x, y });
        expect(worldToTile(c.x, c.y + 15)).toEqual({ x, y });
      }
    }
    const g = worldToGridFloat(0, 16);
    expect(g.x).toBeCloseTo(0);
    expect(g.y).toBeCloseTo(0);
  });
});

describe("pathfinding", () => {
  const grid = [
    [true, true, true],
    [true, false, true],
    [true, true, true],
  ];
  it("walks around blocks without cutting corners", () => {
    const p = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 2 });
    expect(p).not.toBeNull();
    expect(p![0]).toEqual({ x: 0, y: 0 });
    expect(p![p!.length - 1]).toEqual({ x: 2, y: 2 });
    for (let i = 1; i < p!.length; i++) {
      const a = p![i - 1];
      const b = p![i];
      expect(Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1).toBe(true);
      expect(grid[b.y][b.x]).toBe(true);
      if (a.x !== b.x && a.y !== b.y) {
        expect(grid[a.y][b.x] && grid[b.y][a.x]).toBe(true);
      }
    }
  });
  it("returns null for blocked goals", () => {
    expect(findPath(grid, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
  });
  it("finds the nearest walkable tile", () => {
    expect(nearestWalkable(grid, { x: 1, y: 1 }, { x: 0, y: 1 })).toEqual({ x: 0, y: 1 });
  });
  it("skips walkable tiles that cannot be reached", () => {
    const pocket = [
      [true, false, true],
      [false, false, true],
      [true, true, true],
    ];
    // (0,0) is walkable but sealed off; the nearest reachable tile to (0,1) is (0,2).
    expect(nearestWalkable(pocket, { x: 0, y: 1 }, { x: 2, y: 2 })).toEqual({ x: 0, y: 2 });
  });
});

describe.each(TEST_PATHWAYS.map((p) => [p.id, p] as const))("%s hub map", (_id, P) => {
  const MAP = P.stage.hubMap;
  const WALK = buildWalkable(MAP);
  const inside = (t: { x: number; y: number }) => t.x >= 0 && t.y >= 0 && t.x < MAP.cols && t.y < MAP.rows;

  it("has a walkable spawn", () => {
    expect(isWalkable(MAP.spawn, WALK)).toBe(true);
  });

  it("has a spot for every hub target, and no others", () => {
    expect(Object.keys(MAP.targets).sort()).toEqual(Object.keys(P.hub.targets).sort());
  });

  it("can reach every target's interaction tile from spawn; hot tiles are in bounds", () => {
    for (const [id, spot] of Object.entries(MAP.targets)) {
      expect(isWalkable(spot.tile, WALK), id).toBe(true);
      expect(findPath(WALK, MAP.spawn, spot.tile), id).not.toBeNull();
      for (const t of spot.hotTiles) {
        expect(inside(t), `${id} hot tile ${t.x},${t.y}`).toBe(true);
        expect(targetAtTile(t, MAP)).toBe(id);
      }
    }
    for (const p of MAP.props) if (p.target) expect(Object.keys(MAP.targets), p.id).toContain(p.target);
  });

  it("keeps every walkable tile connected, and characters' tiles blocked", () => {
    for (let y = 0; y < MAP.rows; y++) {
      for (let x = 0; x < MAP.cols; x++) {
        if (!WALK[y][x]) continue;
        expect(findPath(WALK, MAP.spawn, { x, y }), `${x},${y}`).not.toBeNull();
      }
    }
    for (const c of MAP.characters) expect(isWalkable(c.tile, WALK), c.id).toBe(false);
  });

  it("has one agent and one coach, matching the hub's battle and talk targets", () => {
    const agent = characterByRole(MAP, "agent");
    const coach = characterByRole(MAP, "coach");
    expect(MAP.characters.filter((c) => c.role === "agent")).toHaveLength(1);
    expect(MAP.characters.filter((c) => c.role === "coach")).toHaveLength(1);
    expect(agent?.sprite).toBe(P.stage.agentSprite);
    expect(coach?.sprite).toBe(P.stage.coachSprite);
    expect(P.hub.targets[agent!.target].action).toBe("battle");
    expect(P.hub.targets[coach!.target].action).toBe("talk");
  });

  it("puts blink lights on things that exist, with exactly one antenna, on the agent", () => {
    const owners = new Set([...MAP.props.map((p) => p.id), ...MAP.characters.map((c) => c.id), ...MAP.decor.map((d) => d.id)]);
    for (const l of MAP.blinkLights) expect(owners.has(l.on), l.on).toBe(true);
    const antennas = MAP.blinkLights.filter((l) => l.kind === "antenna");
    expect(antennas).toHaveLength(1);
    expect(antennas[0].on).toBe(characterByRole(MAP, "agent")!.id);
  });

  it("lists every sprite the stage draws, and each one exists", () => {
    const keys = stageSprites(P.stage);
    for (const p of MAP.props) expect(keys).toContain(p.sprite);
    for (const c of MAP.characters) expect(keys).toContain(c.sprite);
    for (const d of MAP.decor) expect(keys).toContain(d.sprite);
    for (const m of ["idle", "eager", "busted", "sad", "celebrate"]) expect(keys).toContain(`${P.stage.agentSprite}-${m}`);
    for (const k of keys) {
      const def = (SPRITES as Record<string, { file: string; kind?: string }>)[k];
      expect(def, k).toBeTruthy();
      expect(def.kind, `${k} has a kind`).toBeTruthy();
      expect(existsSync(join(process.cwd(), "public", def.file)), def.file).toBe(true);
    }
    for (const m of ["idle", "eager", "busted", "sad", "celebrate"]) {
      expect((SPRITES as Record<string, { kind?: string }>)[`${P.stage.agentSprite}-${m}`].kind).toBe("portrait");
    }
  });
});

describe("evidence row kinds", () => {
  it("draws every Help Desk evidence row as before", async () => {
    const { artifactKind } = await import("@/components/battle/icons");
    const { HELP_DESK } = await import("@/lib/pathways/help-desk");
    const { readFileSync } = await import("node:fs");
    const gold = JSON.parse(readFileSync(join(process.cwd(), "lib/game/__golden__/artifact-kinds.json"), "utf8"));
    const now: Record<string, string> = {};
    const steps = [...HELP_DESK.encounters.flatMap((e) => e.steps), ...HELP_DESK.bank.flatMap((t) => t.steps)];
    for (const s of steps) for (const e of s.evidence) now[`${s.id}|${e.label}`] = artifactKind(e.label, e.detail);
    expect(now).toEqual(gold);
  });

  it("knows the SOC rows", async () => {
    const { artifactKind, CATEGORY_ICON, CATEGORY_LABEL } = await import("@/components/battle/icons");
    expect(artifactKind("Playbook PB-02", "Isolate it now.")).toBe("policy");
    expect(artifactKind("EDR alert", "BL-LT-0277: Word started PowerShell.")).toBe("terminal");
    expect(artifactKind("Sign-in alert", "Boston, then Chicago.")).toBe("terminal");
    expect(artifactKind("Hash lookup", "No match.")).toBe("terminal");
    expect(artifactKind("Alert group", "40 alerts.")).toBe("terminal");
    expect(artifactKind("Mail check", "Sender checks pass.")).toBe("email");
    expect(artifactKind("Mailbox rules", "3 rules.")).toBe("email");
    expect(CATEGORY_LABEL.endpoint).toBe("Device");
    expect(CATEGORY_LABEL.network).toBe("Network");
    expect(CATEGORY_ICON.endpoint).toBeTruthy();
    expect(CATEGORY_ICON.network).toBeTruthy();
  });
});

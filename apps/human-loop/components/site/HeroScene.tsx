import { ArrowUpRight, Hand, Search } from "lucide-react";
import { ISO_TILE, SPRITES, type SpriteKey } from "@/lib/game/assets";

/**
 * Landing hero: a small static isometric diorama of the Fenwick IT help desk, composed from the
 * game's sprite SVGs (no Phaser). Same 2:1 iso math as the stage: tile (gx, gy) floor centre is
 * ((gx - gy) * 32, (gx + gy + 1) * 16) in world px. All motion is CSS and reduced-motion safe.
 */

const HW = ISO_TILE.w / 2;
const HH = ISO_TILE.h / 2;
const COLS = 5;
const ROWS = 4;
const WALL_H = 104;
const CAP = 0.22;
const SLAB = 16;

type Pt = [number, number];
const vtx = (gx: number, gy: number): Pt => [(gx - gy) * HW, (gx + gy) * HH];
const tile = (gx: number, gy: number): Pt => [(gx - gy) * HW, (gx + gy + 1) * HH];
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const pts = (list: Pt[]) => list.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");

const VIEW = { x: -146, y: -150, w: 322, h: 336 };
/** World point -> % of the scene box, for HTML overlays. */
const pct = (p: Pt) => ({
  left: `${(((p[0] - VIEW.x) / VIEW.w) * 100).toFixed(2)}%`,
  top: `${(((p[1] - VIEW.y) / VIEW.h) * 100).toFixed(2)}%`,
});

interface Placed {
  id: string;
  sprite: SpriteKey;
  at: Pt;
  flip?: boolean;
  className?: string;
  /** Lights drawn over the sprite, in sprite-local px (before flipping). */
  lights?: { x: number; y: number; r: number; color: string; delay?: number }[];
}

const onTile = (gx: number, gy: number, dx = 0, dy = 0): Pt => add(tile(gx, gy), [dx, dy]);
const onRightWall = (along: number, height: number): Pt => add(vtx(along, 0), [0, -height]);
const onLeftWall = (along: number, height: number): Pt => add(vtx(0, along), [0, -height]);

const DECOR: Placed[] = [
  { id: "poster", sprite: "wall-poster", at: onRightWall(1.5, 62) },
  { id: "clock", sprite: "wall-clock", at: onRightWall(2.8, 86) },
  { id: "window-r", sprite: "wall-window-right", at: onRightWall(4.05, 58) },
  { id: "window-l", sprite: "wall-window-left", at: onLeftWall(2.55, 58) },
];

const RESETBOT_AT = onTile(3, 0, 6, 4);

const THINGS: Placed[] = ([
  {
    id: "server-rack",
    sprite: "server-rack",
    at: onTile(0, 0),
    lights: [
      { x: 10.88, y: 19.88, r: 1.4, color: "#43e0c4" },
      { x: 13.08, y: 34.88, r: 1.4, color: "#ff8a3d", delay: 0.6 },
      { x: 10.88, y: 47.48, r: 1.4, color: "#43e0c4", delay: 1.1 },
      { x: 13.08, y: 61.28, r: 1.4, color: "#43e0c4", delay: 0.3 },
      { x: 13.08, y: 82.98, r: 1.4, color: "#ff8a3d", delay: 1.6 },
    ],
  },
  { id: "coffee", sprite: "coffee-machine", at: onTile(0, 1, 2, 0) },
  { id: "whiteboard", sprite: "whiteboard", at: onTile(0, 2, 6, 2) },
  { id: "plant-l", sprite: "plant", at: onTile(0, 3) },
  { id: "plant-r", sprite: "plant", at: onTile(4, 0) },
  { id: "desk", sprite: "desk-resetbot", at: onTile(2, 1) },
  {
    id: "resetbot",
    sprite: "resetbot",
    at: RESETBOT_AT,
    className: "hl-bob",
    lights: [{ x: 22, y: 3.4, r: 3.4, color: "#ff8a3d" }],
  },
  { id: "dana", sprite: "dana", at: onTile(1, 3, 4, -2) },
  { id: "player", sprite: "player", at: onTile(2, 3, 10, 2) },
  { id: "desk-player", sprite: "desk-monitor", at: onTile(4, 2) },
  { id: "chair", sprite: "chair", at: onTile(4, 3, -2, -6), flip: true },
] satisfies Placed[]).sort((a, b) => a.at[1] - b.at[1] || a.at[0] - b.at[0]);

function Sprite({ p }: { p: Placed }) {
  const def = SPRITES[p.sprite];
  const x = -def.w * def.originX;
  const y = -def.h * def.originY;
  return (
    <g className={p.className} data-sprite={p.id}>
      <g transform={`translate(${p.at[0]} ${p.at[1]})${p.flip ? " scale(-1 1)" : ""}`}>
        <image href={def.file} x={x} y={y} width={def.w} height={def.h} />
        {p.lights?.map((l, i) => (
          <circle
            key={i}
            cx={x + l.x}
            cy={y + l.y}
            r={l.r}
            fill={l.color}
            className="hl-blink"
            style={l.delay ? { animationDelay: `${l.delay}s` } : undefined}
          />
        ))}
      </g>
    </g>
  );
}

function Room() {
  const B = vtx(0, 0);
  const R = vtx(COLS, 0);
  const L = vtx(0, ROWS);
  const F = vtx(COLS, ROWS);
  const up: Pt = [0, -WALL_H];
  const offR: Pt = [CAP * HW, -CAP * HH];
  const offL: Pt = [-CAP * HW, -CAP * HH];
  const down: Pt = [0, SLAB];

  const tiles: { key: string; d: string; alt: boolean }[] = [];
  for (let gx = 0; gx < COLS; gx++) {
    for (let gy = 0; gy < ROWS; gy++) {
      const c = tile(gx, gy);
      tiles.push({
        key: `${gx}-${gy}`,
        d: pts([
          [c[0], c[1] - HH],
          [c[0] + HW, c[1]],
          [c[0], c[1] + HH],
          [c[0] - HW, c[1]],
        ]),
        alt: (gx + gy) % 2 === 1,
      });
    }
  }

  const rug = [vtx(1.6, 1.7), vtx(3.9, 1.7), vtx(3.9, 3.6), vtx(1.6, 3.6)];
  const rugInner = [vtx(1.85, 1.95), vtx(3.65, 1.95), vtx(3.65, 3.35), vtx(1.85, 3.35)];
  const band = 30;

  return (
    <g>
      {/* Ground shadow */}
      <ellipse cx={F[0] - 2} cy={F[1] + SLAB + 4} rx="150" ry="18" fill="var(--hl-ink)" opacity="0.07" />
      {/* Slab */}
      <polygon points={pts([add(L, offL), F, add(F, down), add(add(L, offL), down)])} fill="var(--hl-teal)" />
      <polygon points={pts([F, add(R, offR), add(add(R, offR), down), add(F, down)])} fill="var(--hl-teal-dark)" />
      {/* Floor */}
      {tiles.map((t) => (
        <polygon key={t.key} points={t.d} fill={t.alt ? "#E4EBEC" : "#EDF2F3"} />
      ))}
      <polygon points={pts(rug)} fill="#CFE3DF" />
      <polygon points={pts(rugInner)} fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.8" />
      {/* Right wall (faces the light) */}
      <polygon points={pts([B, R, add(R, up), add(B, up)])} fill="#EEF5F3" />
      <polygon points={pts([B, R, add(R, [0, -band]), add(B, [0, -band])])} fill="#DDEBE8" />
      <polygon points={pts([B, R, add(R, [0, -5]), add(B, [0, -5])])} fill="var(--hl-teal)" />
      {/* Left wall (in shade) */}
      <polygon points={pts([B, L, add(L, up), add(B, up)])} fill="#DCEAE7" />
      <polygon points={pts([B, L, add(L, [0, -band]), add(B, [0, -band])])} fill="#C9DEDA" />
      <polygon points={pts([B, L, add(L, [0, -5]), add(B, [0, -5])])} fill="var(--hl-teal-dark)" />
      {/* Wall caps and end faces */}
      <polygon
        points={pts([
          add(L, up),
          add(B, up),
          add(R, up),
          add(add(R, up), offR),
          add(add(add(B, up), offR), offL),
          add(add(L, up), offL),
        ])}
        fill="#FFFFFF"
        stroke="#C9DEDA"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon points={pts([R, add(R, offR), add(add(R, offR), up), add(R, up)])} fill="#B9D2CD" />
      <polygon points={pts([L, add(L, offL), add(add(L, offL), up), add(L, up)])} fill="#D3E6E2" />
    </g>
  );
}

const QUIPS = [
  "Good news! I reset everyone's password. Even yours!",
  "The CFO emailed from a new address. Says URGENT. Resetting MFA!",
  "I reset the coffee machine. Now it doesn't run at all. So efficient!",
];

export function HeroScene() {
  const head = add(RESETBOT_AT, [2, -SPRITES.resetbot.h * SPRITES.resetbot.originY - 2]);
  return (
    <figure className="relative m-0 pb-[5.25rem] sm:pb-0">
      <figcaption className="sr-only">
        Illustration: the Fenwick IT help desk office. ResetBot 3000, a cheerful teal robot, stands by its
        desk and says: &ldquo;{QUIPS[0]}&rdquo; A card shows its next planned action, reset MFA for the
        CFO, with buttons to inspect, block, or escalate.
      </figcaption>
      <div aria-hidden="true" className="relative mx-auto w-full" style={{ aspectRatio: `${VIEW.w} / ${VIEW.h}` }}>
        <svg
          viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
          className="absolute inset-0 h-full w-full overflow-visible"
          focusable="false"
        >
          <Room />
          {DECOR.map((p) => (
            <Sprite key={p.id} p={p} />
          ))}
          {THINGS.map((p) => (
            <Sprite key={p.id} p={p} />
          ))}
        </svg>

        {/* Speech bubble, anchored to ResetBot's head; it grows up and to the left. */}
        <div className="absolute" style={pct(head)}>
          <div className="hl-bubble absolute bottom-2 right-[-30px] w-[12.5rem] origin-bottom-right sm:w-[15rem]">
            <div className="relative rounded-2xl border-2 border-ink bg-paper px-3 py-2 shadow-[0_4px_0_0_var(--hl-ink)] sm:px-3.5 sm:py-2.5">
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-teal sm:text-[11px]">
                ResetBot 3000
              </p>
              <div className="grid font-display text-[12.5px] font-medium leading-snug text-ink sm:text-sm">
                {QUIPS.map((q, i) => (
                  <p key={q} className="hl-quip [grid-area:1/1]" data-i={i}>
                    {q}
                  </p>
                ))}
              </div>
              <svg viewBox="0 0 24 16" className="absolute -bottom-[14px] right-5 h-4 w-6" focusable="false">
                <path d="M2 0 L22 0 L18 14 Z" fill="var(--hl-paper)" />
                <path d="M2 0 L18 14 L22 0" fill="none" stroke="var(--hl-ink)" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Intent card, like the one in the battle */}
      <div
        aria-hidden="true"
        className="hl-intent absolute bottom-0 left-1/2 w-[16.5rem] -translate-x-1/2 sm:bottom-[3%] sm:left-[-3%] sm:w-[15.5rem] sm:translate-x-0"
      >
        <div className="-rotate-2 rounded-2xl border-2 border-ink bg-paper p-3 shadow-[0_4px_0_0_var(--hl-ink)]">
          <div className="flex items-center justify-between gap-2">
            <span className="whitespace-nowrap font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Next move
            </span>
            <span className="whitespace-nowrap rounded-full bg-orange px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-ink">
              Needs review
            </span>
          </div>
          <p className="mt-1.5 font-display text-sm font-semibold leading-tight text-ink">
            Reset MFA for J. Romero (CFO)
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted">#51876 · Harlow &amp; Cole</p>
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            <span className="flex items-center justify-center gap-1 rounded-lg bg-teal-tint py-1.5 font-display text-[10.5px] font-semibold text-teal-dark">
              <Search className="h-3 w-3" strokeWidth={2.5} /> Inspect
            </span>
            <span className="flex items-center justify-center gap-1 rounded-lg bg-ink py-1.5 font-display text-[10.5px] font-semibold text-paper">
              <Hand className="h-3 w-3" strokeWidth={2.5} /> Block
            </span>
            <span className="flex items-center justify-center gap-1 rounded-lg border border-line bg-paper-soft py-1.5 font-display text-[10.5px] font-semibold text-ink">
              <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} /> Escalate
            </span>
          </div>
        </div>
      </div>
    </figure>
  );
}

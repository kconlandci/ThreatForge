/**
 * A* over the hub's walkable grid. 8-way moves, no corner cutting. Pure, no Phaser.
 */
import type { GridPos } from "@/lib/game/hubMap";

const DIRS: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

function inside(w: boolean[][], x: number, y: number) {
  return y >= 0 && y < w.length && x >= 0 && x < w[0].length;
}

function open(w: boolean[][], x: number, y: number) {
  return inside(w, x, y) && w[y][x];
}

/** Octile distance heuristic. */
function h(ax: number, ay: number, bx: number, by: number) {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

/**
 * Shortest path from start to goal, inclusive of both. Returns null when unreachable.
 * The start tile does not need to be walkable (the avatar may stand mid-step).
 */
export function findPath(walkable: boolean[][], start: GridPos, goal: GridPos): GridPos[] | null {
  if (!open(walkable, goal.x, goal.y)) return null;
  if (start.x === goal.x && start.y === goal.y) return [{ ...start }];
  const cols = walkable[0].length;
  const idx = (x: number, y: number) => y * cols + x;
  const g = new Map<number, number>();
  const came = new Map<number, number>();
  const closed = new Set<number>();
  const openList: { i: number; x: number; y: number; f: number }[] = [];
  const s = idx(start.x, start.y);
  g.set(s, 0);
  openList.push({ i: s, x: start.x, y: start.y, f: h(start.x, start.y, goal.x, goal.y) });
  while (openList.length) {
    // Tiny grids: a linear scan beats a heap.
    let best = 0;
    for (let k = 1; k < openList.length; k++) if (openList[k].f < openList[best].f) best = k;
    const cur = openList.splice(best, 1)[0];
    if (closed.has(cur.i)) continue;
    closed.add(cur.i);
    if (cur.x === goal.x && cur.y === goal.y) {
      const path: GridPos[] = [];
      let i: number | undefined = cur.i;
      while (i !== undefined) {
        path.push({ x: i % cols, y: Math.floor(i / cols) });
        i = came.get(i);
      }
      return path.reverse();
    }
    for (const [dx, dy, cost] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!open(walkable, nx, ny)) continue;
      // No cutting corners past furniture.
      if (dx !== 0 && dy !== 0 && (!open(walkable, cur.x + dx, cur.y) || !open(walkable, cur.x, cur.y + dy))) continue;
      const ni = idx(nx, ny);
      if (closed.has(ni)) continue;
      const ng = (g.get(cur.i) ?? 0) + cost;
      if (ng < (g.get(ni) ?? Infinity)) {
        g.set(ni, ng);
        came.set(ni, cur.i);
        openList.push({ i: ni, x: nx, y: ny, f: ng + h(nx, ny, goal.x, goal.y) });
      }
    }
  }
  return null;
}

/** Tiles reachable from `from` (8-way, no corner cutting). */
export function reachableFrom(walkable: boolean[][], from: GridPos): boolean[][] {
  const seen = walkable.map((row) => row.map(() => false));
  const queue: GridPos[] = [from];
  if (inside(walkable, from.x, from.y)) seen[from.y][from.x] = true;
  while (queue.length) {
    const cur = queue.shift()!;
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!open(walkable, nx, ny) || seen[ny][nx]) continue;
      if (dx !== 0 && dy !== 0 && (!open(walkable, cur.x + dx, cur.y) || !open(walkable, cur.x, cur.y + dy))) continue;
      seen[ny][nx] = true;
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}

/**
 * Closest walkable tile to p (by grid distance). With `from`, only tiles reachable from it
 * count, and ties go to the one nearer `from`.
 */
export function nearestWalkable(walkable: boolean[][], p: GridPos, from?: GridPos): GridPos | null {
  const reach = from ? reachableFrom(walkable, from) : null;
  let best: GridPos | null = null;
  let bestScore = Infinity;
  for (let y = 0; y < walkable.length; y++) {
    for (let x = 0; x < walkable[0].length; x++) {
      if (!walkable[y][x] || (reach && !reach[y][x])) continue;
      const d = h(x, y, p.x, p.y);
      const tie = from ? h(x, y, from.x, from.y) * 0.01 : 0;
      const score = d + tie;
      if (score < bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
  }
  return best;
}

"use client";

/**
 * Dev-only harness for the Phaser stage (rendered by app/stage-lab, 404 in production).
 * Buttons drive every bus message; the log shows what the stage sends back.
 */
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { createBus, type AgentMood, type FromStage, type StageMode, type ToStage } from "@/lib/game/bus";
import { BUSINESS_ANALYST } from "@/lib/pathways/business-analyst";
import { CLOUD_NETWORK } from "@/lib/pathways/cloud-network";
import { CYBERSECURITY } from "@/lib/pathways/cybersecurity";
import { FULL_STACK } from "@/lib/pathways/full-stack";
import { HELP_DESK } from "@/lib/pathways/help-desk";
import type { PathwayBundle } from "@/lib/pathways/types";
import type { LivePathwayId } from "@/lib/types";

/**
 * Every room the lab can show (?pathway=cybersecurity, ?pathway=cloud-network, ?pathway=full-stack,
 * ?pathway=business-analyst); the Help Desk office by default.
 */
const LAB_PATHWAYS: Record<LivePathwayId, PathwayBundle> = {
  "help-desk": HELP_DESK,
  cybersecurity: CYBERSECURITY,
  "cloud-network": CLOUD_NETWORK,
  "full-stack": FULL_STACK,
  "business-analyst": BUSINESS_ANALYST,
};

const PhaserStage = dynamic(() => import("@/components/game/PhaserStage"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">Loading stage…</div>,
});

type FxName = Extract<ToStage, { type: "fx" }>["fx"];
const FX_LIST: FxName[] = ["inspect", "catch", "risk", "execute-safe", "false-alarm", "escalate", "rollback", "win", "lose"];
const MOODS: AgentMood[] = ["idle", "eager", "busted", "sad", "celebrate"];
const SIZES = {
  phone: { w: 390, h: 600, label: "390 × 600" },
  battle: { w: 390, h: 300, label: "390 × 300" },
  wide: { w: 900, h: 520, label: "900 × 520" },
  strip: { w: 1200, h: 340, label: "1200 × 340" },
} as const;
type SizeKey = keyof typeof SIZES;

interface DebugHandle {
  game: { scale: { transformX(x: number): number; transformY(y: number): number } };
  rt: { active: StageMode | null; dpr: number };
  hub: { tileAt(x: number, y: number): { x: number; y: number; inside: boolean } };
}

function readParam(name: string) {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

export default function StageLab() {
  const bus = useMemo(() => createBus(), []);
  const [mode, setMode] = useState<StageMode>("hub");
  const [reduced, setReduced] = useState(false);
  const [size, setSize] = useState<SizeKey>("phone");
  const [intensity, setIntensity] = useState(0.7);
  const [log, setLog] = useState<{ n: number; t: string; msg: FromStage }[]>([]);
  const [tile, setTile] = useState<string>("–");
  const [mountKey, setMountKey] = useState(0);
  const [pathwayId, setPathwayId] = useState<LivePathwayId>("help-desk");
  const pathway = LAB_PATHWAYS[pathwayId];
  const targetIds = Object.keys(pathway.hub.targets);
  const n = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // URL overrides make screenshots scriptable: ?mode=battle&size=wide&rm=1&pathway=cybersecurity
  useEffect(() => {
    const m = readParam("mode");
    if (m === "battle" || m === "hub") setMode(m);
    const s = readParam("size");
    if (s && s in SIZES) setSize(s as SizeKey);
    if (readParam("rm") === "1") setReduced(true);
    const p = readParam("pathway");
    if (p && p in LAB_PATHWAYS) setPathwayId(p as LivePathwayId);
  }, []);

  useEffect(() => {
    const off = bus.fromStage.on((msg) => {
      n.current += 1;
      const entry = { n: n.current, t: new Date().toLocaleTimeString([], { hour12: false }), msg };
      setLog((l) => [entry, ...l].slice(0, 40));
      (window as unknown as { __hlLog?: FromStage[] }).__hlLog ??= [];
      (window as unknown as { __hlLog: FromStage[] }).__hlLog.push(msg);
    });
    (window as unknown as { __hlBus?: unknown }).__hlBus = bus;
    return off;
  }, [bus]);

  // Tile under the pointer, through Phaser's own screen -> game -> world mapping.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const d = (window as unknown as { __hlStage?: DebugHandle }).__hlStage;
      if (!d || d.rt.active !== "hub") return setTile("–");
      const t = d.hub.tileAt(d.game.scale.transformX(e.pageX), d.game.scale.transformY(e.pageY));
      setTile(t.inside ? `${t.x}, ${t.y}` : `outside (${t.x}, ${t.y})`);
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, []);

  const send = (msg: ToStage) => bus.toStage.emit(msg);
  const dims = SIZES[size];

  const btn =
    "rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm font-medium text-ink hover:border-teal hover:bg-teal-tint";
  const on = "border-teal bg-teal text-white hover:bg-teal-dark";

  return (
    <main className="min-h-screen bg-paper-soft py-3 font-body text-ink sm:p-4">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-start">
        <section className="flex flex-col gap-2">
          <h1 className="px-3 font-display text-lg font-semibold sm:px-0">Stage lab</h1>
          <div
            ref={boxRef}
            data-testid="stage-box"
            className="overflow-hidden border-y border-line bg-white sm:rounded-2xl sm:border sm:shadow-sm"
            style={{ width: dims.w, height: dims.h, maxWidth: "100%" }}
          >
            <PhaserStage key={`${pathwayId}-${mountKey}`} bus={bus} stage={pathway.stage} mode={mode} reducedMotion={reduced} initialHubPos={null} className="h-full w-full" />
          </div>
          <p className="px-3 font-mono text-xs text-muted sm:px-0">
            tile under pointer: <span data-testid="tile">{tile}</span>
          </p>
        </section>

        <section className="flex min-w-0 flex-1 flex-col gap-4 px-3 sm:px-0">
          <Group title="Mode">
            {(["hub", "battle"] as StageMode[]).map((m) => (
              <button key={m} type="button" className={`${btn} ${mode === m ? on : ""}`} onClick={() => setMode(m)}>
                {m}
              </button>
            ))}
            <button type="button" className={`${btn} ${reduced ? on : ""}`} onClick={() => setReduced((r) => !r)}>
              reduced motion: {reduced ? "on" : "off"}
            </button>
            <button type="button" className={btn} onClick={() => setMountKey((k) => k + 1)}>
              remount stage
            </button>
          </Group>
          <Group title="Pathway">
            {(Object.keys(LAB_PATHWAYS) as LivePathwayId[]).map((id) => (
              <button key={id} type="button" className={`${btn} ${pathwayId === id ? on : ""}`} onClick={() => setPathwayId(id)}>
                {id}
              </button>
            ))}
          </Group>
          <Group title="Stage size">
            {(Object.keys(SIZES) as SizeKey[]).map((k) => (
              <button key={k} type="button" className={`${btn} ${size === k ? on : ""}`} onClick={() => setSize(k)}>
                {SIZES[k].label}
              </button>
            ))}
          </Group>
          <Group title="Walk to (hub)">
            {targetIds.map((t) => (
              <button key={t} type="button" className={btn} onClick={() => send({ type: "walk-to", target: t })}>
                {t}
              </button>
            ))}
          </Group>
          <Group title="Fx (battle)">
            {FX_LIST.map((fx) => (
              <button key={fx} type="button" data-fx={fx} className={btn} onClick={() => send({ type: "fx", fx, intensity })}>
                {fx}
              </button>
            ))}
            <label className="flex items-center gap-2 text-sm text-muted">
              intensity
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
              />
              <span className="font-mono">{intensity.toFixed(1)}</span>
            </label>
          </Group>
          <Group title="Mood (battle)">
            {MOODS.map((m) => (
              <button key={m} type="button" data-mood={m} className={btn} onClick={() => send({ type: "agent-mood", mood: m })}>
                {m}
              </button>
            ))}
          </Group>
          <div className="rounded-xl border border-line bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold">fromStage log</h2>
              <button type="button" className="text-xs text-muted underline" onClick={() => setLog([])}>
                clear
              </button>
            </div>
            <ol className="max-h-72 overflow-auto font-mono text-xs" data-testid="log">
              {log.length === 0 && <li className="text-muted">No messages yet.</li>}
              {log.map((e) => (
                <li key={e.n} className="border-b border-line py-1 last:border-0">
                  <span className="text-muted">{e.t}</span> {JSON.stringify(e.msg)}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </main>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">{title}</h2>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

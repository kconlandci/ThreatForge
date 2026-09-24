/**
 * Creates the Phaser game for one PhaserStage mount and wires it to the bus.
 * Only ever loaded with a dynamic import() from PhaserStage's effect, so the server never
 * evaluates Phaser.
 */
import * as Phaser from "phaser";
import type { StageBus, StageMode, ToStage } from "@/lib/game/bus";
import type { GridPos } from "@/lib/game/hubMap";
import { BattleScene } from "./BattleScene";
import { BootScene } from "./BootScene";
import { HubScene } from "./HubScene";
import { pickDpr, readFonts, type StageHandle, type StageRuntime } from "./runtime";
import type { StageScene } from "./StageScene";

export interface CreateStageOptions {
  parent: HTMLElement;
  bus: StageBus;
  mode: StageMode;
  reducedMotion: boolean;
  initialHubPos: GridPos | null;
  cssW: number;
  cssH: number;
}

export interface StageDebug {
  game: Phaser.Game;
  rt: StageRuntime;
  hub: HubScene;
  battle: BattleScene;
}

export function createStage(opts: CreateStageOptions): StageHandle & { debug: StageDebug } {
  const cssW = Math.max(1, Math.round(opts.cssW));
  const cssH = Math.max(1, Math.round(opts.cssH));
  const dpr = pickDpr(cssW, cssH);

  const rt: StageRuntime = {
    bus: opts.bus,
    dpr,
    cssW,
    cssH,
    mode: opts.mode,
    active: null,
    switching: false,
    reducedMotion: opts.reducedMotion,
    hubPos: opts.initialHubPos ? { ...opts.initialHubPos } : null,
    pendingWalk: null,
    mood: "idle",
    fonts: readFonts(),
    readySent: false,
    dead: false,
    art: {},
    artPending: null,
    fxRes: 3,
    emit: (msg) => opts.bus.fromStage.emit(msg),
    sceneReady: (mode) => {
      rt.active = mode;
      rt.switching = false;
      if (!rt.readySent) {
        rt.readySent = true;
        rt.emit({ type: "ready" });
      }
      if (mode === "hub" && rt.pendingWalk) {
        const t = rt.pendingWalk;
        rt.pendingWalk = null;
        hub.externalWalk(t);
      }
      if (rt.mode !== mode) switchScene();
    },
  };

  const boot = new BootScene(rt);
  const hub = new HubScene(rt);
  const battle = new BattleScene(rt);
  const sceneFor = (m: StageMode): StageScene => (m === "hub" ? hub : battle);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: opts.parent,
    width: Math.round(cssW * dpr),
    height: Math.round(cssH * dpr),
    transparent: true,
    banner: false,
    autoFocus: false,
    disableContextMenu: false,
    audio: { noAudio: true },
    // Raw frame deltas: Phaser's smoothing caps delta at 16.7ms after boot, which makes
    // walking run in slow motion on devices that only manage 30fps.
    fps: { smoothStep: false },
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr },
    render: {
      antialias: true,
      powerPreference: "default",
      // One texture per batch everywhere (Phaser already does this on iOS/Android). Multi-texture
      // batches sampled the wrong texture in parts of sprites during fx on some GL stacks; the
      // stage only has ~30 sprites, so the extra draw calls are cheap.
      maxTextures: 1,
    },
    input: {
      keyboard: false,
      gamepad: false,
      mouse: { preventDefaultWheel: false, preventDefaultMove: false },
      touch: { capture: true },
      activePointers: 1,
    },
    scene: [boot, hub, battle],
  });

  function switchScene() {
    if (rt.switching || rt.active === null || rt.active === rt.mode) return;
    rt.switching = true;
    const from = sceneFor(rt.active);
    from.fadeOut(() => {
      if (rt.mode === from.scene.key) {
        // Toggled back before the fade finished: just fade back in.
        rt.switching = false;
        from.fadeIn();
        return;
      }
      rt.active = null;
      // The other mode's art may still be rasterizing (it loads after boot): wait for it.
      const go = () => {
        if (!rt.dead) from.scene.start(rt.mode);
      };
      if (rt.artPending) rt.artPending.then(go, go);
      else go();
    });
  }

  // Phaser caches the canvas position; refresh it right before each press so taps map correctly
  // even after the page layout shifted around the stage.
  const onPressCapture = () => {
    if (game.isBooted) game.scale.updateBounds();
  };
  opts.parent.addEventListener("pointerdown", onPressCapture, true);
  opts.parent.addEventListener("touchstart", onPressCapture, { capture: true, passive: true });
  opts.parent.addEventListener("mousedown", onPressCapture, true);

  const onMsg = (msg: ToStage) => {
    switch (msg.type) {
      case "mode":
        handle.setMode(msg.mode);
        break;
      case "reduced-motion":
        handle.setReducedMotion(msg.value);
        break;
      case "walk-to":
        if (rt.active === "hub" && !rt.switching) hub.externalWalk(msg.target);
        else rt.pendingWalk = msg.target;
        break;
      case "agent-mood":
        rt.mood = msg.mood;
        if (rt.active === "battle" && !rt.switching) battle.setMood(msg.mood);
        break;
      case "fx":
        if (rt.active === "battle" && !rt.switching) battle.playFx(msg.fx, msg.intensity);
        break;
    }
  };
  const off = opts.bus.toStage.on(onMsg);

  let destroyed = false;
  let resizeQueued = false;
  function applySize(ndpr: number) {
    if (destroyed) return;
    if (Math.abs(ndpr - rt.dpr) >= 0.01) {
      rt.dpr = ndpr;
      game.scale.setZoom(1 / ndpr);
    }
    // Emits RESIZE, which the active scene listens to and refits its camera.
    game.scale.resize(Math.round(rt.cssW * rt.dpr), Math.round(rt.cssH * rt.dpr));
  }

  const handle = {
    setMode(mode: StageMode) {
      if (rt.mode === mode) return;
      rt.mode = mode;
      if (mode !== "hub") rt.pendingWalk = null;
      switchScene();
    },
    setReducedMotion(value: boolean) {
      if (rt.reducedMotion === value) return;
      rt.reducedMotion = value;
      if (rt.active) sceneFor(rt.active).onReducedMotion();
    },
    resize(w: number, h: number) {
      if (destroyed) return;
      const nw = Math.max(1, Math.round(w));
      const nh = Math.max(1, Math.round(h));
      const ndpr = pickDpr(nw, nh);
      if (nw === rt.cssW && nh === rt.cssH && Math.abs(ndpr - rt.dpr) < 0.01) return;
      rt.cssW = nw;
      rt.cssH = nh;
      if (!game.isBooted) {
        // Boot reads rt.cssW/H; apply the canvas size once Phaser is up.
        if (!resizeQueued) {
          resizeQueued = true;
          game.events.once(Phaser.Core.Events.READY, () => {
            resizeQueued = false;
            applySize(pickDpr(rt.cssW, rt.cssH));
          });
        }
        return;
      }
      applySize(ndpr);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      rt.dead = true;
      off();
      opts.parent.removeEventListener("pointerdown", onPressCapture, true);
      opts.parent.removeEventListener("touchstart", onPressCapture, true);
      opts.parent.removeEventListener("mousedown", onPressCapture, true);
      // Phaser does not release its WebGL context; browsers cap live contexts (~16), so free it
      // once teardown has finished to keep repeated mounts from evicting other canvases.
      const gl = game.renderer && "gl" in game.renderer ? (game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl : null;
      if (gl) {
        game.events.once(Phaser.Core.Events.DESTROY, () => {
          setTimeout(() => gl.getExtension("WEBGL_lose_context")?.loseContext(), 0);
        });
      }
      game.destroy(true);
    },
    debug: { game, rt, hub, battle },
  };
  return handle;
}

/**
 * Sound effects for stage moments (the FxMessage in lib/game/bus.ts): off unless the player turns
 * them on (classrooms and libraries). The choice is per device (localStorage), not in the cloud
 * save, like music. Every sound is made in code with Web Audio: a few short, soft sine or triangle
 * notes, no audio files. sfxRecipe() says which notes (pure data, unit tested); playSfx() plays them.
 * Browsers only allow sound after a tap or key press, so unlockSfx() must run from one.
 */
import { fxTag, type FxMessage, type VignetteFamily } from "@/lib/game/bus";

const KEY = "human-loop:sfx";
/** Loudness of all effects together. Each note's own gain (at most 0.5) sits under this. */
const VOLUME = 0.18;
/** The same effect twice within this many ms plays once (a double tap, a repeated message). */
const REPEAT_MS = 120;
/** Each note fades in this fast (seconds): quick, but no click. */
const ATTACK = 0.008;
/** Schedule a hair ahead of "now", so the first note is never cut. */
const LEAD = 0.01;

/** One note of an effect. Times are seconds from when the effect starts. */
export interface SfxNote {
  /** Hz. */
  freq: number;
  at: number;
  /** Attack to silence. */
  dur: number;
  type: OscillatorType;
  /** Peak level (0..0.5), before the master volume. */
  gain: number;
  /** Hz: glide to this pitch by the end of the note (a chirp or a sweep). */
  slideTo?: number;
}

export interface SfxRecipe {
  /** Like the stage's fxTag: "catch", "risk:leak", "win:clean". */
  name: string;
  notes: SfxNote[];
}

/** The choice made in this page, if any. It wins over storage (which private mode may block). */
let chosen: boolean | null = null;

export function sfxPref(): boolean {
  if (chosen !== null) return chosen;
  try {
    return window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function setSfxPref(on: boolean): void {
  chosen = on;
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* private mode: the choice lasts until the page closes */
  }
  // Off: let the audio hardware rest. unlockSfx() wakes it from the next tap after it is turned on.
  if (!on) void ctx?.suspend().catch(() => {});
}

/* ------------------------------------------------------------------ */
/* Recipes: which notes each effect plays (no Web Audio here).          */

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function note(type: OscillatorType, freq: number, at: number, dur: number, gain: number, slideTo?: number): SfxNote {
  return slideTo === undefined ? { freq, at, dur, type, gain } : { freq, at, dur, type, gain, slideTo };
}

/** A low knock: a sine body plus a soft triangle an octave up, so phone speakers (weak in the lows) still play it. */
function thud(freq: number, at: number, dur: number, gain: number, slideTo?: number): SfxNote[] {
  return [
    note("sine", freq, at, dur, gain, slideTo),
    note("triangle", freq * 2, at, dur * 0.7, gain * 0.35, slideTo === undefined ? undefined : slideTo * 2),
  ];
}

/** A risky plan ran: a low, muted sound, a little different for each outcome vignette. */
function riskNotes(vignette: VignetteFamily | undefined): SfxNote[] {
  switch (vignette) {
    case "leak":
      // A little higher, with a flutter: four quick pulses drifting down.
      return [190, 176, 184, 166].flatMap((f, i) => thud(f, i * 0.065, 0.08, 0.32 - i * 0.04, f * 0.92));
    case "report":
      // A dull double knock.
      return [...thud(140, 0, 0.11, 0.38, 105), ...thud(132, 0.15, 0.12, 0.32, 100)];
    case "system":
      // A low wobble: two close pitches beat against each other as they sink.
      return [...thud(124, 0, 0.45, 0.24, 100), ...thud(130, 0, 0.45, 0.24, 106)];
    default:
      // No vignette (the old generic effect): one muted thud.
      return thud(150, 0, 0.25, 0.4, 100);
  }
}

function notesFor(msg: FxMessage): SfxNote[] | null {
  switch (msg.fx) {
    case "inspect":
      // A soft page flick: a quick upward chirp with a faint tick on top.
      return [note("triangle", 600, 0, 0.08, 0.2, 900), note("sine", 1800, 0.025, 0.05, 0.05)];
    case "catch":
      // "Gotcha": E5 then B5, bright but round, with a faint shimmer an octave up.
      return [
        note("triangle", midi(76), 0, 0.12, 0.26),
        note("triangle", midi(83), 0.09, 0.28, 0.28),
        note("sine", midi(95), 0.09, 0.18, 0.05),
      ];
    case "risk":
      return riskNotes(msg.vignette);
    case "execute-safe":
      // One gentle ding (A5), with a faint overtone for a bell edge.
      return [note("sine", midi(81), 0, 0.4, 0.24), note("sine", midi(93), 0, 0.15, 0.04)];
    case "false-alarm":
      // A soft "uh-oh": two notes stepping down, the second a little longer. Not a buzzer.
      return [note("triangle", midi(70), 0, 0.15, 0.22), note("triangle", midi(67), 0.17, 0.3, 0.22)];
    case "escalate":
      // Handing it up: a light rising C-E-G.
      return [
        note("sine", midi(72), 0, 0.16, 0.22),
        note("sine", midi(76), 0.08, 0.16, 0.22),
        note("sine", midi(79), 0.16, 0.3, 0.24),
      ];
    case "rollback":
      // Rewind: three quick chirps sweeping down, then a soft landing.
      return [
        note("triangle", 880, 0, 0.09, 0.18, 700),
        note("triangle", 700, 0.075, 0.09, 0.18, 520),
        note("triangle", 520, 0.15, 0.09, 0.18, 380),
        note("sine", 330, 0.23, 0.16, 0.14),
      ];
    case "win": {
      // A short major fanfare, C-E-G-C, the last note held over a soft chord.
      const notes = [
        note("triangle", midi(72), 0, 0.16, 0.22),
        note("triangle", midi(76), 0.11, 0.16, 0.22),
        note("triangle", midi(79), 0.22, 0.16, 0.22),
        note("triangle", midi(84), 0.33, 0.75, 0.26),
        note("sine", midi(64), 0.33, 0.7, 0.1),
        note("sine", midi(67), 0.33, 0.7, 0.1),
      ];
      // A clean shift (no risky plan got through): a sparkle on top.
      if (msg.clean === true) notes.push(note("sine", midi(96), 0.42, 0.3, 0.07), note("sine", midi(103), 0.5, 0.35, 0.05));
      return notes;
    }
    case "lose":
      // Three soft notes down to rest, C5-A4-F4. Kind, not a "wah-wah".
      return [
        note("triangle", midi(72), 0, 0.3, 0.2),
        note("triangle", midi(69), 0.24, 0.3, 0.19),
        note("triangle", midi(65), 0.48, 0.7, 0.19),
      ];
    default:
      return null;
  }
}

/** intensity 0..1 nudges the level from 0.8x to 1.1x. Missing (or not a number) means 1x. */
function loudness(intensity: number | undefined): number {
  if (typeof intensity !== "number" || !Number.isFinite(intensity)) return 1;
  return 0.8 + 0.3 * Math.min(1, Math.max(0, intensity));
}

/** The notes for a stage message. Pure: no Web Audio, same message, same notes. */
export function sfxRecipe(msg: FxMessage): SfxRecipe | null {
  const notes = notesFor(msg);
  if (!notes || notes.length === 0) return null;
  const k = loudness(msg.intensity);
  return { name: fxTag(msg) ?? msg.fx, notes: notes.map((n) => ({ ...n, gain: n.gain * k })) };
}

/* ------------------------------------------------------------------ */
/* Playing: one shared AudioContext, made on the first tap with effects on. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
/** When each effect last played (Date.now() ms), for REPEAT_MS. */
const lastPlayed = new Map<string, number>();

/** The shared context, made once and woken. null on the server, without Web Audio, or while effects are off. */
function wake(): AudioContext | null {
  if (typeof window === "undefined" || !sfxPref()) return null;
  if (ctx?.state === "closed") {
    ctx = null;
    master = null;
  }
  let c = ctx;
  if (!c) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    c = new Ctx();
    const m = c.createGain();
    m.gain.value = VOLUME;
    m.connect(c.destination);
    ctx = c;
    master = m;
  }
  if (c.state !== "running") void c.resume().catch(() => {});
  return c;
}

function render(c: AudioContext, out: AudioNode, recipe: SfxRecipe) {
  const t0 = c.currentTime + LEAD;
  for (const n of recipe.notes) {
    const at = t0 + n.at;
    const end = at + n.dur;
    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = n.type;
    osc.frequency.setValueAtTime(n.freq, at);
    if (n.slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(n.slideTo, end);
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(n.gain, at + Math.min(ATTACK, n.dur / 4));
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(env).connect(out);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };
    osc.start(at);
    osc.stop(end + 0.02);
  }
}

/**
 * Make or wake the shared AudioContext. Call from a tap or key press (click, pointerup, keydown:
 * not pointerdown, which does not count as a tap on phones). Cheap and safe to call on every one.
 * Does nothing while effects are off, so turning them on is setSfxPref(true), then this.
 */
export function unlockSfx(): void {
  try {
    wake();
  } catch {
    /* no sound is fine */
  }
}

/** Play the effect for a stage message: only with effects on, the context awake and the page visible. Never throws. */
export function playSfx(msg: FxMessage): void {
  try {
    const c = ctx;
    const out = master;
    if (!c || !out || c.state !== "running" || !sfxPref()) return;
    if (typeof document === "undefined" || document.visibilityState !== "visible") return;
    const now = Date.now();
    const last = lastPlayed.get(msg.fx);
    // (now >= last: a clock set back must not mute the effect.)
    if (last !== undefined && now >= last && now - last < REPEAT_MS) return;
    const recipe = sfxRecipe(msg);
    if (!recipe) return;
    lastPlayed.set(msg.fx, now);
    render(c, out, recipe);
  } catch {
    /* a missing sound must never break the game */
  }
}

/** The settings preview (the "execute-safe" ding). Call from the tap that turns effects on, after setSfxPref(true). */
export function playTestBeep(): void {
  try {
    const c = wake();
    const recipe = sfxRecipe({ type: "fx", fx: "execute-safe" });
    if (!c || !recipe) return;
    const play = () => {
      try {
        if (c.state === "running" && master && sfxPref()) render(c, master, recipe);
      } catch {
        /* no sound is fine */
      }
    };
    // A context made in this tap may still be starting: play once it runs.
    if (c.state === "running") play();
    else void c.resume().then(play, () => {});
  } catch {
    /* no sound is fine */
  }
}

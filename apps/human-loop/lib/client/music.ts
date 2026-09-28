/**
 * Background music: off unless the player turns it on (classrooms and libraries). The choice is
 * per device (localStorage), not in the cloud save. The TRACKS playlist (files in public/game/music/)
 * plays in order and repeats; if it can't play, a calm chord loop made in code with Web Audio takes over.
 * Browsers only allow sound after a tap or key press, so start() must run from one.
 */

const KEY = "human-loop:music";
/**
 * The playlist, played in order and repeated. Each track needs a license that allows use in the game:
 * all three songs were made by DCI with Google Gemini (Lyria), which leaves the output to its maker.
 */
const TRACKS: string[] = [
  "/game/music/ten-am-office-shuffle.mp3",
  "/game/music/the-afternoon-deck.mp3",
  "/game/music/coffee-at-ten.mp3",
];
const VOLUME = 0.12;

export function musicPref(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function setMusicPref(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* private mode: the choice lasts until the page closes */
  }
}

/* ------------------------------------------------------------------ */
/* The code-made loop: Cmaj7 - Am7 - Dm7 - G6 at 84 BPM, pad + bass + arpeggio. */

const BPM = 84;
const BEAT = 60 / BPM;
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
// One bar each. Pad notes (octave 3-4), bass root (octave 2), arpeggio notes (octave 5).
const CHORDS = [
  { pad: [60, 64, 67, 71], bass: 36, arp: [72, 76, 79, 83] },
  { pad: [57, 60, 64, 67], bass: 33, arp: [69, 72, 76, 79] },
  { pad: [62, 65, 69, 72], bass: 38, arp: [74, 77, 81, 84] },
  { pad: [55, 59, 62, 64], bass: 31, arp: [67, 71, 74, 76] },
];
// Eighth-note arpeggio pattern (index into arp, -1 = rest), a little uneven so it breathes.
const ARP = [0, 2, 1, 3, 2, -1, 1, 2];

type Synth = { ctx: AudioContext; master: GainNode; timer: number; nextBar: number; bar: number };

let synth: Synth | null = null;
let audio: HTMLAudioElement | null = null;
let wanted = false;
let trackIndex = 0;

function tone(ctx: AudioContext, out: AudioNode, type: OscillatorType, freq: number, at: number, dur: number, peak: number, attack: number) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(peak, at + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

function scheduleBar(s: Synth, pad: AudioNode, arpOut: AudioNode) {
  const c = CHORDS[s.bar % CHORDS.length];
  const t = s.nextBar;
  const bar = BEAT * 4;
  for (const n of c.pad) tone(s.ctx, pad, "triangle", midi(n), t, bar + 0.6, 0.05, 0.8);
  tone(s.ctx, pad, "sine", midi(c.bass), t, BEAT * 1.8, 0.14, 0.02);
  tone(s.ctx, pad, "sine", midi(c.bass), t + BEAT * 2, BEAT * 1.8, 0.1, 0.02);
  ARP.forEach((i, k) => {
    if (i < 0) return;
    tone(s.ctx, arpOut, "sine", midi(c.arp[i]), t + (k * BEAT) / 2, 0.5, 0.035, 0.01);
  });
  s.nextBar += bar;
  s.bar += 1;
}

function startSynth() {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + 2);
  const soft = ctx.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.value = 2400;
  soft.connect(master).connect(ctx.destination);
  // A small echo on the arpeggio gives it some room.
  const delay = ctx.createDelay();
  delay.delayTime.value = BEAT * 0.75;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.25;
  const arpOut = ctx.createGain();
  arpOut.connect(soft);
  arpOut.connect(delay);
  delay.connect(feedback).connect(delay);
  delay.connect(soft);
  const s: Synth = { ctx, master, timer: 0, nextBar: ctx.currentTime + 0.1, bar: 0 };
  // Look ahead: keep the next bar scheduled a little before it plays.
  s.timer = window.setInterval(() => {
    while (s.nextBar < ctx.currentTime + 0.5) scheduleBar(s, soft, arpOut);
  }, 100);
  synth = s;
}

function stopSynth() {
  const s = synth;
  if (!s) return;
  synth = null;
  window.clearInterval(s.timer);
  const now = s.ctx.currentTime;
  s.master.gain.cancelScheduledValues(now);
  s.master.gain.setValueAtTime(s.master.gain.value, now);
  s.master.gain.linearRampToValueAtTime(0, now + 0.4);
  window.setTimeout(() => void s.ctx.close().catch(() => {}), 500);
}

/* ------------------------------------------------------------------ */

function onVisibility() {
  if (!wanted) return;
  if (document.hidden) {
    audio?.pause();
    void synth?.ctx.suspend().catch(() => {});
  } else {
    void audio?.play().catch(() => {});
    void synth?.ctx.resume().catch(() => {});
  }
}

/** Start the music. Call from a tap or key press. Safe to call twice. */
export function startMusic(): void {
  wanted = true;
  if (audio || synth) return;
  document.addEventListener("visibilitychange", onVisibility);
  if (TRACKS.length === 0) {
    startSynth();
    return;
  }
  playTrack(trackIndex);
}

function playTrack(i: number) {
  trackIndex = i % TRACKS.length;
  const a = new Audio(TRACKS[trackIndex]);
  a.loop = TRACKS.length === 1;
  a.volume = 0.35;
  // Next song when this one ends (a one-song list just loops).
  a.addEventListener("ended", () => {
    if (audio === a && wanted) playTrack(trackIndex + 1);
  });
  audio = a;
  // If the track can't play (missing file, blocked), fall back to the code-made loop.
  void a.play().catch(() => {
    if (audio !== a) return;
    audio = null;
    if (wanted && !synth) startSynth();
  });
}

export function stopMusic(): void {
  wanted = false;
  document.removeEventListener("visibilitychange", onVisibility);
  audio?.pause();
  audio = null;
  stopSynth();
}

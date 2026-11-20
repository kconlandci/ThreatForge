/**
 * Read aloud: the browser's own voice (Web Speech API) reads a plan, its evidence or a result out
 * loud, a little slower than normal, for players reading in a second language. Nothing is sent
 * anywhere: the phone or computer makes the sound. The Listen buttons show unless the player turns
 * them off in the Menu (per device), and never where the browser has no voice.
 */

const KEY = "human-loop:read-aloud";
/** Fired on window when the Menu switch changes, so every Listen button updates at once. */
export const READ_ALOUD_EVENT = "human-loop:read-aloud";
const RATE = 0.9;

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";
}

export function readAloudPref(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setReadAloudPref(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* private mode: the choice lasts until the page closes */
  }
  if (!on) stopSpeaking();
  window.dispatchEvent(new Event(READ_ALOUD_EVENT));
}

/** Text as it should be spoken: no bold marks, separators as pauses, one space between parts. */
export function forSpeech(parts: readonly (string | null | undefined | false)[]): string {
  return parts
    .filter((p): p is string => typeof p === "string" && p.trim() !== "")
    .map((p) => p.replace(/\*\*/g, "").replace(/\s*·\s*/g, ", ").trim())
    .map((p) => (/[.!?:]$/.test(p) ? p : `${p}.`))
    .join(" ");
}

/** An English voice, preferring one that runs on the device (no network) and US English. */
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices().filter((v) => /^en(-|_|$)/i.test(v.lang));
  return (
    voices.find((v) => v.localService && /en[-_]US/i.test(v.lang)) ??
    voices.find((v) => v.localService) ??
    voices.find((v) => /en[-_]US/i.test(v.lang)) ??
    voices[0] ??
    null
  );
}

/** Speak `text` (stopping anything already speaking). onEnd runs when it ends or is stopped. */
export function speak(text: string, onEnd?: () => void): boolean {
  if (!canSpeak() || !text.trim()) return false;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new window.SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = RATE;
    const voice = pickVoice();
    if (voice) u.voice = voice;
    if (onEnd) {
      u.onend = onEnd;
      u.onerror = onEnd;
    }
    synth.speak(u);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking(): void {
  try {
    if (canSpeak()) window.speechSynthesis.cancel();
  } catch {
    /* nothing to stop */
  }
}

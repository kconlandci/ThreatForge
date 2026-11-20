import { describe, expect, it } from "vitest";
import { canSpeak, forSpeech, speak } from "./speech";

describe("read aloud", () => {
  it("joins parts as sentences, drops bold marks and empty parts, and reads · as a pause", () => {
    expect(forSpeech(["Reset MFA for J. Romero", null, "", "Ollie says: **Easy!**", "Sender: it-help · 2 days old"])).toBe(
      "Reset MFA for J. Romero. Ollie says: Easy! Sender: it-help, 2 days old.",
    );
    expect(forSpeech([false, undefined])).toBe("");
  });

  it("does nothing where there is no voice (the server, old browsers)", () => {
    expect(canSpeak()).toBe(false);
    expect(speak("Hello")).toBe(false);
  });
});

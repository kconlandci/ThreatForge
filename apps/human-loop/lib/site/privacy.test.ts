import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("privacy notice", () => {
  const src = readFileSync(join(__dirname, "../../app/privacy/page.tsx"), "utf8");

  it("ships no [Placeholder] text", () => {
    // e.g. "[DCI contact email]": a bracketed, capitalised placeholder must never reach users.
    const text = src.replace(/\{[^{}]*\}/g, " ");
    expect(text).not.toMatch(/\[[A-Z][^\]\n]*\]/);
  });

  it("links 'contact us' to a real contact (mailto) or the Contact section", () => {
    expect(src).toContain("mailto:${PRIVACY_EMAIL}");
    expect(src).toContain('id="contact"');
  });
});

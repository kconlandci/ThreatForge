import { describe, expect, it } from "vitest";
import { certificateText, longDay } from "./certificate";

const data = { name: "  Ana Ruiz ", pathway: "Help Desk", skills: ["Check who's asking", "Check the approval"], stars: 2, day: "2026-11-20", site: "humanloop.dciworkforce.com" };

describe("certificate", () => {
  it("writes a long day without a time zone shift", () => {
    expect(longDay("2026-11-20")).toBe("November 20, 2026");
    expect(longDay("2026-01-01")).toBe("January 1, 2026");
    expect(longDay("nope")).toBe("");
  });

  it("says what it is: practice in a training game, with the pathway, skills, stars and day", () => {
    const t = certificateText(data);
    expect(t[0]).toBe("Certificate of practice");
    expect(t).toContain("Ana Ruiz");
    expect(t).toContain("finished the Help Desk shift in Human Loop,");
    expect(t).toContain("Skills practiced: Check who's asking, Check the approval.");
    expect(t).toContain("2 of 3 stars · November 20, 2026");
    expect(t.join(" ")).toMatch(/not a job license or an IT certification/);
    expect(t[1]).toBe("Presented to");
  });

  it("leaves a line for the name when none was typed, and skips an empty skills line", () => {
    const t = certificateText({ ...data, name: " ", skills: [] });
    expect(t).toContain("(your name)");
    expect(t.some((l) => l.startsWith("Skills practiced"))).toBe(false);
  });
});

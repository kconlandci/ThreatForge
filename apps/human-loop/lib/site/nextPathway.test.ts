import { describe, expect, it } from "vitest";
import { safeNextPathway } from "./nextPathway";

describe("safeNextPathway (/play?next=)", () => {
  it("accepts an exact live pathway id", () => {
    expect(safeNextPathway("?next=help-desk")).toBe("help-desk");
    expect(safeNextPathway("next=business-analyst")).toBe("business-analyst");
  });

  it("rejects anything else, so it can never redirect off /play/<id>", () => {
    for (const bad of [
      "?next=https://evil.example",
      "?next=//evil.example",
      "?next=../play",
      "?next=help-desk/../x",
      "?next=help-desk%2F..%2Fx",
      "?next=HELP-DESK",
      "?next= help-desk",
      "?next=",
      "",
      "?other=help-desk",
    ]) {
      expect(safeNextPathway(bad), bad).toBeNull();
    }
  });
});

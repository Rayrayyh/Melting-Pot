import { describe, expect, it } from "vitest";
import { passwordMeetsRules, passwordRules } from "./password-rules";

// These cases mirror the SQL probe run against the live register_student
// after migration 0041: the client list and the server check must agree on
// every one of them.
describe("passwordRules", () => {
  it("accepts a password that meets all four rules", () => {
    expect(passwordMeetsRules("Good pass 1A")).toBe(true);
    expect(passwordMeetsRules("MeltingPot-dev1")).toBe(true);
  });

  it("rejects a password with no uppercase letter", () => {
    expect(passwordMeetsRules("alllowercase1")).toBe(false);
    expect(passwordRules("alllowercase1").find((r) => r.id === "upper")?.met).toBe(false);
  });

  it("rejects a password with no lowercase letter", () => {
    expect(passwordMeetsRules("ALLUPPERCASE1")).toBe(false);
    expect(passwordRules("ALLUPPERCASE1").find((r) => r.id === "lower")?.met).toBe(false);
  });

  it("rejects a password with no number", () => {
    expect(passwordMeetsRules("NoDigitsHere")).toBe(false);
    expect(passwordRules("NoDigitsHere").find((r) => r.id === "digit")?.met).toBe(false);
  });

  it("rejects a short password even when the other rules pass", () => {
    expect(passwordMeetsRules("Short1a")).toBe(false);
    expect(passwordRules("Short1a").find((r) => r.id === "length")?.met).toBe(false);
  });

  it("counts length in code points, the way Postgres char_length does", () => {
    // Eight emoji: sixteen UTF-16 units but eight characters. Length passes;
    // the letter and digit rules still reject it overall.
    const emoji = "😀😀😀😀😀😀😀😀";
    expect(passwordRules(emoji).find((r) => r.id === "length")?.met).toBe(true);
    expect(passwordMeetsRules(emoji)).toBe(false);
  });

  it("keeps the checklist order stable for the UI", () => {
    expect(passwordRules("").map((r) => r.id)).toEqual([
      "length",
      "upper",
      "lower",
      "digit",
    ]);
  });
});

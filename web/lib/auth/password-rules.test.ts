import { describe, expect, it } from "vitest";
import { passwordMeetsRules, passwordRules } from "./password-rules";

// These cases mirror the SQL probes run against the live register_student
// after migrations 0041 and 0042: the client list and the server check must
// agree on every one of them.
describe("passwordRules", () => {
  it("accepts a password that meets all five rules", () => {
    expect(passwordMeetsRules("MeltingPot-dev1")).toBe(true);
    expect(passwordMeetsRules("Melting-pot1")).toBe(true);
    expect(passwordMeetsRules("Sp@ce ok 2Z")).toBe(true);
  });

  it("rejects a password with no uppercase letter", () => {
    expect(passwordMeetsRules("alllowercase-1")).toBe(false);
    expect(passwordRules("alllowercase-1").find((r) => r.id === "upper")?.met).toBe(false);
  });

  it("rejects a password with no lowercase letter", () => {
    expect(passwordMeetsRules("ALLUPPERCASE-1")).toBe(false);
    expect(passwordRules("ALLUPPERCASE-1").find((r) => r.id === "lower")?.met).toBe(false);
  });

  it("rejects a password with no number", () => {
    expect(passwordMeetsRules("NoDigits-Here")).toBe(false);
    expect(passwordRules("NoDigits-Here").find((r) => r.id === "digit")?.met).toBe(false);
  });

  it("rejects a password with no symbol", () => {
    expect(passwordMeetsRules("Meltingpot1")).toBe(false);
    expect(passwordRules("Meltingpot1").find((r) => r.id === "symbol")?.met).toBe(false);
  });

  it("does not count whitespace as a symbol, matching the server class", () => {
    expect(passwordMeetsRules("Good pass 1A")).toBe(false);
    expect(passwordRules("Good pass 1A").find((r) => r.id === "symbol")?.met).toBe(false);
  });

  it("rejects a short password even when the other rules pass", () => {
    expect(passwordMeetsRules("Sh0r-t1")).toBe(false);
    expect(passwordRules("Sh0r-t1").find((r) => r.id === "length")?.met).toBe(false);
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
      "symbol",
    ]);
  });
});

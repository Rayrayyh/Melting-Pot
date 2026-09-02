import { describe, expect, it } from "vitest";
import { spelled, stirLine } from "@/lib/contributions/stir-lines";

const DAYS = Array.from({ length: 60 }, (_, i) => `2026-08-${String((i % 28) + 1).padStart(2, "0")}`);

describe("stirLine", () => {
  it("gives the same day the same line and different days different ones", () => {
    expect(stirLine(5, "2026-08-20")).toEqual(stirLine(5, "2026-08-20"));
    const lines = new Set(DAYS.map((d) => stirLine(5, d).heading));
    expect(lines.size).toBeGreaterThan(3);
  });

  it("has its own pair for the first day and never claims more than one", () => {
    for (const day of DAYS) {
      const line = stirLine(1, day);
      expect(line.heading).not.toMatch(/\bDay 1,|\bOne days\b/);
      expect(`${line.heading} ${line.subline}`).not.toMatch(/\b(two|three|five|seven)\b/i);
    }
  });

  it("names a week, a fortnight and a month rather than leaving them to the pool", () => {
    for (const day of DAYS.slice(0, 10)) {
      expect(stirLine(7, day).heading).toBe("A whole week in the pot.");
      expect(stirLine(14, day).heading).toBe("Two weeks, still stirring.");
      expect(stirLine(30, day).heading).toBe("A month in the pot.");
    }
  });

  it("puts the run in every everyday line, spelled or in figures", () => {
    for (const day of DAYS) {
      for (const days of [2, 5, 9, 12, 40]) {
        if ([7, 14, 30, 50, 100].includes(days)) continue;
        const line = stirLine(days, day);
        const text = `${line.heading} ${line.subline}`;
        const number = String(days);
        const word = spelled(days);
        expect(text.includes(number) || text.toLowerCase().includes(word.toLowerCase())).toBe(true);
      }
    }
  });

  it("keeps the house rules: no emoji, no em dash, no threat, no comparison", () => {
    for (const day of DAYS) {
      for (const days of [1, 2, 7, 14, 30, 50, 100, 8, 23]) {
        const { heading, subline } = stirLine(days, day);
        const text = `${heading} ${subline}`;
        expect(text).not.toMatch(/[—–]/);
        expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
        expect(text).not.toMatch(/lose|lost|don't break|keep it alive|streak|rank|ahead of|behind/i);
        expect(heading.endsWith(".")).toBe(true);
      }
    }
  });

  it("spells the small numbers and leaves the big ones as figures", () => {
    expect(spelled(1)).toBe("One");
    expect(spelled(12)).toBe("Twelve");
    expect(spelled(13)).toBe("13");
    expect(spelled(40)).toBe("40");
  });
});

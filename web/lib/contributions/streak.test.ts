import { describe, expect, it } from "vitest";
import { contributionMilestone, contributionStreak } from "@/lib/contributions/streak";

const TODAY = "2026-08-20";

describe("contributionStreak", () => {
  it("returns nothing for someone who has not shared yet", () => {
    expect(contributionStreak([], TODAY)).toEqual({
      current: 0,
      longest: 0,
      activeToday: false,
    });
  });

  it("counts a single day today", () => {
    expect(contributionStreak(["2026-08-20"], TODAY)).toEqual({
      current: 1,
      longest: 1,
      activeToday: true,
    });
  });

  it("counts several notes on one day once", () => {
    const streak = contributionStreak(
      [
        "2026-08-20T09:14:00Z",
        "2026-08-20T18:02:00Z",
        "2026-08-20T23:59:00Z",
        "2026-08-19T08:00:00Z",
      ],
      TODAY,
    );
    expect(streak).toEqual({ current: 2, longest: 2, activeToday: true });
  });

  it("stops the current run at the first missed day", () => {
    const streak = contributionStreak(
      ["2026-08-20", "2026-08-19", "2026-08-17", "2026-08-16"],
      TODAY,
    );
    expect(streak.current).toBe(2);
    expect(streak.longest).toBe(2);
  });

  it("keeps the run alive when the last day was yesterday", () => {
    const streak = contributionStreak(["2026-08-19", "2026-08-18"], TODAY);
    expect(streak).toEqual({ current: 2, longest: 2, activeToday: false });
  });

  it("ends the run once a whole day has passed with nothing shared", () => {
    const streak = contributionStreak(["2026-08-18", "2026-08-17"], TODAY);
    expect(streak.current).toBe(0);
    expect(streak.longest).toBe(2);
    expect(streak.activeToday).toBe(false);
  });

  it("remembers a longer past run than the one happening now", () => {
    const streak = contributionStreak(
      [
        "2026-08-20",
        "2026-08-01",
        "2026-08-02",
        "2026-08-03",
        "2026-08-04",
        "2026-08-05",
      ],
      TODAY,
    );
    expect(streak.current).toBe(1);
    expect(streak.longest).toBe(5);
  });

  it("counts a run that crosses a month boundary", () => {
    const streak = contributionStreak(
      ["2026-08-01", "2026-07-31", "2026-07-30"],
      "2026-08-01",
    );
    expect(streak.current).toBe(3);
  });

  it("ignores unparseable and future days", () => {
    const streak = contributionStreak(
      ["2026-08-20", "not a date", "2026-02-31", "2026-09-04"],
      TODAY,
    );
    expect(streak).toEqual({ current: 1, longest: 1, activeToday: true });
  });
});

describe("contributionMilestone", () => {
  it("has nothing to show before the first note", () => {
    expect(contributionMilestone(0)).toBeNull();
  });

  it("marks the first note", () => {
    expect(contributionMilestone(1)).toEqual({
      label: "First note shared",
      nextAt: 5,
    });
  });

  it("holds the first marker until the next one is reached", () => {
    expect(contributionMilestone(4)).toEqual({
      label: "First note shared",
      nextAt: 5,
    });
  });

  it("marks five", () => {
    expect(contributionMilestone(5)).toEqual({
      label: "Five notes shared",
      nextAt: 10,
    });
  });

  it("marks ten", () => {
    expect(contributionMilestone(10)).toEqual({
      label: "Ten notes in the vault",
      nextAt: 25,
    });
  });

  it("marks twenty-five", () => {
    expect(contributionMilestone(25)).toEqual({
      label: "Twenty-five notes in the vault",
      nextAt: 50,
    });
  });

  it("marks fifty", () => {
    expect(contributionMilestone(50)).toEqual({
      label: "Fifty notes in the vault",
      nextAt: 100,
    });
  });

  it("marks a hundred, with nothing left to point at", () => {
    expect(contributionMilestone(100)).toEqual({
      label: "A hundred notes in the vault",
      nextAt: null,
    });
  });

  it("keeps the last marker past a hundred", () => {
    expect(contributionMilestone(431)).toEqual({
      label: "A hundred notes in the vault",
      nextAt: null,
    });
  });

  it("ignores a count that is not a whole number or is negative", () => {
    expect(contributionMilestone(4.9)).toEqual({
      label: "First note shared",
      nextAt: 5,
    });
    expect(contributionMilestone(-3)).toBeNull();
  });
});

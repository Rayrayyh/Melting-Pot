import { describe, expect, it } from "vitest";
import {
  contributionMilestone,
  contributionStreak,
  isZone,
  localDate,
  runMarkers,
  weekStrip,
} from "@/lib/contributions/streak";

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

describe("localDate", () => {
  it("keeps the UTC day in UTC", () => {
    expect(localDate("2026-08-20T01:30:00Z", "UTC")).toBe("2026-08-20");
  });

  it("moves a late evening in Los Angeles back onto the day it was lived", () => {
    // 01:30 UTC on the 21st is 6:30 pm on the 20th in Los Angeles in August.
    expect(localDate("2026-08-21T01:30:00Z", "America/Los_Angeles")).toBe("2026-08-20");
  });

  it("follows the zone across daylight saving", () => {
    // 07:30 UTC on 11 January is 11:30 pm on 10 January in Los Angeles,
    // which is an hour further from UTC in winter than in summer.
    expect(localDate("2026-01-11T07:30:00Z", "America/Los_Angeles")).toBe("2026-01-10");
    expect(localDate("2026-07-11T07:30:00Z", "America/Los_Angeles")).toBe("2026-07-11");
  });

  it("moves an early morning in Kolkata forward onto its own day", () => {
    // 20:00 UTC on the 20th is 1:30 am on the 21st in Kolkata.
    expect(localDate("2026-08-20T20:00:00Z", "Asia/Kolkata")).toBe("2026-08-21");
  });

  it("falls back to the UTC day for a zone it does not know", () => {
    expect(localDate("2026-08-21T01:30:00Z", "Mars/Olympus_Mons")).toBe("2026-08-21");
  });

  it("returns an empty string for something that is not a time", () => {
    expect(localDate("soon", "UTC")).toBe("");
  });
});

describe("isZone", () => {
  it("knows a real zone from a made-up one", () => {
    expect(isZone("Europe/London")).toBe(true);
    expect(isZone("UTC")).toBe(true);
    expect(isZone("Nowhere/Special")).toBe(false);
    expect(isZone("")).toBe(false);
  });
});

describe("weekStrip", () => {
  it("draws Monday to Sunday around a Thursday, with today and the future marked", () => {
    // 2026-08-20 is a Thursday.
    const week = weekStrip(["2026-08-18", "2026-08-20"], "2026-08-20");
    expect(week.map((d) => d.day)).toEqual([
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
      "2026-08-23",
    ]);
    expect(week.map((d) => d.label).join("")).toBe("MTWTFSS");
    expect(week.map((d) => d.counted)).toEqual([false, true, false, true, false, false, false]);
    expect(week.map((d) => d.today)).toEqual([false, false, false, true, false, false, false]);
    expect(week.map((d) => d.future)).toEqual([false, false, false, false, true, true, true]);
  });

  it("starts the week on the same day when today is a Monday", () => {
    const week = weekStrip([], "2026-08-17");
    expect(week[0].day).toBe("2026-08-17");
    expect(week[0].today).toBe(true);
  });

  it("ends the week on the same day when today is a Sunday", () => {
    const week = weekStrip([], "2026-08-23");
    expect(week[6].day).toBe("2026-08-23");
    expect(week[6].today).toBe(true);
    expect(week.some((d) => d.future)).toBe(false);
  });

  it("never counts a day that is still ahead", () => {
    const week = weekStrip(["2026-08-22"], "2026-08-20");
    expect(week[5].counted).toBe(false);
  });
});

describe("runMarkers", () => {
  it("has no markers before a week in a row", () => {
    expect(runMarkers(["2026-08-18", "2026-08-19", "2026-08-20"], TODAY)).toEqual({
      weekAt: null,
      monthAt: null,
    });
  });

  it("dates the week marker to the seventh day of the first run that reached it", () => {
    const run = ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08"];
    expect(runMarkers(run, TODAY).weekAt).toBe("2026-08-07");
  });

  it("keeps the first marker when a later run also reaches a week", () => {
    const first = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05", "2026-07-06", "2026-07-07"];
    const second = ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15", "2026-08-16"];
    expect(runMarkers([...second, ...first], TODAY).weekAt).toBe("2026-07-07");
  });

  it("dates the month marker to the thirtieth day", () => {
    const run = Array.from({ length: 31 }, (_, i) => `2026-07-${String(i + 1).padStart(2, "0")}`);
    expect(runMarkers(run, TODAY)).toEqual({ weekAt: "2026-07-07", monthAt: "2026-07-30" });
  });

  it("ignores days after today", () => {
    const run = Array.from({ length: 7 }, (_, i) => `2026-08-${String(18 + i).padStart(2, "0")}`);
    expect(runMarkers(run, TODAY).weekAt).toBeNull();
  });
});

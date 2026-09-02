import { describe, expect, it } from "vitest";
import {
  dayImpact,
  emptyCounts,
  firstWeekStart,
  monthTicks,
  runStartWeek,
  scatter,
  standingLines,
  streamWeeks,
  termIslands,
  termOf,
  type DayActivity,
} from "@/lib/contributions/stream";

const TODAY = "2026-08-20"; // a Thursday

function day(d: string, partial: Partial<Record<keyof ReturnType<typeof emptyCounts>, number>>): DayActivity {
  return { day: d, counts: { ...emptyCounts(), ...partial } };
}

describe("streamWeeks", () => {
  it("ends with the week that holds today and keeps every week even when empty", () => {
    const weeks = streamWeeks([], TODAY, 4);
    expect(weeks.map((w) => w.start)).toEqual(["2026-07-27", "2026-08-03", "2026-08-10", "2026-08-17"]);
    expect(weeks.every((w) => w.days.length === 0 && w.impact === 0)).toBe(true);
  });

  it("places a day in its week with its weight and leaves quiet days out", () => {
    const weeks = streamWeeks([day("2026-08-18", { share: 1, study: 2 }), day("2026-08-04", { review: 1 })], TODAY, 4);
    expect(weeks[3].days).toEqual([{ day: "2026-08-18", counts: { ...emptyCounts(), share: 1, study: 2 }, impact: 5 }]);
    expect(weeks[3].impact).toBe(5);
    expect(weeks[1].days[0].day).toBe("2026-08-04");
    expect(weeks[1].impact).toBe(2);
    expect(weeks[0].days).toEqual([]);
  });

  it("never draws a day after today", () => {
    const weeks = streamWeeks([day("2026-08-22", { share: 1 })], TODAY, 1);
    expect(weeks[0].days).toEqual([]);
  });

  it("returns nothing for a day that is not a date", () => {
    expect(streamWeeks([], "someday")).toEqual([]);
  });
});

describe("dayImpact", () => {
  it("weighs a shared note more than a study run", () => {
    expect(dayImpact({ ...emptyCounts(), share: 1 })).toBeGreaterThan(dayImpact({ ...emptyCounts(), study: 1 }));
    expect(dayImpact(emptyCounts())).toBe(0);
  });
});

describe("terms", () => {
  it("names the four terms by month", () => {
    expect(termOf("2026-09-01")).toBe("Fall");
    expect(termOf("2026-12-15")).toBe("Winter");
    expect(termOf("2026-02-01")).toBe("Winter");
    expect(termOf("2026-04-10")).toBe("Spring");
    expect(termOf("2026-07-04")).toBe("Summer");
  });

  it("groups consecutive weeks of one term into an island", () => {
    const weeks = streamWeeks([], "2026-03-12", 6); // late Feb into March
    const islands = termIslands(weeks);
    expect(islands.map((i) => i.term)).toEqual(["Winter", "Spring"]);
    expect(islands[0].from).toBe(0);
    expect(islands[1].to).toBe(5);
  });
});

describe("monthTicks", () => {
  it("labels a month once, at the first week that opens it", () => {
    const weeks = streamWeeks([], "2026-08-20", 10);
    const ticks = monthTicks(weeks);
    expect(ticks.map((t) => t.label)).toEqual(["Jul", "Aug"]);
    expect(weeks[ticks[1].index].start).toBe("2026-08-03");
  });
});

describe("scatter", () => {
  it("is stable and stays inside minus one to one", () => {
    expect(scatter("2026-08-20")).toBe(scatter("2026-08-20"));
    for (const seed of ["a", "b", "2026-01-01", "2026-12-31"]) {
      const v = scatter(seed);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(scatter("2026-08-20")).not.toBe(scatter("2026-08-21"));
  });
});

describe("firstWeekStart and runStartWeek", () => {
  it("names the Monday fifty one weeks before this week's", () => {
    expect(firstWeekStart("2026-08-20")).toBe("2025-08-25");
    expect(firstWeekStart("2026-08-20", 4)).toBe("2026-07-27");
  });

  it("boxes a run from the week its first day fell in", () => {
    const weeks = streamWeeks([], "2026-08-17", 4); // a Monday
    expect(runStartWeek(weeks, "2026-08-17", 1)).toBe(3);
    expect(runStartWeek(weeks, "2026-08-17", 2)).toBe(2); // Sunday the 16th
    expect(runStartWeek(weeks, "2026-08-17", 9)).toBe(1);
    expect(runStartWeek(weeks, "2026-08-17", 400)).toBe(0);
    expect(runStartWeek(weeks, "2026-08-17", 0)).toBe(4);
  });
});

describe("standingLines", () => {
  const base = { potId: "p", title: "Human Biology", days: 5, size: 21, rank: 2, behind: 19, level: 0, gap: 2 };

  it("says what the person is ahead of, as a share of classmates", () => {
    expect(standingLines(base).lead).toBe("Ahead of 95% of Human Biology.");
    expect(standingLines(base).detail).toBe("2nd of 21 on days counted in the last 30 days.");
  });

  it("turns near the bottom into what is behind, never a rank from the top", () => {
    const lines = standingLines({ ...base, rank: 20, behind: 1, level: 0 });
    expect(lines.lead).toBe("Ahead of 5% of Human Biology.");
    expect(lines.detail).toBe("1 of 20 classmates behind you on days counted in the last 30 days.");
    expect(`${lines.lead} ${lines.detail}`).not.toMatch(/behind you.*of 21|20th/);
  });

  it("never rounds someone who is ahead down to zero", () => {
    expect(standingLines({ ...base, size: 202, rank: 201, behind: 1 }).lead).toBe("Ahead of 1% of Human Biology.");
  });

  it("names a tie as level, with the way up", () => {
    const one = standingLines({ ...base, rank: 3, behind: 0, level: 1 });
    expect(one.lead).toBe("Level with a classmate in Human Biology.");
    const four = standingLines({ ...base, rank: 3, behind: 0, level: 4 });
    expect(four.lead).toBe("Level with 4 classmates in Human Biology.");
    expect(four.detail).toBe("One more counted day moves you ahead of them.");
  });

  it("tells last place how far the next step up is", () => {
    expect(standingLines({ ...base, rank: 21, behind: 0, level: 0, gap: 1 }).lead).toBe(
      "One more counted day moves you up in Human Biology.",
    );
    const far = standingLines({ ...base, rank: 21, behind: 0, level: 0, gap: 3 });
    expect(far.lead).toBe("3 more counted days move you up in Human Biology.");
    expect(far.detail).toMatch(/3 days away/);
  });

  it("has nothing to compare in a class of one", () => {
    expect(standingLines({ ...base, size: 1, rank: 1, behind: 0, level: 0, gap: null }).lead).toBe(
      "Just you in Human Biology so far.",
    );
  });

  it("spells ordinals from the top half only", () => {
    expect(standingLines({ ...base, rank: 1, behind: 20 }).detail).toMatch(/^1st/);
    expect(standingLines({ ...base, rank: 3, behind: 18 }).detail).toMatch(/^3rd/);
    expect(standingLines({ ...base, rank: 11, behind: 10 }).detail).toMatch(/^11th/);
    expect(standingLines({ ...base, rank: 12, behind: 9 }).detail).toMatch(/^9 of 20 classmates/);
  });
});

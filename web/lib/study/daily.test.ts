import { describe, expect, it } from "vitest";
import { dailyFingerprint, utcDay } from "./daily";

describe("utcDay", () => {
  it("cuts the day in UTC, not in the reader's zone", () => {
    // 2026-09-12T23:30:00Z is already the next day in every zone east of UTC.
    expect(utcDay(new Date("2026-09-12T23:30:00.000Z"))).toBe("2026-09-12");
    expect(utcDay(new Date("2026-09-12T00:00:00.000Z"))).toBe("2026-09-12");
  });

  it("rolls over at the UTC boundary", () => {
    expect(utcDay(new Date("2026-09-13T00:00:00.000Z"))).toBe("2026-09-13");
  });
});

describe("dailyFingerprint", () => {
  it("names the day and nothing else", () => {
    expect(dailyFingerprint("2026-09-12")).toBe("daily:2026-09-12");
  });

  it("is stable: the same day names the same set for the whole class", () => {
    expect(dailyFingerprint(utcDay(new Date("2026-09-12T18:00:00.000Z")))).toBe(
      "daily:2026-09-12",
    );
  });
});

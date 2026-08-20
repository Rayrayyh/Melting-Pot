import { describe, expect, it } from "vitest";
import { contributorActivity } from "@/lib/contributors";
import type { FeedNote } from "@/lib/data/pot";

function note(contributorName: string, sharedAt: string): FeedNote {
  return {
    id: `${contributorName}-${sharedAt}`,
    title: "A note",
    summary: "A summary",
    contributorName,
    sectionId: null,
    sectionTitle: null,
    sharedAt,
    versionCount: 1,
    attachmentCount: 0,
  };
}

describe("contributorActivity", () => {
  it("counts each person's notes once", () => {
    const activity = contributorActivity([
      note("Ava Morgan", "2026-08-03T10:00:00Z"),
      note("Ava Morgan", "2026-08-01T10:00:00Z"),
      note("Omar Haddad", "2026-08-02T10:00:00Z"),
    ]);
    expect(activity).toEqual([
      { name: "Ava Morgan", noteCount: 2, lastSharedAt: "2026-08-03T10:00:00Z" },
      { name: "Omar Haddad", noteCount: 1, lastSharedAt: "2026-08-02T10:00:00Z" },
    ]);
  });

  it("orders by the most recent contribution, not by note count", () => {
    const activity = contributorActivity([
      note("Priya Patel", "2026-08-05T10:00:00Z"),
      note("Maya Chen", "2026-08-04T10:00:00Z"),
      note("Maya Chen", "2026-08-03T10:00:00Z"),
      note("Maya Chen", "2026-08-02T10:00:00Z"),
    ]);
    expect(activity.map((a) => a.name)).toEqual(["Priya Patel", "Maya Chen"]);
    expect(activity[1].noteCount).toBe(3);
  });

  it("keeps the newest timestamp when the feed is not sorted", () => {
    const activity = contributorActivity([
      note("Ava Morgan", "2026-08-01T10:00:00Z"),
      note("Ava Morgan", "2026-08-09T10:00:00Z"),
    ]);
    expect(activity[0].lastSharedAt).toBe("2026-08-09T10:00:00Z");
  });

  it("breaks ties on the same timestamp by name, so the order is stable", () => {
    const activity = contributorActivity([
      note("Zoe Ray", "2026-08-01T10:00:00Z"),
      note("Ada Byron", "2026-08-01T10:00:00Z"),
    ]);
    expect(activity.map((a) => a.name)).toEqual(["Ada Byron", "Zoe Ray"]);
  });

  it("returns nothing for an empty feed", () => {
    expect(contributorActivity([])).toEqual([]);
  });
});

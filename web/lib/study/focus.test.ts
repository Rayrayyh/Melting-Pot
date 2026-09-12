import { describe, expect, it } from "vitest";
import {
  FOCUS_MINUTES,
  focusClock,
  focusReducer,
  focusRemainingMs,
  initialFocusSession,
  MAX_FOCUS_LABEL,
} from "./focus";

const START = 1_000_000;

describe("focusReducer", () => {
  it("runs from the moment it starts", () => {
    const started = focusReducer(initialFocusSession(), { type: "start", minutes: 20, now: START });
    expect(started.phase).toBe("running");
    expect(started.startedAt).toBe(START);
    expect(focusRemainingMs(started, START + 1)).toBe(20 * 60_000 - 1);
  });

  it("finishes only from a running session, and resets back to choosing", () => {
    const idle = focusReducer(initialFocusSession(), { type: "finish" });
    expect(idle.phase).toBe("choosing");
    const started = focusReducer(initialFocusSession(), { type: "start", minutes: 10, now: START });
    const done = focusReducer(started, { type: "finish" });
    expect(done.phase).toBe("finished");
    const again = focusReducer(done, { type: "reset" });
    expect(again.phase).toBe("choosing");
    expect(again.startedAt).toBeNull();
  });

  it("keeps the label across a start and caps its length", () => {
    const labelled = focusReducer(initialFocusSession(), { type: "label", label: "a".repeat(500) });
    expect(labelled.label).toHaveLength(MAX_FOCUS_LABEL);
    const started = focusReducer(labelled, { type: "start", minutes: 10, now: START });
    expect(started.label).toHaveLength(MAX_FOCUS_LABEL);
  });
});

describe("focusRemainingMs", () => {
  it("never goes negative, whatever the clock says", () => {
    const started = focusReducer(initialFocusSession(), { type: "start", minutes: 10, now: START });
    expect(focusRemainingMs(started, START + 10 * 60_000 + 5_000)).toBe(0);
  });

  it("is zero for anything that is not running", () => {
    expect(focusRemainingMs(initialFocusSession(), START)).toBe(0);
  });

  it("resumes honestly after the clock jumps", () => {
    const started = focusReducer(initialFocusSession(), { type: "start", minutes: 10, now: START });
    // A backgrounded tab wakes up four minutes late and still has what is
    // actually left, not what its missed ticks would have counted.
    expect(focusRemainingMs(started, START + 4 * 60_000)).toBe(6 * 60_000);
  });
});

describe("focusClock", () => {
  it("rounds up to the next second and pads", () => {
    expect(focusClock(10 * 60_000)).toBe("10:00");
    expect(focusClock(59_500)).toBe("01:00");
    expect(focusClock(500)).toBe("00:01");
    expect(focusClock(0)).toBe("00:00");
  });
});

describe("FOCUS_MINUTES", () => {
  it("offers the four lengths", () => {
    expect([...FOCUS_MINUTES]).toEqual([10, 20, 30, 45]);
  });
});

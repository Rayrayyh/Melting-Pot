/**
 * A timed focus session.
 *
 * The countdown is anchored to Date.now() rather than counted down by ticks.
 * A phone that locks, a tab that sleeps, a laptop that dozes: whatever happens
 * to the interval, the remaining time is read off the clock when it is needed,
 * so the session ends when its minutes actually passed, not when its ticks
 * happened to fire.
 */

export const FOCUS_MINUTES = [10, 20, 30, 45] as const;
export type FocusMinutes = (typeof FOCUS_MINUTES)[number];

export const MAX_FOCUS_LABEL = 120;

export type FocusPhase = "choosing" | "running" | "finished";

export type FocusSession = {
  phase: FocusPhase;
  minutes: FocusMinutes | null;
  /** Milliseconds, from Date.now(). Null until the session starts. */
  startedAt: number | null;
  label: string;
};

export type FocusAction =
  | { type: "start"; minutes: FocusMinutes; now: number }
  | { type: "label"; label: string }
  | { type: "finish" }
  | { type: "reset" };

export function initialFocusSession(): FocusSession {
  return { phase: "choosing", minutes: null, startedAt: null, label: "" };
}

export function focusReducer(session: FocusSession, action: FocusAction): FocusSession {
  switch (action.type) {
    case "start":
      return { phase: "running", minutes: action.minutes, startedAt: action.now, label: session.label };
    case "label":
      return { ...session, label: action.label.slice(0, MAX_FOCUS_LABEL) };
    case "finish":
      return session.phase === "running" ? { ...session, phase: "finished" } : session;
    case "reset":
      return { ...session, phase: "choosing", minutes: null, startedAt: null };
  }
}

/** Milliseconds left, never negative, zero once the minutes have passed. */
export function focusRemainingMs(session: FocusSession, now: number): number {
  if (session.phase !== "running" || session.startedAt === null || session.minutes === null) {
    return 0;
  }
  return Math.max(0, session.startedAt + session.minutes * 60_000 - now);
}

/** mm:ss for any positive span, so an over-long minute still reads honestly. */
export function focusClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

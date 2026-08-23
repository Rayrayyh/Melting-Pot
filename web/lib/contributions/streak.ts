/**
 * Personal recognition of one person's own contribution habit. Nothing here
 * compares people, scores them, or leans on losing anything: the numbers are
 * only ever shown back to the person who earned them.
 */

const DAY_MS = 86_400_000;

/**
 * Days since the epoch for a date, or null when the value is not a real
 * calendar day. Accepts a full timestamp or a bare YYYY-MM-DD, so callers can
 * hand over database rows untouched.
 */
function dayIndex(value: string): number | null {
  const key = value.slice(0, 10);
  const ms = Date.parse(`${key}T00:00:00Z`);
  if (Number.isNaN(ms)) return null;
  // Some engines roll an impossible day forward instead of failing, so anything
  // that does not round-trip to the same calendar day is thrown out.
  if (new Date(ms).toISOString().slice(0, 10) !== key) return null;
  return Math.round(ms / DAY_MS);
}

export type ContributionStreak = {
  /** Consecutive days ending today or yesterday. */
  current: number;
  /** The longest consecutive run on record, whenever it happened. */
  longest: number;
  activeToday: boolean;
};

/**
 * Counts calendar days, not contributions: three notes in one evening is one
 * day. The current run is still alive if the last day was yesterday, so a
 * streak only ends after a full day passes with nothing shared.
 */
export function contributionStreak(dates: string[], today: string): ContributionStreak {
  const todayIndex = dayIndex(today);
  const days = new Set<number>();
  for (const date of dates) {
    const index = dayIndex(date);
    if (index === null) continue;
    // A clock running ahead would otherwise invent a run that has not happened
    // yet, so days past today are left out of both counts.
    if (todayIndex !== null && index > todayIndex) continue;
    days.add(index);
  }
  if (days.size === 0) return { current: 0, longest: 0, activeToday: false };

  const ordered = [...days].sort((a, b) => a - b);
  let longest = 1;
  let run = 1;
  for (let i = 1; i < ordered.length; i += 1) {
    run = ordered[i] === ordered[i - 1] + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  if (todayIndex === null) return { current: 0, longest, activeToday: false };

  const activeToday = days.has(todayIndex);
  const start = activeToday
    ? todayIndex
    : days.has(todayIndex - 1)
      ? todayIndex - 1
      : null;
  let current = 0;
  for (let cursor = start; cursor !== null && days.has(cursor); cursor -= 1) {
    current += 1;
  }
  return { current, longest, activeToday };
}

/**
 * Markers along the way, spelled out in words so they read as a note rather
 * than a score. There is no scarcity here: everyone passes the same ones.
 */
const MILESTONES: readonly { at: number; label: string }[] = [
  { at: 1, label: "First note shared" },
  { at: 5, label: "Five notes shared" },
  { at: 10, label: "Ten notes in the vault" },
  { at: 25, label: "Twenty-five notes in the vault" },
  { at: 50, label: "Fifty notes in the vault" },
  { at: 100, label: "A hundred notes in the vault" },
];

export type ContributionMilestone = {
  label: string;
  /** The next marker, or null once the last one is behind them. */
  nextAt: number | null;
};

/** The marker this person has passed most recently, or null before the first. */
export function contributionMilestone(total: number): ContributionMilestone | null {
  const count = Math.floor(total);
  let reached: (typeof MILESTONES)[number] | null = null;
  let nextAt: number | null = null;
  for (const milestone of MILESTONES) {
    if (count >= milestone.at) {
      reached = milestone;
      continue;
    }
    nextAt = milestone.at;
    break;
  }
  return reached ? { label: reached.label, nextAt } : null;
}

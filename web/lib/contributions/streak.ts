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

const formatters = new Map<string, Intl.DateTimeFormat>();

function dayFormatter(zone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(zone);
  if (!formatter) {
    // en-CA writes a numeric date as YYYY-MM-DD, which is the key everything
    // else here slices on.
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatters.set(zone, formatter);
  }
  return formatter;
}

/** Whether a string names a zone the runtime knows. */
export function isZone(zone: string): boolean {
  try {
    dayFormatter(zone);
    return true;
  } catch {
    return false;
  }
}

/**
 * Days are counted where the reader is. Timestamps arrive in UTC; naming the
 * reader's zone rather than an offset lets each moment fall on the day it was
 * lived even across a daylight saving change, so a 6 pm study session in
 * Los Angeles is Tuesday in August and in December alike. An unknown zone
 * falls back to the UTC day, which is where days were cut before the
 * reader's zone was known.
 */
export function localDate(value: string | number, zone: string): string {
  const ms = typeof value === "number" ? value : Date.parse(value);
  if (Number.isNaN(ms)) return "";
  try {
    return dayFormatter(zone).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString().slice(0, 10);
  }
}

/** A day of the calendar week the strip draws. */
export type WeekDay = {
  day: string;
  /** Weekday initial, Monday first. */
  label: string;
  counted: boolean;
  today: boolean;
  /** Later than today, drawn dimmer so it never reads as a miss. */
  future: boolean;
};

const INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * The Monday to Sunday week containing today, marked with the days that
 * counted. A calendar week rather than the last seven days, because that is
 * how a course runs and how every product read for this feature draws it.
 */
export function weekStrip(dates: string[], today: string): WeekDay[] {
  const todayIndex = dayIndex(today);
  if (todayIndex === null) return [];
  const counted = new Set<number>();
  for (const date of dates) {
    const index = dayIndex(date);
    if (index !== null) counted.add(index);
  }
  // Day zero of the epoch was a Thursday, so shifting by three makes Monday zero.
  const monday = todayIndex - (((todayIndex + 3) % 7) + 7) % 7;
  return INITIALS.map((label, i) => {
    const index = monday + i;
    return {
      day: new Date(index * DAY_MS).toISOString().slice(0, 10),
      label,
      counted: counted.has(index) && index <= todayIndex,
      today: index === todayIndex,
      future: index > todayIndex,
    };
  });
}

export type RunMarkers = {
  /** The first day a run reached seven, or null until one has. */
  weekAt: string | null;
  /** The first day a run reached thirty, or null until one has. */
  monthAt: string | null;
};

/**
 * Day markers as dates rather than badges: once a run has reached a week or a
 * month, the day it happened is kept for good. A later quiet stretch cannot
 * take it away, which is the whole point of recording it as a date.
 */
export function runMarkers(dates: string[], today: string): RunMarkers {
  const todayIndex = dayIndex(today);
  const days = new Set<number>();
  for (const date of dates) {
    const index = dayIndex(date);
    if (index === null) continue;
    if (todayIndex !== null && index > todayIndex) continue;
    days.add(index);
  }
  const ordered = [...days].sort((a, b) => a - b);
  let weekAt: string | null = null;
  let monthAt: string | null = null;
  let run = 0;
  for (let i = 0; i < ordered.length; i += 1) {
    run = i > 0 && ordered[i] === ordered[i - 1] + 1 ? run + 1 : 1;
    const day = new Date(ordered[i] * DAY_MS).toISOString().slice(0, 10);
    if (run === 7 && weekAt === null) weekAt = day;
    if (run === 30 && monthAt === null) monthAt = day;
  }
  return { weekAt, monthAt };
}

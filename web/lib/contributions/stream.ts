/**
 * The twelve month stream on the Contributions page: what landed, week by
 * week, drawn as clusters of droplets. Pure functions so the shape of the
 * chart can be tested without a browser.
 */

export type ActivityKind = "share" | "accepted" | "review" | "resource" | "study";

/**
 * How much a thing weighs in the picture. A shared note or an accepted
 * correction changes what the class reads, a review decides one, a resource
 * or a study run is a smaller mark. Weights, not scores: nothing here is
 * ever added up per person and shown to anyone else.
 */
export const IMPACT: Record<ActivityKind, number> = {
  share: 3,
  accepted: 3,
  review: 2,
  resource: 1,
  study: 1,
};

export const KINDS: ActivityKind[] = ["share", "accepted", "review", "resource", "study"];

export type DayActivity = {
  /** YYYY-MM-DD in the reader's zone. */
  day: string;
  counts: Record<ActivityKind, number>;
};

export type StreamDay = DayActivity & { impact: number };

export type StreamWeek = {
  /** Monday of the week, YYYY-MM-DD. */
  start: string;
  days: StreamDay[];
  impact: number;
};

const DAY_MS = 86_400_000;

function indexOf(day: string): number {
  return Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS);
}

function dayOf(index: number): string {
  return new Date(index * DAY_MS).toISOString().slice(0, 10);
}

export function emptyCounts(): Record<ActivityKind, number> {
  return { share: 0, accepted: 0, review: 0, resource: 0, study: 0 };
}

export function dayImpact(counts: Record<ActivityKind, number>): number {
  return KINDS.reduce((sum, kind) => sum + counts[kind] * IMPACT[kind], 0);
}

/**
 * The last `weeks` calendar weeks, Monday to Sunday, ending with the week
 * that holds today, oldest first. Every week is present even when empty, so
 * the chart keeps its shape through a quiet term.
 */
export function streamWeeks(days: DayActivity[], today: string, weeks = 52): StreamWeek[] {
  const todayIndex = indexOf(today);
  if (Number.isNaN(todayIndex)) return [];
  const byDay = new Map(days.map((d) => [d.day, d.counts]));
  // Day zero of the epoch was a Thursday, so shifting by three makes Monday zero.
  const thisMonday = todayIndex - ((((todayIndex + 3) % 7) + 7) % 7);
  const out: StreamWeek[] = [];
  for (let w = weeks - 1; w >= 0; w -= 1) {
    const monday = thisMonday - w * 7;
    const list: StreamDay[] = [];
    for (let i = 0; i < 7; i += 1) {
      const index = monday + i;
      if (index > todayIndex) break;
      const day = dayOf(index);
      const counts = byDay.get(day);
      if (!counts) continue;
      const impact = dayImpact(counts);
      if (impact > 0) list.push({ day, counts, impact });
    }
    out.push({ start: dayOf(monday), days: list, impact: list.reduce((s, d) => s + d.impact, 0) });
  }
  return out;
}

/** Monday of the oldest week the chart draws, YYYY-MM-DD. */
export function firstWeekStart(today: string, weeks = 52): string {
  const todayIndex = indexOf(today);
  if (Number.isNaN(todayIndex)) return today;
  const thisMonday = todayIndex - ((((todayIndex + 3) % 7) + 7) % 7);
  return dayOf(thisMonday - (weeks - 1) * 7);
}

/**
 * The index of the week that holds the first day of a run of `current` days
 * ending today, so the box around the run starts where the run did rather
 * than a fixed number of weeks back.
 */
export function runStartWeek(weeks: StreamWeek[], today: string, current: number): number {
  if (weeks.length === 0 || current <= 0) return weeks.length;
  const firstDay = dayOf(indexOf(today) - (current - 1));
  const index = weeks.findIndex((w, i) => {
    const next = weeks[i + 1];
    return firstDay >= w.start && (!next || firstDay < next.start);
  });
  return index < 0 ? 0 : index;
}

export type Term = "Fall" | "Winter" | "Spring" | "Summer";

/** The term a day belongs to, by month: the academic year's four seasons. */
export function termOf(day: string): Term {
  const month = Number(day.slice(5, 7));
  if (month >= 9 && month <= 11) return "Fall";
  if (month === 12 || month <= 2) return "Winter";
  if (month >= 3 && month <= 5) return "Spring";
  return "Summer";
}

export type TermIsland = { term: Term; from: number; to: number };

/** Contiguous runs of weeks that share a term, as index ranges into `weeks`. */
export function termIslands(weeks: StreamWeek[]): TermIsland[] {
  const out: TermIsland[] = [];
  weeks.forEach((week, i) => {
    const term = termOf(week.start);
    const last = out[out.length - 1];
    if (last && last.term === term) last.to = i;
    else out.push({ term, from: i, to: i });
  });
  return out;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** One label per month, at the first week that starts inside it. */
export function monthTicks(weeks: StreamWeek[]): { label: string; index: number }[] {
  const out: { label: string; index: number }[] = [];
  let lastMonth = "";
  weeks.forEach((week, i) => {
    const month = week.start.slice(0, 7);
    if (month === lastMonth) return;
    lastMonth = month;
    // The first week of the chart usually starts mid month; a label there
    // would sit on the edge, so the month gets its label only when the week
    // actually opens it or the chart has just begun.
    if (i === 0 && Number(week.start.slice(8, 10)) > 7) return;
    out.push({ label: MONTHS[Number(week.start.slice(5, 7)) - 1], index: i });
  });
  return out;
}

/**
 * A stable number in [-1, 1] for a string, so a day's droplet lands in the
 * same place on every render and every device without a random source.
 */
export function scatter(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 2001) / 1000 - 1;
}

export type Standing = {
  potId: string;
  title: string;
  days: number;
  size: number;
  rank: number;
  behind: number;
  level: number;
  /** Counted days to the nearest classmate above, or null when nobody is. */
  gap: number | null;
};

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * The standing, said the way the owner asked for it: always as what the
 * person is ahead of, never as what they are behind. The same fact, the
 * other way up: five percent behind the class is ahead of ninety five. The
 * rank is spelled out only from the top half; lower down the second line
 * counts the classmates behind instead, and last place is told how far the
 * next step up is.
 */
export function standingLines(s: Standing): { lead: string; detail: string } {
  if (s.size <= 1) {
    return { lead: `Just you in ${s.title} so far.`, detail: "Classmates who join will be counted here." };
  }
  const others = s.size - 1;
  const window = "on days counted in the last 30 days";
  if (s.behind > 0) {
    const percent = Math.max(1, Math.round((100 * s.behind) / others));
    const topHalf = s.rank <= Math.ceil(s.size / 2);
    return {
      lead: `Ahead of ${percent}% of ${s.title}.`,
      detail: topHalf
        ? `${ordinal(s.rank)} of ${s.size} ${window}.`
        : `${s.behind} of ${others} classmates behind you ${window}.`,
    };
  }
  if (s.level > 0) {
    return {
      lead: `Level with ${s.level === 1 ? "a classmate" : `${s.level} classmates`} in ${s.title}.`,
      detail: `One more counted day moves you ahead of them.`,
    };
  }
  const gap = s.gap ?? 1;
  return {
    lead:
      gap <= 1
        ? `One more counted day moves you up in ${s.title}.`
        : `${gap} more counted days move you up in ${s.title}.`,
    detail: `Everyone else has counted more days this month. The next step up is ${gap <= 1 ? "one day" : `${gap} days`} away.`,
  };
}

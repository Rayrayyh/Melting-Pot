/**
 * What the pot says when a day lands on someone's record.
 *
 * One line every time would become wallpaper by the second week, so the card
 * draws from a pool, and the day itself picks: the same day always shows the
 * same line, and tomorrow shows a different one. Milestones override the
 * pool, because a week or a month deserves to be named rather than left to
 * chance.
 *
 * House rules for anything added here: sentence case, no emoji, no em dash,
 * nothing that threatens the run, nothing that compares the person to anyone,
 * and nothing that reads as a slogan. The pot, the class and the work are the
 * only things these lines are allowed to be about.
 */

export type StirLine = { heading: string; subline: string };

const WORDS = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];

/** Small numbers read better spelled, the way the markers are written. */
export function spelled(n: number): string {
  return n >= 0 && n < WORDS.length ? WORDS[n] : String(n);
}

function lower(n: number): string {
  const word = spelled(n);
  return n > 0 && n < WORDS.length ? word.toLowerCase() : word;
}

/** The first day has nothing to count yet, so it gets its own pair. */
const FIRST: StirLine[] = [
  { heading: "Day one. The pot is on.", subline: "Something of yours is in the class vault today." },
  { heading: "That is day one.", subline: "You put something in today, and it is on your record." },
];

/**
 * The everyday pool. Each entry is a function of the run so the number can
 * sit anywhere in the sentence rather than always at the front.
 */
const POOL: Array<(days: number) => StirLine> = [
  (d) => ({
    heading: `Day ${d}, still stirring.`,
    subline: `${spelled(d)} days of putting something in or taking something out.`,
  }),
  (d) => ({
    heading: `${spelled(d)} days on the boil.`,
    subline: "You have kept something going into the pot, one day after another.",
  }),
  (d) => ({
    heading: `Day ${d}, and the pot is still warm.`,
    subline: `${spelled(d)} days running, all of them your own work.`,
  }),
  (d) => ({
    heading: "Another day in the pot.",
    subline: `That is ${lower(d)} days in a row of writing, studying or fixing something.`,
  }),
  (d) => ({
    heading: `${spelled(d)} days, one pot.`,
    subline: "Everything you added is still there, with your name on it.",
  }),
  (d) => ({
    heading: `Day ${d}. You kept it going.`,
    subline: `${spelled(d)} days of showing up for the class vault.`,
  }),
  (d) => ({
    heading: "Still stirring.",
    subline: `Day ${d} in a row, and the class has more than it did this morning.`,
  }),
  (d) => ({
    heading: `Day ${d} goes in.`,
    subline: "Notes written, notes studied, corrections read. All of it counts.",
  }),
];

/** Named days. A week and a month are worth saying out loud. */
const MILESTONES: Record<number, StirLine> = {
  7: {
    heading: "A whole week in the pot.",
    subline: "Seven days in a row, and the class has a week of your work to read.",
  },
  14: {
    heading: "Two weeks, still stirring.",
    subline: "Fourteen days in a row. The vault has been growing the whole time.",
  },
  30: {
    heading: "A month in the pot.",
    subline: "Thirty days in a row. That is a term's worth of turning up.",
  },
  50: {
    heading: "Fifty days on your record.",
    subline: "Fifty in a row, and every one of them stays on your record.",
  },
  100: {
    heading: "A hundred days in the pot.",
    subline: "One hundred in a row, all of it work the class can read.",
  },
};

/**
 * A stable number for a string, so the same day always draws the same line
 * without a random source that would change on every render.
 */
function pick(seed: string, count: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % count;
}

/**
 * The line for a run of `days` ending on `today` (a YYYY-MM-DD, used only to
 * choose). A milestone wins; otherwise the day picks from the pool.
 */
export function stirLine(days: number, today: string): StirLine {
  if (days <= 1) return FIRST[pick(today, FIRST.length)];
  const milestone = MILESTONES[days];
  if (milestone) return milestone;
  return POOL[pick(today, POOL.length)](days);
}

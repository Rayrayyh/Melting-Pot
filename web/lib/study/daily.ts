/**
 * The daily quiz is keyed by the day, not by the notes.
 *
 * Everyone in the Pot gets the same five questions on a given day, so the
 * fingerprint is the day alone, cut in UTC: it is the one clock the whole
 * class shares. A quiz that changed whenever anyone shared a note would hand
 * the class a different test at lunch than at breakfast, and the record would
 * quietly stop meaning "today's quiz".
 */

export function utcDay(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** The stored fingerprint for a day's quiz: `daily:YYYY-MM-DD`, in UTC. */
export function dailyFingerprint(day: string = utcDay()): string {
  return `daily:${day}`;
}

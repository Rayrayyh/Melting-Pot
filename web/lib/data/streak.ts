import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import {
  contributionStreak,
  isZone,
  localDate,
  runMarkers,
  weekStrip,
  type ContributionStreak,
  type RunMarkers,
  type WeekDay,
} from "@/lib/contributions/streak";

export type OwnRecord = ContributionStreak &
  RunMarkers & {
    /** Shared notes, exact even past the row cap. */
    notesShared: number;
    /** The calendar week containing today, Monday first. */
    week: WeekDay[];
    /** Today where the reader is, as YYYY-MM-DD. */
    today: string;
  };

const COOKIE = "mp-tz";

/**
 * The reader's zone, written by the inline script in app/layout.tsx on every
 * load. Absent or unknown means UTC, which is where the days were cut before
 * the reader's zone was known; that covers the very first request of a new
 * browser, before the script has run once.
 */
export async function readerZone(): Promise<string> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return "UTC";
  try {
    const zone = decodeURIComponent(raw);
    return isZone(zone) ? zone : "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * A share is dated by the moment it was shared, not by the draft row's
 * created_at, which is the first autosave and can be days earlier. The
 * shared_at lives on the note the share became.
 */
const SHARE_DATE = "created_at, note:shared_notes!contributions_shared_note_fk(shared_at)";

/**
 * A day counts if the person put something in or took something out: sharing
 * a note, or sitting a flashcard run or practice test. Studying was always
 * part of the habit this recognises, and counting only shares quietly told
 * anyone revising for an exam that their week did not happen.
 *
 * Still one person's own record. Nothing here is comparable, and both
 * queries are filtered to the caller. A thousand rows of each is far past a
 * term of daily work, so the dated markers hold.
 */
/**
 * Every moment that counts for a person, as UTC timestamps: notes shared
 * (by the moment of sharing), study runs, corrections accepted, corrections
 * reviewed, and resources attached to a shared note. One list feeds the
 * record, the week strip and the completion screens, so every surface
 * agrees on which days counted. Rows are the caller's own throughout.
 */
async function countedMoments(userId: string, since?: string): Promise<{ moments: string[]; notesShared: number }> {
  const supabase = await supabaseServer();
  const from = since ?? "1970-01-01T00:00:00Z";
  const [shared, studied, accepted, reviewed, attached] = await Promise.all([
    supabase
      .from("contributions")
      .select(SHARE_DATE, { count: "exact" })
      .eq("author_id", userId)
      .eq("status", "shared")
      .gte("updated_at", from)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("study_attempts")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", from)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("revision_proposals")
      .select("decided_at")
      .eq("proposer_id", userId)
      .eq("status", "accepted")
      .gte("decided_at", from)
      .order("decided_at", { ascending: false })
      .limit(1000),
    supabase
      .from("revision_proposals")
      .select("decided_at")
      .eq("decided_by", userId)
      .gte("decided_at", from)
      .order("decided_at", { ascending: false })
      .limit(1000),
    supabase
      .from("attachments")
      .select("created_at, contribution:contributions!attachments_contribution_id_fkey!inner(status)")
      .eq("created_by", userId)
      .eq("contribution.status", "shared")
      .gte("created_at", from)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);
  for (const result of [shared, studied, accepted, reviewed, attached]) {
    if (result.error) console.error("[record]", result.error.message);
  }
  const moments = [
    ...(shared.data ?? []).map((row) => row.note?.shared_at ?? row.created_at),
    ...(studied.data ?? []).map((row) => row.created_at),
    ...(accepted.data ?? []).map((row) => row.decided_at),
    ...(reviewed.data ?? []).map((row) => row.decided_at),
    ...(attached.data ?? []).map((row) => row.created_at),
  ].filter((moment): moment is string => Boolean(moment));
  return { moments, notesShared: shared.count ?? (shared.data ?? []).length };
}

/**
 * A day counts if the person put something in or took something out: a note
 * shared, a study run, a correction accepted or reviewed, a resource
 * attached to a shared note. Studying was always part of the habit this
 * recognises, and counting only shares quietly told anyone revising for an
 * exam that their week did not happen.
 *
 * Still one person's own record. A thousand rows of each source is far past
 * a term of daily work, so the dated markers hold.
 */
export async function getOwnRecord(userId: string): Promise<OwnRecord> {
  const [zone, { moments, notesShared }] = await Promise.all([readerZone(), countedMoments(userId)]);
  const days = moments.map((moment) => localDate(moment, zone)).filter(Boolean);
  const today = localDate(Date.now(), zone);
  return {
    ...contributionStreak(days, today),
    ...runMarkers(days, today),
    notesShared,
    week: weekStrip(days, today),
    today,
  };
}

/**
 * Whether the action that just finished was the first thing to count today.
 * Called from the completion screens after their write has landed, so the
 * sentence they add is true at the moment it is read; a second share or run
 * on the same day gets nothing, because the day was already on the record.
 *
 * Everything from the last two days is fetched and bucketed by the reader's
 * zone here, rather than turned into a UTC window in the query, so a day that
 * starts or ends on a daylight saving change is still cut where it should be.
 * Anything failing reads as false: the screen then says what it always said.
 */
export async function countedJustNow(userId: string): Promise<boolean> {
  const now = Date.now();
  const since = new Date(now - 48 * 3_600_000).toISOString();
  const [zone, { moments }] = await Promise.all([readerZone(), countedMoments(userId, since)]);
  const today = localDate(now, zone);
  return moments.filter((moment) => localDate(moment, zone) === today).length === 1;
}

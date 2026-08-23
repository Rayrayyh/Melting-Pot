import { supabaseServer } from "@/lib/supabase/server";
import {
  normalizePracticeOptions,
  type PracticeOptions,
} from "@/lib/study/practice-options";
import type { StudyKind } from "@/lib/mix/contracts";

/**
 * One study set the Pot already holds, described well enough to choose from a
 * list. The payload itself stays on the server: a list of twenty tests would
 * otherwise ship every question of every one of them to the browser, and the
 * reader only needs the questions of the one they open.
 */
export type SavedStudySet = {
  id: string;
  title: string;
  createdAt: string;
  options: PracticeOptions | null;
  /** Questions in a test, or cards in a deck. Zero for a summary. */
  itemCount: number;
};

function payloadTitle(payload: unknown, kind: StudyKind, count: number): string {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const title = (payload as Record<string, unknown>).title;
    if (typeof title === "string" && title.trim()) return title.trim();
  }
  return kind === "practice" ? `${count} question test` : `${count} cards`;
}

function countItems(payload: unknown, kind: StudyKind): number {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return 0;
  const record = payload as Record<string, unknown>;
  const list = kind === "practice" ? record.questions : record.cards;
  return Array.isArray(list) ? list.length : 0;
}

/**
 * Everything of this kind the Pot has built, newest first. A set stays after
 * the notes move on, because its fingerprint names the notes it was built from
 * rather than the notes as they are now: that is what lets someone sit an
 * earlier test again without spending a generation on a new one.
 */
export async function listStudySets(
  potId: string,
  kind: StudyKind,
  limit = 30,
): Promise<SavedStudySet[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("study_sets")
    .select("id, payload, options, created_at")
    .eq("pot_id", potId)
    .eq("kind", kind)
    .is("removed_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const itemCount = countItems(row.payload, kind);
    return {
      id: row.id,
      title: payloadTitle(row.payload, kind, itemCount),
      createdAt: row.created_at,
      options: row.options ? normalizePracticeOptions(row.options) : null,
      itemCount,
    };
  });
}

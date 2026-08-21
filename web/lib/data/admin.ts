import { supabaseServer } from "@/lib/supabase/server";
import type { ContributionStatus, Json, StudySetKind } from "@/lib/database.types";

/**
 * Everything a Pot has to answer for, in one read.
 *
 * A maintainer's page used to be the correction queue and nothing else, so the
 * only way to see what had been written, what had changed it, or what had been
 * taken out was to open notes one at a time and hope. These four lists are the
 * Pot's record: what people wrote, every version that replaced a version, and
 * everything currently out of sight but not gone.
 */

export type AdminContribution = {
  id: string;
  status: ContributionStatus;
  authorId: string;
  authorName: string;
  title: string;
  sharedNoteId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminEdit = {
  id: string;
  noteId: string;
  versionNumber: number;
  title: string;
  changeSummary: string | null;
  reason: string | null;
  contributorName: string;
  /** Set when this version came from an accepted correction. */
  correctedByName: string | null;
  createdAt: string;
};

export type AdminRemovedNote = {
  id: string;
  title: string;
  contributorName: string;
  removedAt: string;
  removedReason: string | null;
  removedByName: string | null;
};

export type AdminRemovedSet = {
  id: string;
  kind: StudySetKind;
  title: string;
  removedAt: string;
  builtByName: string;
};

export type AdminRemovedCard = {
  id: string;
  front: string;
  back: string;
  removedAt: string;
  writerName: string;
};

export type AdminRecord = {
  contributions: AdminContribution[];
  edits: AdminEdit[];
  removedNotes: AdminRemovedNote[];
  removedSets: AdminRemovedSet[];
  removedCards: AdminRemovedCard[];
};

/**
 * Best available name, in the order a reader would want it: what the class sees
 * on the shared note now, then the title the draft was organized under, and
 * only for an unorganized draft the first line of the raw writing.
 */
function contributionTitle(
  noteTitle: string | null | undefined,
  organized: Json | null,
  rawText: string,
): string {
  if (typeof noteTitle === "string" && noteTitle.trim()) return noteTitle.trim();
  if (organized && typeof organized === "object" && !Array.isArray(organized)) {
    const title = (organized as Record<string, Json | undefined>).title;
    if (typeof title === "string" && title.trim()) return title.trim();
  }
  const firstLine = rawText.split("\n").map((line) => line.trim()).find(Boolean);
  if (!firstLine) return "Untitled";
  return firstLine.length > 90 ? `${firstLine.slice(0, 89)}…` : firstLine;
}

/** The title a stored set carries, so a removed one is nameable rather than a row of ids. */
function setTitle(kind: StudySetKind, payload: Json): string {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const title = (payload as Record<string, Json | undefined>).title;
    if (typeof title === "string" && title.trim()) return title.trim();
    const cards = (payload as Record<string, Json | undefined>).cards;
    if (Array.isArray(cards)) return `${cards.length} cards`;
  }
  return kind === "practice" ? "Practice test" : kind === "flashcards" ? "Flashcards" : "Summary";
}

export async function getAdminRecord(potId: string): Promise<AdminRecord> {
  const supabase = await supabaseServer();

  const [contributions, edits, removedNotes, removedSets, removedCards] = await Promise.all([
    supabase
      .from("contributions")
      .select(
        `id, status, author_id, organized, raw_text, shared_note_id, created_at, updated_at,
         author:profiles!contributions_author_id_fkey (display_name),
         note:shared_notes!contributions_shared_note_fk (
           current:note_versions!shared_notes_current_version_fk (title)
         )`,
      )
      .eq("pot_id", potId)
      .order("updated_at", { ascending: false })
      .limit(300),
    supabase
      .from("note_versions")
      .select(
        `id, note_id, version_number, title, change_summary, reason, created_at,
         contributor:profiles!note_versions_contributor_id_fkey (display_name),
         corrector:profiles!note_versions_correction_contributor_id_fkey (display_name),
         note:shared_notes!note_versions_note_id_fkey!inner (pot_id)`,
      )
      .eq("note.pot_id", potId)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("shared_notes")
      .select(
        `id, removed_at, removed_reason,
         remover:profiles!shared_notes_removed_by_fkey (display_name),
         contributor:profiles!shared_notes_contributor_id_fkey (display_name),
         current:note_versions!shared_notes_current_version_fk (title)`,
      )
      .eq("pot_id", potId)
      .not("removed_at", "is", null)
      .order("removed_at", { ascending: false }),
    supabase
      .from("study_sets")
      .select(
        "id, kind, payload, removed_at, builder:profiles!study_sets_generated_by_fkey (display_name)",
      )
      .eq("pot_id", potId)
      .not("removed_at", "is", null)
      .order("removed_at", { ascending: false }),
    supabase
      .from("note_flashcards")
      .select(
        "id, front, back, removed_at, writer:profiles!note_flashcards_created_by_fkey (display_name)",
      )
      .eq("pot_id", potId)
      .not("removed_at", "is", null)
      .order("removed_at", { ascending: false }),
  ]);

  return {
    contributions: (contributions.data ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      authorId: row.author_id,
      authorName: row.author?.display_name ?? "A member",
      title: contributionTitle(row.note?.current?.title, row.organized, row.raw_text),
      sharedNoteId: row.shared_note_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    // The join is inner on purpose. Filtering an embedded table without it
    // filters the embed rather than the parent, so the limit above would count
    // versions from every Pot and this list could come back empty.
    edits: (edits.data ?? [])
      .map((row) => ({
        id: row.id,
        noteId: row.note_id,
        versionNumber: row.version_number,
        title: row.title,
        changeSummary: row.change_summary,
        reason: row.reason,
        contributorName: row.contributor?.display_name ?? "A member",
        correctedByName: row.corrector?.display_name ?? null,
        createdAt: row.created_at,
      })),
    removedNotes: (removedNotes.data ?? []).map((row) => ({
      id: row.id,
      title: row.current?.title ?? "Untitled note",
      contributorName: row.contributor?.display_name ?? "A member",
      removedAt: row.removed_at as string,
      removedReason: row.removed_reason,
      removedByName: row.remover?.display_name ?? null,
    })),
    removedSets: (removedSets.data ?? []).map((row) => ({
      id: row.id,
      kind: row.kind,
      title: setTitle(row.kind, row.payload),
      removedAt: row.removed_at as string,
      builtByName: row.builder?.display_name ?? "A member",
    })),
    removedCards: (removedCards.data ?? []).map((row) => ({
      id: row.id,
      front: row.front,
      back: row.back,
      removedAt: row.removed_at as string,
      writerName: row.writer?.display_name ?? "A member",
    })),
  };
}

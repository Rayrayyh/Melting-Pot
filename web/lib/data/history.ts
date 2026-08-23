import { supabaseServer } from "@/lib/supabase/server";
import { parseBlocks, type NoteBlock } from "@/lib/data/pot";

export type NoteVersion = {
  id: string;
  versionNumber: number;
  title: string;
  summary: string;
  blocks: NoteBlock[];
  bodyText: string;
  takeaways: string[];
  contributorName: string;
  correctionContributorName: string | null;
  reviewedByName: string | null;
  source: string | null;
  changeSummary: string | null;
  /** Copied off the correction when it was accepted, so the class can read why. */
  reason: string | null;
  explanation: string | null;
  createdAt: string;
  isCurrent: boolean;
};

export type NoteHistory = {
  noteId: string;
  potId: string;
  noteTitle: string;
  sectionTitle: string | null;
  sectionId: string | null;
  versions: NoteVersion[];
};

export async function getNoteHistory(
  potId: string,
  noteId: string,
): Promise<NoteHistory | null> {
  const supabase = await supabaseServer();
  const { data: note } = await supabase
    .from("shared_notes")
    .select(
      `id, pot_id, current_version_id, section_id,
       section:sections!shared_notes_section_id_fkey(title),
       current:note_versions!shared_notes_current_version_fk(title)`,
    )
    .eq("id", noteId)
    .eq("pot_id", potId)
    .maybeSingle();
  if (!note) return null;

  const { data: versions } = await supabase
    .from("note_versions")
    .select(
      `id, version_number, title, summary, body, body_text, takeaways, source,
       change_summary, reason, explanation, created_at,
       contributor:profiles!note_versions_contributor_id_fkey(display_name),
       correction_contributor:profiles!note_versions_correction_contributor_id_fkey(display_name),
       reviewer:profiles!note_versions_reviewed_by_fkey(display_name)`,
    )
    .eq("note_id", noteId)
    .order("version_number", { ascending: false });

  return {
    noteId: note.id,
    potId: note.pot_id,
    noteTitle: note.current?.title ?? "Shared note",
    sectionTitle: note.section?.title ?? null,
    sectionId: note.section_id,
    versions: (versions ?? []).map((version) => ({
      id: version.id,
      versionNumber: version.version_number,
      title: version.title,
      summary: version.summary,
      blocks: parseBlocks(version.body),
      bodyText: version.body_text,
      takeaways: version.takeaways,
      contributorName: version.contributor?.display_name ?? "Unknown",
      correctionContributorName: version.correction_contributor?.display_name ?? null,
      reviewedByName: version.reviewer?.display_name ?? null,
      source: version.source,
      changeSummary: version.change_summary,
      reason: version.reason,
      explanation: version.explanation,
      createdAt: version.created_at,
      isCurrent: version.id === note.current_version_id,
    })),
  };
}

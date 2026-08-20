import { cache } from "react";
import { getAuthUser } from "@/lib/auth/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { Json, PotRole } from "@/lib/database.types";

export type PotContext = {
  id: string;
  title: string;
  description: string | null;
  classCode: string;
  role: PotRole;
  memberCount: number;
  noteCount: number;
  openProposalCount: number;
  sections: Array<{ id: string; title: string }>;
  archived: boolean;
};

/**
 * Everything the Pot shell and vitals need, or null when not a member.
 *
 * Memoized per request: the shell needs it to draw the nav and the page needs
 * it to decide what the reader may do, and that is one read, not two.
 */
export const getPotContext = cache(async function getPotContext(
  potId: string,
): Promise<PotContext | null> {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = await supabaseServer();

  const [{ data: pot }, { data: membership }] = await Promise.all([
    supabase
      .from("pots")
      .select("id, title, description, class_code, archived_at")
      .eq("id", potId)
      .maybeSingle(),
    supabase
      .from("memberships")
      .select("role")
      .eq("pot_id", potId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (!pot || !membership) return null;

  const [sections, memberCount, noteCount, openProposals] = await Promise.all([
    supabase
      .from("sections")
      .select("id, title")
      .eq("pot_id", potId)
      .order("position"),
    supabase
      .from("memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("pot_id", potId),
    supabase
      .from("shared_notes")
      .select("id", { count: "exact", head: true })
      .eq("pot_id", potId)
      .is("removed_at", null),
    // Pot-wide pending count via a security-definer function so members and
    // maintainers see the same number (RLS would show a member only theirs).
    supabase.rpc("open_correction_count", { p_pot_id: potId }),
  ]);

  return {
    id: pot.id,
    title: pot.title,
    description: pot.description,
    classCode: pot.class_code,
    role: membership.role,
    memberCount: memberCount.count ?? 0,
    noteCount: noteCount.count ?? 0,
    openProposalCount: openProposals.data ?? 0,
    sections: sections.data ?? [],
    archived: pot.archived_at !== null,
  };
});

export type FeedNote = {
  id: string;
  title: string;
  summary: string;
  contributorName: string;
  sectionId: string | null;
  sectionTitle: string | null;
  sharedAt: string;
  versionCount: number;
  attachmentCount: number;
};

export async function getFeed(potId: string, sectionId?: string): Promise<FeedNote[]> {
  const supabase = await supabaseServer();
  let query = supabase
    .from("shared_notes")
    .select(
      `id, shared_at, section_id, contribution_id,
       current:note_versions!shared_notes_current_version_fk (title, summary, version_number),
       contributor:profiles!shared_notes_contributor_id_fkey (display_name),
       section:sections!shared_notes_section_id_fkey (title)`,
    )
    .eq("pot_id", potId)
    // A note a maintainer removed leaves the feed; the contribution and every
    // version it had stay exactly where they were.
    .is("removed_at", null)
    .order("shared_at", { ascending: false });
  if (sectionId) query = query.eq("section_id", sectionId);
  const { data } = await query;
  const notes = data ?? [];

  // Attachment counts per contribution in one query.
  const contributionIds = notes.map((n) => n.contribution_id);
  const attachmentCounts = new Map<string, number>();
  if (contributionIds.length > 0) {
    const { data: attachments } = await supabase
      .from("attachments")
      .select("contribution_id")
      .in("contribution_id", contributionIds);
    for (const a of attachments ?? []) {
      if (!a.contribution_id) continue;
      attachmentCounts.set(
        a.contribution_id,
        (attachmentCounts.get(a.contribution_id) ?? 0) + 1,
      );
    }
  }

  return notes
    .filter((n) => n.current)
    .map((n) => ({
      id: n.id,
      title: n.current!.title,
      summary: n.current!.summary,
      contributorName: n.contributor?.display_name ?? "Unknown",
      sectionId: n.section_id,
      sectionTitle: n.section?.title ?? null,
      sharedAt: n.shared_at,
      versionCount: n.current!.version_number,
      attachmentCount: attachmentCounts.get(n.contribution_id) ?? 0,
    }));
}

export type NoteBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "definition"; term: string; text: string }
  | { type: "example"; text: string };

export type NoteDetail = {
  id: string;
  potId: string;
  title: string;
  summary: string;
  body: NoteBlock[];
  bodyText: string;
  takeaways: string[];
  versionNumber: number;
  contributorName: string;
  correctionContributorName: string | null;
  sectionId: string | null;
  sectionTitle: string | null;
  sharedAt: string;
  rawText: string;
  /** Set when a maintainer has taken the note out of the Pot. */
  removedAt: string | null;
  removedReason: string | null;
  removedByName: string | null;
  attachments: Array<{
    id: string;
    name: string;
    kind: string;
    url: string | null;
    storagePath: string | null;
    aiCaption: string | null;
    aiExtractedText: string | null;
  }>;
};

export function parseBlocks(body: Json): NoteBlock[] {
  if (!Array.isArray(body)) return [];
  return body.filter(
    (b): b is NoteBlock =>
      typeof b === "object" &&
      b !== null &&
      "type" in b &&
      ["paragraph", "heading", "bullets", "definition", "example"].includes(
        String((b as { type?: unknown }).type),
      ),
  );
}

export async function getNoteDetail(potId: string, noteId: string): Promise<NoteDetail | null> {
  const supabase = await supabaseServer();
  const { data: note } = await supabase
    .from("shared_notes")
    .select(
      `id, pot_id, shared_at, section_id, contribution_id,
       removed_at, removed_reason,
       removed_by_profile:profiles!shared_notes_removed_by_fkey (display_name),
       current:note_versions!shared_notes_current_version_fk (
         title, summary, body, body_text, takeaways, version_number,
         correction_contributor:profiles!note_versions_correction_contributor_id_fkey (display_name)
       ),
       contributor:profiles!shared_notes_contributor_id_fkey (display_name),
       section:sections!shared_notes_section_id_fkey (title),
       contribution:contributions!shared_notes_contribution_id_fkey (raw_text)`,
    )
    .eq("id", noteId)
    .eq("pot_id", potId)
    .maybeSingle();
  if (!note?.current) return null;

  const { data: attachments } = await supabase
    .from("attachments")
    .select("id, name, kind, url, storage_path, ai_caption, ai_extracted_text")
    .eq("contribution_id", note.contribution_id);

  return {
    id: note.id,
    potId: note.pot_id,
    title: note.current.title,
    summary: note.current.summary,
    body: parseBlocks(note.current.body),
    bodyText: note.current.body_text,
    takeaways: note.current.takeaways,
    versionNumber: note.current.version_number,
    contributorName: note.contributor?.display_name ?? "Unknown",
    correctionContributorName:
      note.current.correction_contributor?.display_name ?? null,
    sectionId: note.section_id,
    sectionTitle: note.section?.title ?? null,
    sharedAt: note.shared_at,
    rawText: note.contribution?.raw_text ?? "",
    removedAt: note.removed_at,
    removedReason: note.removed_reason,
    removedByName: note.removed_by_profile?.display_name ?? null,
    attachments: (attachments ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      kind: a.kind,
      url: a.url,
      storagePath: a.storage_path,
      aiCaption: a.ai_caption,
      aiExtractedText: a.ai_extracted_text,
    })),
  };
}

export type NoteFlashcard = {
  id: string;
  front: string;
  back: string;
  tags: string[];
  writerName: string;
  writtenByViewer: boolean;
  createdAt: string;
};

/**
 * The cards people wrote by hand off this note. Written cards are separate
 * from anything generated: a regeneration never touches them, and only their
 * author or a maintainer can take one away.
 */
export async function getNoteFlashcards(
  potId: string,
  noteId: string,
): Promise<NoteFlashcard[]> {
  const user = await getAuthUser();
  if (!user) return [];
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("note_flashcards")
    .select("id, front, back, tags, created_by, created_at, writer:profiles!note_flashcards_created_by_fkey (display_name)")
    .eq("pot_id", potId)
    .eq("note_id", noteId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((card) => ({
    id: card.id,
    front: card.front,
    back: card.back,
    tags: card.tags,
    writerName: card.writer?.display_name ?? "A classmate",
    writtenByViewer: card.created_by === user.id,
    createdAt: card.created_at,
  }));
}

export type RemovedNote = {
  id: string;
  title: string;
  contributorName: string;
  removedAt: string;
  removedReason: string | null;
  removedByName: string | null;
};

/**
 * Notes a maintainer has taken out of this Pot. They are listed so putting one
 * back is a normal thing to do rather than something you need the old link for.
 */
export async function getRemovedNotes(potId: string): Promise<RemovedNote[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("shared_notes")
    .select(
      `id, removed_at, removed_reason,
       contributor:profiles!shared_notes_contributor_id_fkey (display_name),
       remover:profiles!shared_notes_removed_by_fkey (display_name),
       current:note_versions!shared_notes_current_version_fk (title)`,
    )
    .eq("pot_id", potId)
    .not("removed_at", "is", null)
    .order("removed_at", { ascending: false })
    .limit(50);
  return (data ?? [])
    .filter((note) => note.removed_at)
    .map((note) => ({
      id: note.id,
      title: note.current?.title ?? "Untitled note",
      contributorName: note.contributor?.display_name ?? "Unknown",
      removedAt: note.removed_at!,
      removedReason: note.removed_reason,
      removedByName: note.remover?.display_name ?? null,
    }));
}

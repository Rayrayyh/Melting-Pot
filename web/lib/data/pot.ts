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

/** Everything the Pot shell and vitals need, or null when not a member. */
export async function getPotContext(potId: string): Promise<PotContext | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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
      .eq("pot_id", potId),
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
}

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

import { supabaseServer } from "@/lib/supabase/server";

export type SearchHit = {
  kind: "note" | "section" | "attachment";
  potId: string;
  potTitle: string;
  noteId?: string;
  sectionId?: string;
  title: string;
  excerpt: string | null;
  contributorName?: string;
  sectionTitle?: string | null;
};

function excerptAround(text: string, term: string, radius = 60): string | null {
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  if (index < 0) return null;
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + term.length + radius);
  return `${start > 0 ? "..." : ""}${text.slice(start, end).trim()}${end < text.length ? "..." : ""}`;
}

/**
 * Basic search within the user's Pots across titles, summaries, note
 * content, sections, contributors, and attachment names. RLS bounds
 * everything to memberships; potId narrows to one Pot.
 */
export async function searchPots(query: string, potId?: string): Promise<SearchHit[]> {
  const term = query.trim();
  if (term.length < 2) return [];
  const supabase = await supabaseServer();

  let notesQuery = supabase
    .from("shared_notes")
    .select(
      `id, pot_id,
       pot:pots!shared_notes_pot_id_fkey(title),
       section:sections!shared_notes_section_id_fkey(title),
       contributor:profiles!shared_notes_contributor_id_fkey(display_name),
       current:note_versions!shared_notes_current_version_fk(title, summary, body_text)`,
    )
    .order("shared_at", { ascending: false })
    .limit(200);
  if (potId) notesQuery = notesQuery.eq("pot_id", potId);

  let sectionsQuery = supabase
    .from("sections")
    .select("id, pot_id, title, pot:pots!sections_pot_id_fkey(title)")
    .ilike("title", `%${term}%`)
    .limit(10);
  if (potId) sectionsQuery = sectionsQuery.eq("pot_id", potId);

  let attachmentsQuery = supabase
    .from("attachments")
    .select(
      `id, pot_id, name,
       pot:pots!attachments_pot_id_fkey(title),
       contribution:contributions!attachments_contribution_id_fkey(shared_note_id, status)`,
    )
    .ilike("name", `%${term}%`)
    .limit(10);
  if (potId) attachmentsQuery = attachmentsQuery.eq("pot_id", potId);

  const [notes, sections, attachments] = await Promise.all([
    notesQuery,
    sectionsQuery,
    attachmentsQuery,
  ]);

  const lower = term.toLowerCase();
  const hits: SearchHit[] = [];

  for (const note of notes.data ?? []) {
    if (!note.current) continue;
    const { title, summary, body_text } = note.current;
    const contributor = note.contributor?.display_name ?? "";
    const matches =
      title.toLowerCase().includes(lower) ||
      summary.toLowerCase().includes(lower) ||
      body_text.toLowerCase().includes(lower) ||
      contributor.toLowerCase().includes(lower);
    if (!matches) continue;
    hits.push({
      kind: "note",
      potId: note.pot_id,
      potTitle: note.pot?.title ?? "Pot",
      noteId: note.id,
      title,
      excerpt:
        excerptAround(body_text, term) ??
        excerptAround(summary, term) ??
        (contributor.toLowerCase().includes(lower) ? `Shared by ${contributor}` : summary.slice(0, 120)),
      contributorName: contributor,
      sectionTitle: note.section?.title ?? null,
    });
  }

  for (const section of sections.data ?? []) {
    hits.push({
      kind: "section",
      potId: section.pot_id,
      potTitle: section.pot?.title ?? "Pot",
      sectionId: section.id,
      title: section.title,
      excerpt: null,
    });
  }

  for (const attachment of attachments.data ?? []) {
    if (attachment.contribution?.status !== "shared") continue;
    hits.push({
      kind: "attachment",
      potId: attachment.pot_id,
      potTitle: attachment.pot?.title ?? "Pot",
      noteId: attachment.contribution?.shared_note_id ?? undefined,
      title: attachment.name,
      excerpt: null,
    });
  }

  return hits.slice(0, 40);
}

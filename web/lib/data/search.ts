import { getAuthUser } from "@/lib/auth/server";
import { supabaseServer } from "@/lib/supabase/server";

export type SearchKind = "note" | "summary" | "flashcard" | "section";
export type SearchType = "all" | SearchKind;
export type SearchSort = "recent" | "oldest" | "contributed" | "title" | "title-desc";

export type SearchPot = { id: string; title: string };

export type SearchResult = {
  /** Stable React key; results of one kind can share a source row. */
  key: string;
  kind: SearchKind;
  potId: string;
  potTitle: string;
  href: string;
  title: string;
  excerpt: string | null;
  /** Small facts for the line under the excerpt, in reading order. */
  meta: string[];
  tags: string[];
  timestamp: string;
  /**
   * How many versions the note carries. Everything else sits at 1, which is
   * what makes the "most contributed" sort degrade to recency for it.
   */
  contributionCount: number;
};

export type SearchCounts = Record<SearchType, number>;

export type SearchOutcome = {
  /** Every Pot the caller belongs to, for the Pot filter. */
  pots: SearchPot[];
  /** The Pot the results were narrowed to, when the filter named a real one. */
  activePot: SearchPot | null;
  results: SearchResult[];
  /** Counts across all kinds, so the filter pills stay honest under a filter. */
  counts: SearchCounts;
};

/** Below this a query matches almost everything, so it is not run at all. */
export const MIN_QUERY_LENGTH = 2;

const RESULT_LIMIT = 40;
/** One generated set holds up to 24 cards; no single set should fill the page. */
const CARDS_PER_SET = 6;

export function parseSearchType(value: unknown): SearchType {
  return value === "note" || value === "summary" || value === "flashcard" || value === "section"
    ? value
    : "all";
}

export function parseSearchSort(value: unknown): SearchSort {
  return value === "contributed" ||
    value === "oldest" ||
    value === "title" ||
    value === "title-desc"
    ? value
    : "recent";
}

function emptyCounts(): SearchCounts {
  return { all: 0, note: 0, summary: 0, flashcard: 0, section: 0 };
}

function excerptAround(text: string, term: string, radius = 60): string | null {
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  if (index < 0) return null;
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + term.length + radius);
  return `${start > 0 ? "..." : ""}${text.slice(start, end).trim()}${end < text.length ? "..." : ""}`;
}

/** The excerpt from the first candidate that actually carries the term. */
function firstExcerpt(candidates: string[], term: string): string | null {
  for (const candidate of candidates) {
    const excerpt = candidate ? excerptAround(candidate, term) : null;
    if (excerpt) return excerpt;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Search notes, generated study summaries, and flashcards across the Pots the
 * caller belongs to. Matching happens in memory because the interesting text
 * lives inside jsonb payloads and joined rows, which no single Postgres filter
 * reaches; the row caps below keep that bounded.
 */
export async function searchAcrossPots({
  query,
  type = "all",
  potId,
  sort = "recent",
}: {
  query: string;
  type?: SearchType;
  potId?: string;
  sort?: SearchSort;
}): Promise<SearchOutcome> {
  const user = await getAuthUser();
  if (!user) return { pots: [], activePot: null, results: [], counts: emptyCounts() };

  const supabase = await supabaseServer();
  // RLS lets a member read the whole roster of their Pots, so the membership
  // read still filters to this user's own rows (memory/lessons/005). The
  // titles it returns also feed the Pot filter.
  const { data: membershipRows } = await supabase
    .from("memberships")
    .select("pots(id, title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const pots: SearchPot[] = (membershipRows ?? [])
    .filter((row) => row.pots)
    .map((row) => ({ id: row.pots!.id, title: row.pots!.title }));
  const activePot = pots.find((pot) => pot.id === potId) ?? null;
  const scopeIds = activePot ? [activePot.id] : pots.map((pot) => pot.id);

  const term = query.trim();
  if (scopeIds.length === 0 || term.length < MIN_QUERY_LENGTH) {
    return { pots, activePot, results: [], counts: emptyCounts() };
  }

  const lower = term.toLowerCase();
  const matches = (value: string | null | undefined) =>
    Boolean(value && value.toLowerCase().includes(lower));
  const potTitles = new Map(pots.map((pot) => [pot.id, pot.title]));
  const titleOf = (id: string) => potTitles.get(id) ?? "Pot";

  const [notes, attachments, studySets, handCards, sectionRows] = await Promise.all([
    supabase
      .from("shared_notes")
      .select(
        `id, pot_id, shared_at,
         section:sections!shared_notes_section_id_fkey(title),
         contributor:profiles!shared_notes_contributor_id_fkey(display_name),
         current:note_versions!shared_notes_current_version_fk(title, summary, body_text, version_number)`,
      )
      .in("pot_id", scopeIds)
      // A removed note is out of search too, not only out of the feed.
      .is("removed_at", null)
      .order("shared_at", { ascending: false })
      .limit(200),
    supabase
      .from("attachments")
      .select(
        `name, contribution:contributions!attachments_contribution_id_fkey(shared_note_id, status)`,
      )
      .in("pot_id", scopeIds)
      .ilike("name", `%${term}%`)
      .limit(40),
    supabase
      .from("study_sets")
      .select("id, pot_id, kind, payload, created_at")
      .in("pot_id", scopeIds)
      .in("kind", ["summary", "flashcards"])
      .is("removed_at", null)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("note_flashcards")
      .select("id, pot_id, note_id, front, back, tags, source_excerpt, created_by, created_at")
      .in("pot_id", scopeIds)
      .is("removed_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
    // Sections are how a Pot is organized, so their names are worth finding:
    // the result is a way into that part of the feed.
    supabase
      .from("sections")
      .select("id, pot_id, title, created_at")
      .in("pot_id", scopeIds)
      .ilike("title", `%${term}%`)
      .limit(20),
  ]);

  const results: SearchResult[] = [];

  // A note is findable by the name of a file attached to it, so the matching
  // attachments are resolved back to the notes they were shared with.
  const attachmentByNote = new Map<string, string>();
  for (const attachment of attachments.data ?? []) {
    const noteId = attachment.contribution?.shared_note_id;
    if (!noteId || attachment.contribution?.status !== "shared") continue;
    if (!attachmentByNote.has(noteId)) attachmentByNote.set(noteId, attachment.name);
  }

  for (const note of notes.data ?? []) {
    if (!note.current) continue;
    const { title, summary, body_text, version_number } = note.current;
    const contributor = note.contributor?.display_name ?? "";
    const sectionTitle = note.section?.title ?? null;
    const attachmentName = attachmentByNote.get(note.id) ?? null;
    const hit =
      matches(title) ||
      matches(summary) ||
      matches(body_text) ||
      matches(contributor) ||
      matches(sectionTitle) ||
      matches(attachmentName);
    if (!hit) continue;
    results.push({
      key: `note-${note.id}`,
      kind: "note",
      potId: note.pot_id,
      potTitle: titleOf(note.pot_id),
      href: `/p/${note.pot_id}/n/${note.id}`,
      title,
      excerpt:
        firstExcerpt([body_text, summary], term) ??
        (attachmentName ? `Attached file: ${attachmentName}` : null) ??
        (matches(contributor) ? `Shared by ${contributor}` : summary.slice(0, 120)),
      meta: [contributor, sectionTitle].filter((value): value is string => Boolean(value)),
      tags: [],
      timestamp: note.shared_at,
      contributionCount: version_number,
    });
  }

  // A Pot keeps one saved set per fingerprint, so older sets describe notes
  // that have since changed. Only the newest set of each kind is searched.
  const freshest = new Map<string, (typeof studySets.data & object)[number]>();
  for (const set of studySets.data ?? []) {
    const slot = `${set.pot_id}:${set.kind}`;
    if (!freshest.has(slot)) freshest.set(slot, set);
  }

  for (const set of freshest.values()) {
    const payload = asRecord(set.payload);
    if (set.kind === "summary") {
      const overview = asString(payload.overview);
      const topics = asList(payload.keyTopics)
        .map(asRecord)
        .map((topic) => ({ title: asString(topic.title), explanation: asString(topic.explanation) }));
      const openQuestions = asList(payload.stillToConfirm).map(asString);
      const matchedTopic = topics.find(
        (topic) => matches(topic.title) || matches(topic.explanation),
      );
      const excerpt = firstExcerpt(
        [
          overview,
          ...topics.flatMap((topic) => [topic.explanation, topic.title]),
          ...openQuestions,
        ],
        term,
      );
      if (!excerpt) continue;
      results.push({
        key: `summary-${set.id}`,
        kind: "summary",
        potId: set.pot_id,
        potTitle: titleOf(set.pot_id),
        href: `/p/${set.pot_id}/study/summary`,
        title: matchedTopic ? `Study summary: ${matchedTopic.title}` : "Study summary",
        excerpt,
        meta: ["Built from the whole Pot"],
        tags: [],
        timestamp: set.created_at,
        contributionCount: 1,
      });
      continue;
    }

    let kept = 0;
    for (const [index, entry] of asList(payload.cards).entries()) {
      if (kept >= CARDS_PER_SET) break;
      const card = asRecord(entry);
      const front = asString(card.front);
      const back = asString(card.back);
      const sourceNote = asString(card.sourceNoteTitle);
      const tags = asList(card.tags).map(asString).filter(Boolean);
      if (!front || !back) continue;
      const hit =
        matches(front) || matches(back) || matches(sourceNote) || tags.some((tag) => matches(tag));
      if (!hit) continue;
      kept += 1;
      results.push({
        key: `card-${set.id}-${index}`,
        kind: "flashcard",
        potId: set.pot_id,
        potTitle: titleOf(set.pot_id),
        href: `/p/${set.pot_id}/study/flashcards`,
        title: front,
        excerpt: excerptAround(back, term) ?? back.slice(0, 160),
        meta: sourceNote ? [`From ${sourceNote}`] : [],
        tags,
        timestamp: set.created_at,
        contributionCount: 1,
      });
    }
  }

  const handHits = (handCards.data ?? []).filter((card) => {
    const tags = card.tags ?? [];
    return (
      matches(card.front) ||
      matches(card.back) ||
      matches(card.source_excerpt) ||
      tags.some((tag) => matches(tag))
    );
  });

  // Names come from a second read rather than an embed: the hand-written cards
  // are already filtered in memory, so only the writers that survived are read.
  const writerNames = new Map<string, string>();
  if (handHits.length > 0) {
    const { data: writers } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", [...new Set(handHits.map((card) => card.created_by))]);
    for (const writer of writers ?? []) writerNames.set(writer.id, writer.display_name);
  }

  for (const card of handHits) {
    const writer = writerNames.get(card.created_by);
    results.push({
      key: `written-${card.id}`,
      kind: "flashcard",
      potId: card.pot_id,
      potTitle: titleOf(card.pot_id),
      // A card made from a note reads best next to the note it came from.
      href: card.note_id
        ? `/p/${card.pot_id}/n/${card.note_id}`
        : `/p/${card.pot_id}/study/flashcards`,
      title: card.front,
      excerpt:
        firstExcerpt([card.back, card.source_excerpt ?? ""], term) ?? card.back.slice(0, 160),
      meta: [writer ? `Written by ${writer}` : "Written by a classmate"],
      tags: card.tags ?? [],
      timestamp: card.created_at,
      contributionCount: 1,
    });
  }

  for (const section of sectionRows.data ?? []) {
    results.push({
      key: `section-${section.id}`,
      kind: "section",
      potId: section.pot_id,
      potTitle: titleOf(section.pot_id),
      href: `/p/${section.pot_id}/s/${section.id}`,
      title: section.title,
      excerpt: null,
      meta: ["A part of this Pot"],
      tags: [],
      timestamp: section.created_at,
      contributionCount: 1,
    });
  }

  const counts: SearchCounts = {
    all: results.length,
    note: results.filter((result) => result.kind === "note").length,
    summary: results.filter((result) => result.kind === "summary").length,
    flashcard: results.filter((result) => result.kind === "flashcard").length,
    section: results.filter((result) => result.kind === "section").length,
  };

  const filtered = type === "all" ? results : results.filter((result) => result.kind === type);
  const ranked = filtered.sort((a, b) => {
    if (sort === "contributed" && a.contributionCount !== b.contributionCount) {
      return b.contributionCount - a.contributionCount;
    }
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "title-desc") return b.title.localeCompare(a.title);
    if (sort === "oldest") {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return { pots, activePot, results: ranked.slice(0, RESULT_LIMIT), counts };
}

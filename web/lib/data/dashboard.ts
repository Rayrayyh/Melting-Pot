import { supabaseServer } from "@/lib/supabase/server";
import type { PotRole } from "@/lib/database.types";

export type DashboardPot = {
  id: string;
  title: string;
  role: PotRole;
  memberCount: number;
  noteCount: number;
  openProposalCount: number;
  lastActivityAt: string | null;
  continueNoteId: string | null;
  continueNoteTitle: string | null;
};

export type ReviewQueueItem = {
  proposalId: string;
  potId: string;
  potTitle: string;
  noteId: string;
  noteTitle: string;
  proposerName: string;
  createdAt: string;
};

export type RevisionRequestedItem = {
  proposalId: string;
  potId: string;
  potTitle: string;
  noteTitle: string;
  feedback: string | null;
  decidedAt: string | null;
};

export type DraftItem = {
  contributionId: string;
  potId: string;
  potTitle: string;
  excerpt: string;
  status: "draft" | "ready_to_review" | "failed";
  updatedAt: string;
};

export type ActivityItem = {
  noteId: string;
  potId: string;
  potTitle: string;
  title: string;
  summary: string;
  contributorName: string;
  sharedAt: string;
};

export type Dashboard = {
  pots: DashboardPot[];
  isMaintainerAnywhere: boolean;
  reviewQueue: ReviewQueueItem[];
  revisionRequested: RevisionRequestedItem[];
  drafts: DraftItem[];
  activity: ActivityItem[];
};

export async function getDashboard(userId: string): Promise<Dashboard> {
  const supabase = await supabaseServer();

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, last_seen_note_id, pots(id, title, archived_at)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const active = (memberships ?? []).filter((m) => m.pots && !m.pots.archived_at);
  const potIds = active.map((m) => m.pots!.id);
  const maintainedPotIds = active
    .filter((m) => m.role === "maintainer" || m.role === "owner")
    .map((m) => m.pots!.id);

  if (potIds.length === 0) {
    return {
      pots: [],
      isMaintainerAnywhere: false,
      reviewQueue: [],
      revisionRequested: [],
      drafts: [],
      activity: [],
    };
  }

  const [
    membershipRows,
    noteRows,
    pendingRows,
    queueRows,
    revisionRows,
    draftRows,
    activityRows,
    lastSeenRows,
  ] = await Promise.all([
    supabase.from("memberships").select("pot_id").in("pot_id", potIds),
    supabase.from("shared_notes").select("pot_id, shared_at").in("pot_id", potIds),
    supabase
      .from("revision_proposals")
      .select("pot_id")
      .in("pot_id", potIds)
      .eq("status", "pending"),
    maintainedPotIds.length > 0
      ? supabase
          .from("revision_proposals")
          .select(
            `id, pot_id, created_at, note_id,
             pot:pots!revision_proposals_pot_id_fkey(title),
             proposer:profiles!revision_proposals_proposer_id_fkey(display_name),
             note:shared_notes!revision_proposals_note_id_fkey(
               current:note_versions!shared_notes_current_version_fk(title)
             )`,
          )
          .in("pot_id", maintainedPotIds)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("revision_proposals")
      .select(
        `id, pot_id, decision_note, decided_at,
         pot:pots!revision_proposals_pot_id_fkey(title),
         note:shared_notes!revision_proposals_note_id_fkey(
           current:note_versions!shared_notes_current_version_fk(title)
         )`,
      )
      .eq("proposer_id", userId)
      .eq("status", "revision_requested")
      .order("updated_at", { ascending: false }),
    supabase
      .from("contributions")
      .select("id, pot_id, raw_text, status, updated_at, pots(title)")
      .eq("author_id", userId)
      .in("status", ["draft", "ready_to_review", "failed"])
      .order("updated_at", { ascending: false }),
    supabase
      .from("shared_notes")
      .select(
        `id, pot_id, shared_at,
         pot:pots!shared_notes_pot_id_fkey(title),
         current:note_versions!shared_notes_current_version_fk(title, summary),
         contributor:profiles!shared_notes_contributor_id_fkey(display_name)`,
      )
      .in("pot_id", potIds)
      .order("shared_at", { ascending: false })
      .limit(8),
    supabase
      .from("shared_notes")
      .select("id, current:note_versions!shared_notes_current_version_fk(title)")
      .in(
        "id",
        active
          .map((m) => m.last_seen_note_id)
          .filter((id): id is string => id !== null),
      ),
  ]);

  const membersByPot = new Map<string, number>();
  for (const row of membershipRows.data ?? []) {
    membersByPot.set(row.pot_id, (membersByPot.get(row.pot_id) ?? 0) + 1);
  }
  const notesByPot = new Map<string, { count: number; last: string | null }>();
  for (const row of noteRows.data ?? []) {
    const entry = notesByPot.get(row.pot_id) ?? { count: 0, last: null };
    entry.count += 1;
    if (!entry.last || row.shared_at > entry.last) entry.last = row.shared_at;
    notesByPot.set(row.pot_id, entry);
  }
  const pendingByPot = new Map<string, number>();
  for (const row of pendingRows.data ?? []) {
    pendingByPot.set(row.pot_id, (pendingByPot.get(row.pot_id) ?? 0) + 1);
  }
  const lastSeenTitles = new Map<string, string>();
  for (const row of lastSeenRows.data ?? []) {
    if (row.current?.title) lastSeenTitles.set(row.id, row.current.title);
  }

  const pots: DashboardPot[] = active.map((m) => {
    const pot = m.pots!;
    const notes = notesByPot.get(pot.id) ?? { count: 0, last: null };
    const continueNoteId =
      m.last_seen_note_id && lastSeenTitles.has(m.last_seen_note_id)
        ? m.last_seen_note_id
        : null;
    return {
      id: pot.id,
      title: pot.title,
      role: m.role,
      memberCount: membersByPot.get(pot.id) ?? 0,
      noteCount: notes.count,
      openProposalCount: pendingByPot.get(pot.id) ?? 0,
      lastActivityAt: notes.last,
      continueNoteId,
      continueNoteTitle: continueNoteId
        ? (lastSeenTitles.get(continueNoteId) ?? null)
        : null,
    };
  });

  return {
    pots,
    isMaintainerAnywhere: maintainedPotIds.length > 0,
    reviewQueue: (queueRows.data ?? []).map((row) => ({
      proposalId: row.id,
      potId: row.pot_id,
      potTitle: row.pot?.title ?? "Pot",
      noteId: row.note_id,
      noteTitle: row.note?.current?.title ?? "Shared note",
      proposerName: row.proposer?.display_name ?? "A member",
      createdAt: row.created_at,
    })),
    revisionRequested: (revisionRows.data ?? []).map((row) => ({
      proposalId: row.id,
      potId: row.pot_id,
      potTitle: row.pot?.title ?? "Pot",
      noteTitle: row.note?.current?.title ?? "Shared note",
      feedback: row.decision_note,
      decidedAt: row.decided_at,
    })),
    drafts: (draftRows.data ?? []).map((row) => ({
      contributionId: row.id,
      potId: row.pot_id,
      potTitle: row.pots?.title ?? "Pot",
      excerpt: row.raw_text.slice(0, 140),
      status: row.status as DraftItem["status"],
      updatedAt: row.updated_at,
    })),
    activity: (activityRows.data ?? [])
      .filter((row) => row.current)
      .map((row) => ({
        noteId: row.id,
        potId: row.pot_id,
        potTitle: row.pot?.title ?? "Pot",
        title: row.current!.title,
        summary: row.current!.summary,
        contributorName: row.contributor?.display_name ?? "Unknown",
        sharedAt: row.shared_at,
      })),
  };
}

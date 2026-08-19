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
  status: "draft" | "organizing" | "ready_to_review" | "failed";
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

export type ArchivedPot = {
  id: string;
  title: string;
  role: PotRole;
};

export type Dashboard = {
  pots: DashboardPot[];
  archivedPots: ArchivedPot[];
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
  // Archived Pots stay reachable (collapsed on the dashboard) so archiving
  // is never a dead end; owners can unarchive from settings.
  const archivedPots: ArchivedPot[] = (memberships ?? [])
    .filter((m) => m.pots && m.pots.archived_at)
    .map((m) => ({ id: m.pots!.id, title: m.pots!.title, role: m.role }));

  if (potIds.length === 0) {
    return {
      pots: [],
      archivedPots,
      isMaintainerAnywhere: false,
      reviewQueue: [],
      revisionRequested: [],
      drafts: [],
      activity: [],
    };
  }

  // Per-pot head counts instead of fetching every row: row fetches truncate
  // silently at PostgREST's max-rows cap, counts do not.
  const statsPromise = Promise.all(
    potIds.map(async (potId) => {
      const [members, notes, pending, last] = await Promise.all([
        supabase
          .from("memberships")
          .select("user_id", { count: "exact", head: true })
          .eq("pot_id", potId),
        supabase
          .from("shared_notes")
          .select("id", { count: "exact", head: true })
          .eq("pot_id", potId),
        supabase
          .from("revision_proposals")
          .select("id", { count: "exact", head: true })
          .eq("pot_id", potId)
          .eq("status", "pending"),
        supabase
          .from("shared_notes")
          .select("shared_at")
          .eq("pot_id", potId)
          .order("shared_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        potId,
        memberCount: members.count ?? 0,
        noteCount: notes.count ?? 0,
        pendingCount: pending.count ?? 0,
        lastActivityAt: last.data?.shared_at ?? null,
      };
    }),
  );

  const [potStats, queueRows, revisionRows, draftRows, activityRows, lastSeenRows] =
    await Promise.all([
      statsPromise,
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
      // Scoped to current memberships: rows in Pots the user left would
      // render as dead links (the Pot pages 404 without membership).
      .in("pot_id", potIds)
      .order("updated_at", { ascending: false }),
    supabase
      .from("contributions")
      .select("id, pot_id, raw_text, status, updated_at, pots(title)")
      .eq("author_id", userId)
      // "organizing" counts as a draft: a closed tab mid-organize must stay reachable.
      .in("status", ["draft", "organizing", "ready_to_review", "failed"])
      .in("pot_id", potIds)
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

  const statsByPot = new Map(potStats.map((s) => [s.potId, s]));
  const lastSeenTitles = new Map<string, string>();
  for (const row of lastSeenRows.data ?? []) {
    if (row.current?.title) lastSeenTitles.set(row.id, row.current.title);
  }

  const pots: DashboardPot[] = active.map((m) => {
    const pot = m.pots!;
    const stats = statsByPot.get(pot.id);
    const continueNoteId =
      m.last_seen_note_id && lastSeenTitles.has(m.last_seen_note_id)
        ? m.last_seen_note_id
        : null;
    return {
      id: pot.id,
      title: pot.title,
      role: m.role,
      memberCount: stats?.memberCount ?? 0,
      noteCount: stats?.noteCount ?? 0,
      openProposalCount: stats?.pendingCount ?? 0,
      lastActivityAt: stats?.lastActivityAt ?? null,
      continueNoteId,
      continueNoteTitle: continueNoteId
        ? (lastSeenTitles.get(continueNoteId) ?? null)
        : null,
    };
  });

  return {
    pots,
    archivedPots,
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

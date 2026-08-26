import { supabaseServer } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/time";

/**
 * The sidebar notification feed.
 *
 * Deliberately its own query rather than a slice of getDashboard: this renders
 * in the persistent shell, so it runs on every signed-in page, and the
 * dashboard's per-Pot head counts are far too much work to repeat that often.
 * It reads the three things that are actually addressed to a person: a
 * correction waiting on their review, a decision on a correction they filed,
 * and notes other people shared into their classes.
 */
export type NotificationKind = "review" | "decision" | "note";

export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  potTitle: string;
  href: string;
  at: string;
  /** Formatted on the server. Calling relativeTime during a client
   *  render would let the server and client disagree on the wording. */
  atLabel: string;
  isNew: boolean;
};

/** Anything from the last day reads as new. There is no per-user read
 *  receipt in the schema, and inventing one to power a badge would be a
 *  migration in service of a dot. */
const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function getNotifications(userId: string, limit = 3): Promise<Notification[]> {
  const supabase = await supabaseServer();

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, pots(id, title, archived_at)")
    .eq("user_id", userId);

  const active = (memberships ?? []).filter((m) => m.pots && !m.pots.archived_at);
  const potIds = active.map((m) => m.pots!.id);
  if (potIds.length === 0) return [];

  const maintained = active
    .filter((m) => m.role === "maintainer" || m.role === "owner")
    .map((m) => m.pots!.id);

  const [queue, decided, shared] = await Promise.all([
    maintained.length > 0
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
          .in("pot_id", maintained)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("revision_proposals")
      .select(
        `id, pot_id, status, decided_at, note_id,
         pot:pots!revision_proposals_pot_id_fkey(title),
         note:shared_notes!revision_proposals_note_id_fkey(
           current:note_versions!shared_notes_current_version_fk(title)
         )`,
      )
      .eq("proposer_id", userId)
      .in("pot_id", potIds)
      .in("status", ["accepted", "revision_requested", "declined"])
      .not("decided_at", "is", null)
      .order("decided_at", { ascending: false })
      .limit(limit),
    supabase
      .from("shared_notes")
      .select(
        `id, pot_id, shared_at, contributor_id,
         pot:pots!shared_notes_pot_id_fkey(title),
         current:note_versions!shared_notes_current_version_fk(title),
         contributor:profiles!shared_notes_contributor_id_fkey(display_name)`,
      )
      .in("pot_id", potIds)
      .is("removed_at", null)
      .neq("contributor_id", userId)
      .order("shared_at", { ascending: false })
      .limit(limit),
  ]);

  // Surfaced, not swallowed. A silent empty list here reads as "all caught
  // up", which is the one wrong answer a notification feed can give.
  for (const r of [queue, decided, shared]) {
    if (r.error) console.error("[notifications]", r.error.message);
  }

  const now = Date.now();
  const isNew = (at: string) => now - new Date(at).getTime() < NEW_WINDOW_MS;
  const out: Notification[] = [];

  for (const r of queue.data ?? []) {
    out.push({
      id: `review-${r.id}`,
      kind: "review",
      title: r.note?.current?.title ?? "A shared note",
      detail: `${r.proposer?.display_name ?? "Someone"} sent a correction`,
      potTitle: r.pot?.title ?? "",
      href: `/p/${r.pot_id}/n/${r.note_id}`,
      at: r.created_at,
      atLabel: "",
      isNew: isNew(r.created_at),
    });
  }

  for (const r of decided.data ?? []) {
    const at = r.decided_at!;
    out.push({
      id: `decision-${r.id}`,
      kind: "decision",
      title: r.note?.current?.title ?? "Your correction",
      detail:
        r.status === "accepted"
          ? "Your correction was published"
          : r.status === "revision_requested"
            ? "Changes requested on your correction"
            : "Your correction was declined",
      potTitle: r.pot?.title ?? "",
      href: `/p/${r.pot_id}/n/${r.note_id}`,
      at,
      atLabel: "",
      isNew: isNew(at),
    });
  }

  for (const r of shared.data ?? []) {
    out.push({
      id: `note-${r.id}`,
      kind: "note",
      title: r.current?.title ?? "A new note",
      detail: `${r.contributor?.display_name ?? "Someone"} shared a note`,
      potTitle: r.pot?.title ?? "",
      href: `/p/${r.pot_id}/n/${r.id}`,
      at: r.shared_at,
      atLabel: "",
      isNew: isNew(r.shared_at),
    });
  }

  return out
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
    .map((n) => ({ ...n, atLabel: relativeTime(n.at, now) }));
}

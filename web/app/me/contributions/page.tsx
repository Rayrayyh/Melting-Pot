import Link from "next/link";
import { NotePencil, Tray } from "@phosphor-icons/react/dist/ssr";
import { UserShell } from "@/components/shell/user-shell";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardSection } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionPill, StatusPill } from "@/components/ui/pills";
import { requireUser } from "@/lib/data/user";
import { supabaseServer } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/time";

export const metadata = { title: "Contributions" };

const TABS = [
  { key: "shared", label: "Shared" },
  { key: "drafts", label: "Drafts" },
  { key: "proposals", label: "Proposals" },
  { key: "everyone", label: "Everyone" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const proposalTone = {
  pending: "pending",
  accepted: "success",
  revision_requested: "warning",
  declined: "danger",
} as const;

const proposalLabel = {
  pending: "Waiting on maintainer",
  accepted: "Accepted",
  revision_requested: "Revision requested",
  declined: "Declined",
} as const;

export default async function MyContributionsPage({
  searchParams,
}: PageProps<"/me/contributions">) {
  const user = await requireUser();
  const params = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === params.tab)
    ? (params.tab as TabKey)
    : "shared";
  const supabase = await supabaseServer();

  // Everything on this page deep-links into Pot routes, which 404 without
  // membership, so rows are scoped to the Pots the user currently belongs to.
  const { data: membershipRows } = await supabase
    .from("memberships")
    .select("pot_id")
    .eq("user_id", user.id);
  const potIds = (membershipRows ?? []).map((m) => m.pot_id);

  const [sharedRows, draftRows, proposalRows, everyoneRows] = await Promise.all([
    supabase
      .from("contributions")
      .select(
        `id, pot_id, shared_note_id, updated_at, pots(title),
         note:shared_notes!contributions_shared_note_fk(
           shared_at, current:note_versions!shared_notes_current_version_fk(title, summary)
         )`,
      )
      .eq("author_id", user.id)
      .eq("status", "shared")
      .in("pot_id", potIds)
      .order("updated_at", { ascending: false }),
    supabase
      .from("contributions")
      .select("id, pot_id, raw_text, status, updated_at, pots(title)")
      .eq("author_id", user.id)
      // "organizing" counts as a draft: a closed tab mid-organize must stay reachable.
      .in("status", ["draft", "organizing", "ready_to_review", "failed"])
      .in("pot_id", potIds)
      .order("updated_at", { ascending: false }),
    supabase
      .from("revision_proposals")
      .select(
        `id, pot_id, status, updated_at, pots(title),
         note:shared_notes!revision_proposals_note_id_fkey(
           current:note_versions!shared_notes_current_version_fk(title)
         )`,
      )
      .eq("proposer_id", user.id)
      .in("pot_id", potIds)
      .order("updated_at", { ascending: false }),
    // What the classes this person is in have actually put in. Drafts are
    // deliberately absent: a contribution is private to its author until they
    // share it, and row level security enforces that rather than this query.
    supabase
      .from("contributions")
      .select(
        `id, pot_id, author_id, shared_note_id, updated_at, pots(title),
         author:profiles!contributions_author_id_fkey(display_name),
         note:shared_notes!contributions_shared_note_fk(
           current:note_versions!shared_notes_current_version_fk(title, summary)
         )`,
      )
      .eq("status", "shared")
      .in("pot_id", potIds)
      .order("updated_at", { ascending: false })
      .limit(200),
  ]);

  return (
    <UserShell>
      <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Contributions</h1>

        <nav aria-label="Contribution tabs" className="flex gap-2">
          {TABS.map(({ key, label }) => (
            <Link key={key} href={`/me/contributions?tab=${key}`}>
              <SectionPill active={tab === key}>{label}</SectionPill>
            </Link>
          ))}
        </nav>

        {tab === "shared" ? (
          (sharedRows.data ?? []).length === 0 ? (
            <Card>
              <EmptyState
                icon={<Tray />}
                title="Nothing shared yet"
                body="Your first note can be rough. Write it however it comes to you."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {(sharedRows.data ?? []).map((row) => (
                <Link
                  key={row.id}
                  href={`/p/${row.pot_id}/n/${row.shared_note_id}`}
                  className="block group"
                >
                  <Card className="mp-lift group-hover:border-edge-strong">
                    <CardSection className="space-y-1.5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-ink truncate group-hover:text-primary transition-colors">
                          {row.note?.current?.title ?? "Shared note"}
                        </p>
                        <StatusPill tone="success">Live</StatusPill>
                      </div>
                      <p className="text-[13px] text-ink-muted line-clamp-1">
                        {row.note?.current?.summary}
                      </p>
                      <p className="text-[12px] text-ink-faint">
                        {row.pots?.title} &middot;{" "}
                        {row.note?.shared_at ? relativeTime(row.note.shared_at) : ""}
                      </p>
                    </CardSection>
                  </Card>
                </Link>
              ))}
            </div>
          )
        ) : null}

        {tab === "drafts" ? (
          (draftRows.data ?? []).length === 0 ? (
            <Card>
              <EmptyState
                icon={<NotePencil />}
                title="No drafts"
                body="Anything you start is saved here automatically."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {(draftRows.data ?? []).map((row) => (
                <Link
                  key={row.id}
                  href={`/p/${row.pot_id}/contribute/${row.id}`}
                  className="block group"
                >
                  <Card className="mp-lift group-hover:border-edge-strong">
                    <CardSection className="flex items-center gap-3 py-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm text-ink truncate">
                          {row.raw_text.slice(0, 140) || "Untitled draft"}
                        </p>
                        <p className="text-[12px] text-ink-faint">
                          {row.pots?.title} &middot; {relativeTime(row.updated_at)}
                        </p>
                      </div>
                      <span className="text-[12px] font-medium text-primary shrink-0">
                        Resume draft
                      </span>
                    </CardSection>
                  </Card>
                </Link>
              ))}
            </div>
          )
        ) : null}

        {tab === "proposals" ? (
          (proposalRows.data ?? []).length === 0 ? (
            <Card>
              <EmptyState
                title="No proposals yet"
                body="Suggest a correction from any shared note."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {(proposalRows.data ?? []).map((row) => (
                <Link
                  key={row.id}
                  href={`/p/${row.pot_id}/proposals/${row.id}`}
                  className="block group"
                >
                  <Card className="mp-lift group-hover:border-edge-strong">
                    <CardSection className="flex items-center gap-3 py-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-medium text-ink truncate group-hover:text-primary transition-colors">
                          {row.note?.current?.title ?? "Shared note"}
                        </p>
                        <p className="text-[12px] text-ink-faint">
                          {row.pots?.title} &middot; {relativeTime(row.updated_at)}
                        </p>
                      </div>
                      <StatusPill tone={proposalTone[row.status]}>
                        {proposalLabel[row.status]}
                      </StatusPill>
                    </CardSection>
                  </Card>
                </Link>
              ))}
            </div>
          )
        ) : null}

        {tab === "everyone" ? (
          <>
            <p className="text-[13px] text-ink-muted">
              What everyone in your Pots has shared. Drafts are not here and are
              not meant to be: a contribution belongs to whoever wrote it until
              they share it.
            </p>
            {(everyoneRows.data ?? []).length === 0 ? (
              <Card>
                <EmptyState
                  icon={<Tray />}
                  title="Nothing shared yet"
                  body="As soon as anyone in your Pots shares a note, it appears here."
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {(everyoneRows.data ?? []).map((row) => (
                  <Link
                    key={row.id}
                    href={
                      row.shared_note_id
                        ? `/p/${row.pot_id}/n/${row.shared_note_id}`
                        : `/p/${row.pot_id}`
                    }
                    className="block group"
                  >
                    <Card className="mp-lift group-hover:border-edge-strong">
                      <CardSection className="flex items-center gap-3 py-4">
                        <Avatar name={row.author?.display_name ?? "Member"} size="sm" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm font-medium text-ink truncate group-hover:text-primary transition-colors">
                            {row.note?.current?.title ?? "Shared note"}
                          </p>
                          <p className="text-[12px] text-ink-faint truncate">
                            {row.author_id === user.id
                              ? "You"
                              : row.author?.display_name ?? "A member"}{" "}
                            &middot; {row.pots?.title} &middot;{" "}
                            {relativeTime(row.updated_at)}
                          </p>
                        </div>
                      </CardSection>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </UserShell>
  );
}

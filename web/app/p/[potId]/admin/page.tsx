import Link from "next/link";
import { notFound } from "next/navigation";
import { ListChecks, ClockCounterClockwise, Notebook, TrashSimple } from "@phosphor-icons/react/dist/ssr";
import { AdminRestore } from "@/components/pot/admin-restore";
import { RemovedNotesPanel } from "@/components/pot/removed-notes-panel";
import { PotShell } from "@/components/shell/pot-shell";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardSection } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionPill, StatusPill } from "@/components/ui/pills";
import { getAdminRecord } from "@/lib/data/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/time";

export const metadata = { title: "Admin" };

const TABS = [
  { key: "review", label: "Review" },
  { key: "contributions", label: "Contributions" },
  { key: "history", label: "History" },
  { key: "removed", label: "Removed" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const statusTone = {
  pending: "pending",
  accepted: "success",
  revision_requested: "warning",
  declined: "danger",
} as const;

const statusLabel = {
  pending: "Waiting",
  accepted: "Accepted",
  revision_requested: "Revision requested",
  declined: "Declined",
} as const;

const contributionTone = {
  draft: "neutral",
  organizing: "pending",
  ready_to_review: "pending",
  shared: "success",
  failed: "danger",
} as const;

const contributionLabel = {
  draft: "Draft",
  organizing: "Organizing",
  ready_to_review: "Ready to share",
  shared: "Shared",
  failed: "Failed",
} as const;

/**
 * An open correction reads as a duration, not a moment: a maintainer triages on
 * how long a member has been waiting, which "3d ago" only states sideways.
 */
function waitedFor(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
}

function asTab(value: string | string[] | undefined): Tab {
  const wanted = Array.isArray(value) ? value[0] : value;
  return TABS.some((tab) => tab.key === wanted) ? (wanted as Tab) : "review";
}

export default async function AdminPage({
  params,
  searchParams,
}: PageProps<"/p/[potId]/admin">) {
  const { potId } = await params;
  const query = await searchParams;
  const tab = asTab(query.tab);
  const sort = (Array.isArray(query.sort) ? query.sort[0] : query.sort) === "oldest" ? "oldest" : "recent";
  const who = Array.isArray(query.who) ? query.who[0] : query.who;

  const supabase = await supabaseServer();
  const [{ data: proposals }, record] = await Promise.all([
    supabase
      .from("revision_proposals")
      .select(
        `id, status, created_at, decided_at, reason,
         proposer:profiles!revision_proposals_proposer_id_fkey(display_name),
         note:shared_notes!revision_proposals_note_id_fkey(
           id, current:note_versions!shared_notes_current_version_fk(title)
         )`,
      )
      .eq("pot_id", potId)
      // Queue order, not history order: the longest wait is the one to clear next.
      .order("created_at", { ascending: true }),
    getAdminRecord(potId),
  ]);

  return (
    <PotShell potId={potId}>
      {(pot) => {
        if (pot.role === "member") notFound();

        const open = (proposals ?? []).filter((p) => p.status === "pending");
        const decided = (proposals ?? [])
          .filter((p) => p.status !== "pending")
          .sort(
            (a, b) =>
              new Date(b.decided_at ?? b.created_at).getTime() -
              new Date(a.decided_at ?? a.created_at).getTime(),
          );

        const authors = [...new Set(record.contributions.map((c) => c.authorName))].sort();
        const contributions = record.contributions
          .filter((c) => !who || c.authorName === who)
          .sort((a, b) =>
            sort === "oldest"
              ? new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
              : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );
        const edits = [...record.edits].sort((a, b) =>
          sort === "oldest"
            ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        const removedCount =
          record.removedNotes.length + record.removedSets.length + record.removedCards.length;

        const href = (next: { tab?: Tab; sort?: string; who?: string | null }) => {
          const p = new URLSearchParams();
          const t = next.tab ?? tab;
          if (t !== "review") p.set("tab", t);
          const s = next.sort ?? sort;
          if (s !== "recent") p.set("sort", s);
          const w = next.who === null ? undefined : (next.who ?? who);
          if (w) p.set("who", w);
          const qs = p.toString();
          return `/p/${pot.id}/admin${qs ? `?${qs}` : ""}`;
        };

        return (
          <div className="mx-auto w-full max-w-3xl px-6 py-8 space-y-6">
            <header className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
              <p className="text-sm text-ink-muted">
                What this Pot has been asked for, what it has been written from,
                and what has been taken out of it. Only a person can approve a
                change.
              </p>
            </header>

            <nav aria-label="Admin sections" className="flex flex-wrap gap-2 border-b border-edge pb-3">
              {TABS.map(({ key, label }) => (
                <Link key={key} href={href({ tab: key })} aria-current={tab === key ? "page" : undefined}>
                  <SectionPill active={tab === key}>
                    {label}
                    <span className="ml-1.5 opacity-60">
                      {key === "review"
                        ? open.length
                        : key === "contributions"
                        ? record.contributions.length
                        : key === "history"
                        ? record.edits.length
                        : removedCount}
                    </span>
                  </SectionPill>
                </Link>
              ))}
            </nav>

            {tab === "review" ? (
              <>
                <section className="space-y-3">
                  <div className="space-y-0.5">
                    <p className="text-[13px] font-medium text-ink-muted">Open corrections</p>
                    {open.length > 1 ? (
                      <p className="text-[12px] text-ink-faint">
                        Oldest first, so nobody waits twice as long as anyone else.
                      </p>
                    ) : null}
                  </div>
                  {open.length === 0 ? (
                    <Card>
                      <EmptyState
                        icon={<ListChecks />}
                        title="No open corrections"
                        body="Nothing is waiting on you."
                      />
                    </Card>
                  ) : (
                    open.map((proposal) => (
                      <QueueRow key={proposal.id} potId={pot.id} proposal={proposal} />
                    ))
                  )}
                </section>

                {decided.length > 0 ? (
                  <section className="space-y-3">
                    <p className="text-[13px] font-medium text-ink-muted">Decided</p>
                    {decided.map((proposal) => (
                      <QueueRow key={proposal.id} potId={pot.id} proposal={proposal} />
                    ))}
                  </section>
                ) : null}
              </>
            ) : null}

            {tab === "contributions" ? (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <nav aria-label="Filter by person" className="flex flex-wrap gap-2">
                    <Link href={href({ who: null })} aria-current={who ? undefined : "true"}>
                      <SectionPill active={!who}>Everyone</SectionPill>
                    </Link>
                    {authors.map((name) => (
                      <Link key={name} href={href({ who: name })} aria-current={who === name ? "true" : undefined}>
                        <SectionPill active={who === name}>{name}</SectionPill>
                      </Link>
                    ))}
                  </nav>
                  <Link
                    href={href({ sort: sort === "recent" ? "oldest" : "recent" })}
                    className="ml-auto text-[13px] text-ink-muted hover:text-ink transition-colors"
                  >
                    {sort === "recent" ? "Newest first" : "Oldest first"}
                  </Link>
                </div>
                {contributions.length === 0 ? (
                  <Card>
                    <EmptyState
                      icon={<Notebook />}
                      title="Nothing written yet"
                      body="Contributions appear here as soon as anyone starts one, draft or shared."
                    />
                  </Card>
                ) : (
                  contributions.map((item) => (
                    <Card key={item.id}>
                      <CardSection className="flex items-center gap-3 py-3.5">
                        <Avatar name={item.authorName} size="sm" />
                        <div className="min-w-0 flex-1">
                          {item.sharedNoteId ? (
                            <Link
                              href={`/p/${pot.id}/n/${item.sharedNoteId}`}
                              className="text-sm font-medium text-ink truncate hover:text-primary transition-colors block"
                            >
                              {item.title}
                            </Link>
                          ) : (
                            <p className="text-sm font-medium text-ink truncate">{item.title}</p>
                          )}
                          <p className="text-[12px] text-ink-muted truncate">
                            {item.authorName} · {relativeTime(item.updatedAt)}
                          </p>
                        </div>
                        <StatusPill tone={contributionTone[item.status]} className="shrink-0">
                          {contributionLabel[item.status]}
                        </StatusPill>
                      </CardSection>
                    </Card>
                  ))
                )}
              </section>
            ) : null}

            {tab === "history" ? (
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <p className="text-[13px] text-ink-muted">
                    Every version this Pot has published, newest first.
                  </p>
                  <Link
                    href={href({ sort: sort === "recent" ? "oldest" : "recent" })}
                    className="ml-auto text-[13px] text-ink-muted hover:text-ink transition-colors"
                  >
                    {sort === "recent" ? "Newest first" : "Oldest first"}
                  </Link>
                </div>
                {edits.length === 0 ? (
                  <Card>
                    <EmptyState
                      icon={<ClockCounterClockwise />}
                      title="No versions yet"
                      body="Once a note is shared, every version of it is listed here."
                    />
                  </Card>
                ) : (
                  edits.map((edit) => (
                    <Card key={edit.id}>
                      <CardSection className="space-y-1 py-3.5">
                        <div className="flex items-baseline gap-2">
                          <Link
                            href={`/p/${pot.id}/n/${edit.noteId}/history`}
                            className="text-sm font-medium text-ink hover:text-primary transition-colors truncate"
                          >
                            {edit.title}
                          </Link>
                          <span className="text-[12px] text-ink-faint shrink-0">
                            v{edit.versionNumber}
                          </span>
                        </div>
                        <p className="text-[12px] text-ink-muted">
                          {edit.correctedByName
                            ? `${edit.contributorName}, corrected by ${edit.correctedByName}`
                            : edit.contributorName}
                          {" · "}
                          {relativeTime(edit.createdAt)}
                          {edit.reason ? ` · ${edit.reason}` : ""}
                        </p>
                        {edit.changeSummary ? (
                          <p className="text-[13px] text-ink-muted">{edit.changeSummary}</p>
                        ) : null}
                      </CardSection>
                    </Card>
                  ))
                )}
              </section>
            ) : null}

            {tab === "removed" ? (
              <section className="space-y-6">
                {removedCount === 0 ? (
                  <Card>
                    <EmptyState
                      icon={<TrashSimple />}
                      title="Nothing has been removed"
                      body="Notes, study sets and cards taken out of this Pot are listed here, and nothing here is gone."
                    />
                  </Card>
                ) : null}
                <RemovedNotesPanel
                  potId={pot.id}
                  notes={record.removedNotes}
                />
                <AdminRestore sets={record.removedSets} cards={record.removedCards} />
              </section>
            ) : null}
          </div>
        );
      }}
    </PotShell>
  );
}

function QueueRow({
  potId,
  proposal,
}: {
  potId: string;
  proposal: {
    id: string;
    status: keyof typeof statusTone;
    created_at: string;
    decided_at: string | null;
    reason: string | null;
    proposer: { display_name: string } | null;
    note: { id: string; current: { title: string } | null } | null;
  };
}) {
  const isOpen = proposal.status === "pending";
  const meta = [
    proposal.proposer?.display_name ?? "A member",
    proposal.reason,
    isOpen ? null : relativeTime(proposal.decided_at ?? proposal.created_at),
  ].filter((part): part is string => Boolean(part));

  return (
    <Link href={`/p/${potId}/review/${proposal.id}`} className="block group">
      <Card className="mp-lift group-hover:border-edge-strong">
        <CardSection className="flex items-center gap-3 py-3.5">
          <Avatar name={proposal.proposer?.display_name ?? "Member"} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink truncate group-hover:text-primary transition-colors">
              {proposal.note?.current?.title ?? "Shared note"}
            </p>
            <p className="text-[12px] text-ink-muted truncate">{meta.join(" · ")}</p>
          </div>
          <StatusPill tone={statusTone[proposal.status]} className="shrink-0">
            {isOpen ? `Waiting ${waitedFor(proposal.created_at)}` : statusLabel[proposal.status]}
          </StatusPill>
        </CardSection>
      </Card>
    </Link>
  );
}

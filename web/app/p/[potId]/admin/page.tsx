import Link from "next/link";
import { notFound } from "next/navigation";
import { Brain, ListChecks, ClockCounterClockwise, Notebook, TrashSimple } from "@phosphor-icons/react/dist/ssr";
import { AdminRestore } from "@/components/pot/admin-restore";
import { RemovedNotesPanel } from "@/components/pot/removed-notes-panel";
import { TeachingReadout } from "@/components/study/teaching-readout";
import { PotShell } from "@/components/shell/pot-shell";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  { key: "study", label: "Study" },
  { key: "removed", label: "Removed" },
] as const;
type Tab = (typeof TABS)[number]["key"];

/**
 * The ways a list here can be ordered. Kept as one list so every tab offers
 * the same vocabulary and a link can round-trip through the URL.
 */
const SORTS = {
  recent: "Newest first",
  oldest: "Oldest first",
  name: "Name A to Z",
  title: "Title A to Z",
} as const;
type Sort = keyof typeof SORTS;

function asSort(value: string | string[] | undefined, allowed: readonly Sort[]): Sort {
  const wanted = Array.isArray(value) ? value[0] : value;
  return allowed.includes(wanted as Sort) ? (wanted as Sort) : "recent";
}

/** The sort control: every option visible, the current one marked. */
function SortBar({
  options,
  current,
  href,
}: {
  options: readonly Sort[];
  current: Sort;
  href: (next: { sort?: string }) => string;
}) {
  return (
    <div className="ml-auto flex items-center gap-1.5">
      <span className="text-[12px] text-ink-faint">Sort</span>
      {options.map((option) => (
        <Link key={option} href={href({ sort: option })} aria-current={current === option ? "true" : undefined}>
          <SectionPill active={current === option}>{SORTS[option]}</SectionPill>
        </Link>
      ))}
    </div>
  );
}

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
  const sort = asSort(query.sort, ["recent", "oldest", "name", "title"]);
  const who = Array.isArray(query.who) ? query.who[0] : query.who;

  const supabase = await supabaseServer();
  const [{ data: proposals }, record, { data: studyOverview }] = await Promise.all([
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
    supabase.rpc("admin_study_overview", { p_pot_id: potId }),
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
        const byTime = (a: string, b: string) =>
          sort === "oldest"
            ? new Date(a).getTime() - new Date(b).getTime()
            : new Date(b).getTime() - new Date(a).getTime();
        const contributions = record.contributions
          .filter((c) => !who || c.authorName === who)
          .sort((a, b) => {
            if (sort === "name") return a.authorName.localeCompare(b.authorName);
            if (sort === "title") return a.title.localeCompare(b.title);
            return byTime(a.updatedAt, b.updatedAt);
          });
        const edits = [...record.edits].sort((a, b) => {
          if (sort === "title") return a.title.localeCompare(b.title);
          return byTime(a.createdAt, b.createdAt);
        });
        const removedCount =
          record.removedNotes.length + record.removedSets.length + record.removedCards.length;

        const studyRows = (Array.isArray(studyOverview) ? studyOverview : []) as Array<{
          userId: string;
          name: string;
          tests: {
            attempts: number;
            firstPass: number;
            latestFirstPass: { correct: number; total: number; at: string } | null;
          };
          flashcards: {
            runs: number;
            latest: { known: number; learning: number; at: string } | null;
          };
          lastPracticed: string | null;
        }>;
        const practicing = studyRows.filter((row) => row.lastPracticed).length;

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
                        : key === "study"
                        ? practicing
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
                  <SortBar
                    options={["recent", "oldest", "name", "title"]}
                    current={sort}
                    href={href}
                  />
                </div>
                {contributions.length === 0 ? (
                  <Card>
                    <EmptyState
                      icon={<Notebook />}
                      title="Nothing written yet"
                      body="Contributions appear here as soon as anyone starts one, draft or shared."
                      action={
                        pot.archived ? undefined : (
                          <Button href={`/p/${pot.id}/contribute`}>Add contribution</Button>
                        )
                      }
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
                  <SortBar options={["recent", "oldest", "title"]} current={sort} href={href} />
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

            {tab === "study" ? (
              <section className="space-y-3">
                <div className="space-y-0.5">
                  <p className="text-[13px] font-medium text-ink-muted">Study record</p>
                  <p className="text-[12px] text-ink-faint">
                    Practice, not grades. A score is the first pass at a test;
                    retries show separately as coming back to it. One result is
                    a result, not a trend. Members are told this page can see
                    their results. Alphabetical, because a class is not a
                    ranking.
                  </p>
                </div>
                {practicing === 0 ? (
                  <Card>
                    <EmptyState
                      icon={<Brain />}
                      title="Nobody has practiced yet"
                      body="When someone hands in a practice test or finishes a flashcard round, it shows up here."
                      action={
                        <Button href={`/p/${pot.id}/study/practice`} variant="secondary">
                          Open the practice test
                        </Button>
                      }
                    />
                  </Card>
                ) : (
                  studyRows.map((row) => (
                    <Card key={row.userId}>
                      <CardSection className="flex flex-wrap items-center justify-between gap-3 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar name={row.name} size="sm" />
                          <div className="min-w-0 space-y-0.5">
                            <p className="truncate text-sm font-medium text-ink">{row.name}</p>
                            <p className="text-[12px] text-ink-faint">
                              {row.lastPracticed
                                ? `Last practiced ${relativeTime(row.lastPracticed)}`
                                : "Has not practiced yet"}
                            </p>
                          </div>
                        </div>
                        <dl className="flex shrink-0 flex-wrap gap-x-6 gap-y-1 text-[13px]">
                          <div>
                            <dt className="text-[11px] uppercase tracking-wide text-ink-faint">Tests</dt>
                            <dd className="tabular-nums text-ink">
                              {row.tests.attempts === 0 ? (
                                <span className="text-ink-faint">None yet</span>
                              ) : row.tests.latestFirstPass ? (
                                <>
                                  {`${row.tests.latestFirstPass.correct} of ${row.tests.latestFirstPass.total}`}
                                  {/* The number is shown, and what it is worth
                                      is said beside it. Hiding the score until
                                      a second test only left a maintainer
                                      unable to see the thing they came for. */}
                                  <span className="ml-1 text-[11px] text-ink-faint">
                                    {row.tests.firstPass < 2 ? "one test so far" : `over ${row.tests.firstPass} tests`}
                                  </span>
                                </>
                              ) : (
                                <span className="text-ink-muted">Retries only</span>
                              )}
                              {row.tests.attempts > row.tests.firstPass
                                ? ` · ${row.tests.attempts - row.tests.firstPass} ${
                                    row.tests.attempts - row.tests.firstPass === 1 ? "retry" : "retries"
                                  }`
                                : ""}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[11px] uppercase tracking-wide text-ink-faint">Flashcards</dt>
                            <dd className="tabular-nums text-ink">
                              {row.flashcards.runs === 0 ? (
                                <span className="text-ink-faint">None yet</span>
                              ) : row.flashcards.latest ? (
                                `${row.flashcards.runs} ${row.flashcards.runs === 1 ? "round" : "rounds"} · latest ${row.flashcards.latest.known} known, ${row.flashcards.latest.learning} still learning`
                              ) : (
                                `${row.flashcards.runs} rounds`
                              )}
                            </dd>
                          </div>
                        </dl>
                      </CardSection>
                    </Card>
                  ))
                )}

                {/* The other half of the same tab. Above is who has practiced;
                    below is what the practice says about the material. */}
                <div className="border-t border-edge pt-6">
                  <TeachingReadout potId={pot.id} />
                </div>
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

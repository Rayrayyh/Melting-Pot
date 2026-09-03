import Link from "next/link";
import { NotePencil, Tray } from "@phosphor-icons/react/dist/ssr";
import { ClassStanding } from "@/components/contributions/class-standing";
import { ContributionJourney } from "@/components/contributions/contribution-journey";
import { ContributionStream } from "@/components/contributions/contribution-stream";
import { UserShell } from "@/components/shell/user-shell";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardSection } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionPill, StatusPill } from "@/components/ui/pills";
import { getContributionYear, getStanding } from "@/lib/data/contributions-page";
import { getOwnRecord } from "@/lib/data/streak";
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
    .select("pot_id, pots(archived_at)")
    .eq("user_id", user.id);
  const potIds = (membershipRows ?? []).map((m) => m.pot_id);
  // Every empty state below offers the next action, and an archived Pot is
  // not a place a contribution can go.
  const firstActivePotId =
    (membershipRows ?? []).find((m) => m.pots && !m.pots.archived_at)?.pot_id ?? null;
  const contributeAction = firstActivePotId ? (
    <Button href={`/p/${firstActivePotId}/contribute`}>Add contribution</Button>
  ) : (
    <Button href="/join">Join a Pot</Button>
  );

  const [sharedRows, draftRows, proposalRows, everyoneRows, year, record, standings] = await Promise.all([
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
    getContributionYear(user.id),
    getOwnRecord(user.id),
    getStanding(),
  ]);

  const yearTotal = Object.values(year.totals).reduce((a, b) => a + b, 0);
  const acceptedTotal = (proposalRows.data ?? []).filter((r) => r.status === "accepted").length;
  // A count of zero is left off rather than shown: the column says what has
  // happened, never what has not.
  const stats: Array<{ label: string; detail: string; value: string }> = [
    {
      label: "Notes shared",
      detail: "In the last 12 months",
      value: String(year.totals.share),
    },
    {
      label: "Corrections accepted",
      detail: "Merged into shared notes",
      value: String(year.totals.accepted),
    },
    {
      label: record.current > 0 ? "Days in a row" : "Longest run",
      detail:
        record.current > 0 && record.longest > record.current
          ? `Longest run ${record.longest} days`
          : "Days you shared, studied, corrected or reviewed",
      value: String(record.current > 0 ? record.current : record.longest),
    },
    {
      label: "Resources shared",
      detail: "Files and links attached to notes",
      value: String(year.totals.resource),
    },
    {
      label: "Reviews completed",
      detail: "Corrections you decided as a maintainer",
      value: String(year.totals.review),
    },
  ];
  const shown = stats.filter((stat) => stat.value !== "0");

  return (
    <UserShell>
      <div className="mx-auto w-full max-w-6xl px-6 py-10 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Contributions</h1>
          <p className="text-sm text-ink-muted">
            What you have put into your classes over the year, and what became of it.
          </p>
        </div>

        {/* The stream: twelve months, week by week, with the numbers beside it.
            The shape is the Figma file's; the words and tokens are this
            product's. Only ever the reader's own. */}
        <Card>
          <CardSection className="space-y-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-display text-xl text-ink">Contribution stream</p>
                <p className="text-[13px] text-ink-muted">
                  {yearTotal === 0
                    ? "Nothing on the stream yet. The first note you share starts it."
                    : `${yearTotal} ${yearTotal === 1 ? "contribution" : "contributions"} across notes, corrections, reviews, resources and study runs.`}
                </p>
              </div>
              <span className="rounded-full border border-edge px-3 py-1 text-[12px] text-ink-muted">
                Last 12 months
              </span>
            </div>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="min-w-0 space-y-3">
                <ContributionStream
                  days={year.days}
                  today={year.today}
                  current={record.current}
                  total={yearTotal}
                />
                <p className="inline-flex items-center gap-2 rounded-full border border-edge px-3 py-1 text-[12px] text-ink-muted">
                  <span aria-hidden className="inline-block h-3 w-2 rounded-full bg-primary" />
                  Each cluster is one week. Droplet size shows how much landed that day.
                </p>
              </div>
              <div className="space-y-2.5">
                {standings.length > 0 ? (
                  <div className="rounded-(--radius-card) border border-primary/40 bg-primary-soft px-4 py-3">
                    <p className="text-[12px] font-medium text-ink-muted">Where you stand</p>
                    <div className="mt-1.5">
                      <ClassStanding standings={standings} />
                    </div>
                  </div>
                ) : null}
                {shown.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-start justify-between gap-4 rounded-(--radius-card) border border-edge bg-surface px-4 py-3"
                  >
                    <div>
                      <p className="text-[13px] font-medium text-ink">{stat.label}</p>
                      <p className="text-[12px] text-ink-muted">{stat.detail}</p>
                    </div>
                    <p className="font-display text-2xl leading-none text-ink tabular-nums">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardSection>
        </Card>

        <Card>
          <CardSection className="space-y-4 py-5">
            <div className="space-y-1">
              <p className="font-display text-xl text-ink">Contribution journey</p>
              <p className="text-[13px] text-ink-muted">
                How a note travels from a rough draft to the class, and how it keeps
                improving after that.
              </p>
            </div>
            <ContributionJourney
              drafts={(draftRows.data ?? []).length}
              shared={(sharedRows.data ?? []).length}
              proposed={(proposalRows.data ?? []).length}
              accepted={acceptedTotal}
            />
          </CardSection>
        </Card>

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
                action={contributeAction}
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
                action={
                  firstActivePotId ? (
                    <Button href={`/p/${firstActivePotId}/contribute`}>Write a note</Button>
                  ) : (
                    <Button href="/join">Join a Pot</Button>
                  )
                }
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
                action={
                  firstActivePotId ? (
                    <Button href={`/p/${firstActivePotId}`} variant="secondary">
                      Open your Pots
                    </Button>
                  ) : (
                    <Button href="/join">Join a Pot</Button>
                  )
                }
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
                  action={contributeAction}
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

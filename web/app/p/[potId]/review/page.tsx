import Link from "next/link";
import { notFound } from "next/navigation";
import { ListChecks } from "@phosphor-icons/react/dist/ssr";
import { PotShell } from "@/components/shell/pot-shell";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardSection } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/pills";
import { supabaseServer } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/time";

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

export default async function ReviewQueuePage({ params }: PageProps<"/p/[potId]/review">) {
  const { potId } = await params;
  const supabase = await supabaseServer();
  const { data: proposals } = await supabase
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
    .order("created_at", { ascending: true });

  return (
    <PotShell potId={potId}>
      {(pot) => {
        if (pot.role === "member") notFound();
        const open = (proposals ?? []).filter((p) => p.status === "pending");
        // Settled corrections are a record rather than a queue, so they read
        // newest decision first, matching the time each row shows.
        const decided = (proposals ?? [])
          .filter((p) => p.status !== "pending")
          .sort(
            (a, b) =>
              new Date(b.decided_at ?? b.created_at).getTime() -
              new Date(a.decided_at ?? a.created_at).getTime(),
          );
        return (
          <div className="mx-auto w-full max-w-3xl px-6 py-8 space-y-6">
            <header className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
              <p className="text-sm text-ink-muted">
                Corrections proposed by members. Only a person can approve a
                change.
              </p>
            </header>

            <section className="space-y-3">
              <div className="space-y-0.5">
                <p className="text-[13px] font-medium text-ink-muted">
                  Open corrections
                </p>
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
  // The wait lives in the pill for open rows, so the meta line carries the
  // decision time only where it means something.
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
            <p className="text-[12px] text-ink-muted truncate">
              {meta.join(" · ")}
            </p>
          </div>
          <StatusPill tone={statusTone[proposal.status]} className="shrink-0">
            {isOpen
              ? `Waiting ${waitedFor(proposal.created_at)}`
              : statusLabel[proposal.status]}
          </StatusPill>
        </CardSection>
      </Card>
    </Link>
  );
}

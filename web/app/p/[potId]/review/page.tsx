import Link from "next/link";
import { notFound } from "next/navigation";
import { ListChecks } from "@phosphor-icons/react/dist/ssr";
import { PotShell } from "@/components/shell/pot-shell";
import { AvatarInitial } from "@/components/ui/avatar";
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

export default async function ReviewQueuePage({ params }: PageProps<"/p/[potId]/review">) {
  const { potId } = await params;
  const supabase = await supabaseServer();
  const { data: proposals } = await supabase
    .from("revision_proposals")
    .select(
      `id, status, created_at, decided_at,
       proposer:profiles!revision_proposals_proposer_id_fkey(display_name),
       note:shared_notes!revision_proposals_note_id_fkey(
         id, current:note_versions!shared_notes_current_version_fk(title)
       )`,
    )
    .eq("pot_id", potId)
    .order("created_at", { ascending: false });

  return (
    <PotShell potId={potId}>
      {(pot) => {
        if (pot.role === "member") notFound();
        const open = (proposals ?? []).filter((p) => p.status === "pending");
        const decided = (proposals ?? []).filter((p) => p.status !== "pending");
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
              <p className="text-[13px] font-medium text-ink-muted">
                Open corrections
              </p>
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
    proposer: { display_name: string } | null;
    note: { id: string; current: { title: string } | null } | null;
  };
}) {
  return (
    <Link href={`/p/${potId}/review/${proposal.id}`} className="block group">
      <Card className="group-hover:border-edge-strong transition-colors">
        <CardSection className="flex items-center gap-3 py-3.5">
          <AvatarInitial name={proposal.proposer?.display_name ?? "Member"} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink truncate group-hover:text-primary transition-colors">
              {proposal.note?.current?.title ?? "Shared note"}
            </p>
            <p className="text-[12px] text-ink-muted truncate">
              {proposal.proposer?.display_name ?? "A member"} &middot;{" "}
              {relativeTime(proposal.decided_at ?? proposal.created_at)}
            </p>
          </div>
          <StatusPill tone={statusTone[proposal.status]}>
            {statusLabel[proposal.status]}
          </StatusPill>
        </CardSection>
      </Card>
    </Link>
  );
}

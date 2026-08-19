import { notFound } from "next/navigation";
import { PotShell } from "@/components/shell/pot-shell";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardSection } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pills";
import { supabaseServer } from "@/lib/supabase/server";

// Interim read-only view; the full review workspace with maintainer
// decisions lands in plan step 7.
export default async function ReviewProposalPage({
  params,
}: PageProps<"/p/[potId]/review/[proposalId]">) {
  const { potId, proposalId } = await params;
  const supabase = await supabaseServer();
  const { data: proposal } = await supabase
    .from("revision_proposals")
    .select(
      `id, status, selected_text, proposed_text, explanation, source,
       proposer:profiles!revision_proposals_proposer_id_fkey(display_name),
       note:shared_notes!revision_proposals_note_id_fkey(
         id, current:note_versions!shared_notes_current_version_fk(title)
       )`,
    )
    .eq("id", proposalId)
    .eq("pot_id", potId)
    .maybeSingle();
  if (!proposal) notFound();

  return (
    <PotShell potId={potId}>
      {(pot) => (
        <div className="mx-auto w-full max-w-3xl px-6 py-8 space-y-6">
          <Breadcrumb
            crumbs={[
              { label: pot.title, href: `/p/${pot.id}` },
              { label: "Review", href: `/p/${pot.id}/review` },
              { label: proposal.note?.current?.title ?? "Proposal" },
            ]}
          />
          <header className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Correction proposal
            </h1>
            <StatusPill tone="pending">Waiting</StatusPill>
          </header>
          <Card>
            <CardSection className="space-y-4">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-removed mb-1">
                  Before
                </p>
                <p className="text-sm text-ink leading-relaxed">{proposal.selected_text}</p>
              </div>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-added mb-1">
                  After
                </p>
                <p className="text-sm text-ink leading-relaxed">{proposal.proposed_text}</p>
              </div>
              {proposal.explanation ? (
                <p className="text-sm text-ink-muted border-t border-edge pt-3">
                  {proposal.explanation}
                </p>
              ) : null}
            </CardSection>
          </Card>
          <p className="text-[13px] text-ink-muted">
            The full comparison and decision controls arrive with the
            correction workspace.
          </p>
        </div>
      )}
    </PotShell>
  );
}

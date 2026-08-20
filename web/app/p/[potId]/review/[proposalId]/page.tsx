import { notFound } from "next/navigation";
import { ProposalStatusView } from "@/components/correct/proposal-status-view";
import { ReviewWorkspace } from "@/components/correct/review-workspace";
import { PotShell } from "@/components/shell/pot-shell";
import { getProposalDetail } from "@/lib/data/proposal";

export default async function ReviewProposalPage({
  params,
}: PageProps<"/p/[potId]/review/[proposalId]">) {
  const { potId, proposalId } = await params;
  const proposal = await getProposalDetail(potId, proposalId);
  if (!proposal) notFound();

  return (
    <PotShell potId={potId}>
      {(pot) => {
        if (pot.role === "member") notFound();
        return proposal.status === "pending" ? (
          <ReviewWorkspace proposal={proposal} />
        ) : (
          <ProposalStatusView proposal={proposal} isProposer={false} />
        );
      }}
    </PotShell>
  );
}

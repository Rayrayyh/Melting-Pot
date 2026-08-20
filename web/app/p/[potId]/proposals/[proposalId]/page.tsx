import { notFound } from "next/navigation";
import { ProposalStatusView } from "@/components/correct/proposal-status-view";
import { PotShell } from "@/components/shell/pot-shell";
import { getProposalDetail } from "@/lib/data/proposal";
import { requireUser } from "@/lib/data/user";

export default async function ProposalPage({
  params,
}: PageProps<"/p/[potId]/proposals/[proposalId]">) {
  const { potId, proposalId } = await params;
  const user = await requireUser();
  const proposal = await getProposalDetail(potId, proposalId);
  if (!proposal) notFound();

  return (
    <PotShell potId={potId}>
      {() => (
        <ProposalStatusView
          proposal={proposal}
          isProposer={proposal.proposerId === user.id}
        />
      )}
    </PotShell>
  );
}

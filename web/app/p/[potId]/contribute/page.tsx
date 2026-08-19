import { ContributeFlow } from "@/components/contribute/contribute-flow";
import { PotShell } from "@/components/shell/pot-shell";

export default async function ContributePage({
  params,
}: PageProps<"/p/[potId]/contribute">) {
  const { potId } = await params;
  return (
    <PotShell potId={potId}>
      {(pot) => (
        <ContributeFlow potId={pot.id} potTitle={pot.title} sections={pot.sections} />
      )}
    </PotShell>
  );
}

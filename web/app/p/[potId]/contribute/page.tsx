import { ContributeFlow } from "@/components/contribute/contribute-flow";
import { PotShell } from "@/components/shell/pot-shell";
import { requireUser } from "@/lib/data/user";

export default async function ContributePage({
  params,
}: PageProps<"/p/[potId]/contribute">) {
  const { potId } = await params;
  const user = await requireUser();
  return (
    <PotShell potId={potId}>
      {(pot) => (
        <ContributeFlow
          potId={pot.id}
          potTitle={pot.title}
          sections={pot.sections}
          viewerName={user.displayName}
        />
      )}
    </PotShell>
  );
}

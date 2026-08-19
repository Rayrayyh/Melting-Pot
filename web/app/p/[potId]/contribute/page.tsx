import { PotShell } from "@/components/shell/pot-shell";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

// Interim page; the write-anything composer lands in plan step 6.
export default async function ContributePage({
  params,
}: PageProps<"/p/[potId]/contribute">) {
  const { potId } = await params;
  return (
    <PotShell potId={potId}>
      {() => (
        <div className="mx-auto w-full max-w-2xl px-6 py-10">
          <Card>
            <EmptyState
              title="The composer is on its way"
              body="Writing a contribution opens here."
            />
          </Card>
        </div>
      )}
    </PotShell>
  );
}

import { PotShell } from "@/components/shell/pot-shell";
import { BlurtSession } from "@/components/study/blurt-session";
import { listNoteTitles } from "@/lib/data/study";

export const metadata = { title: "Blurt" };

export default async function BlurtPage({ params }: PageProps<"/p/[potId]/study/blurt">) {
  const { potId } = await params;
  const notes = await listNoteTitles(potId);
  return (
    <PotShell potId={potId}>
      {(pot) => <BlurtSession potId={pot.id} potTitle={pot.title} notes={notes} />}
    </PotShell>
  );
}

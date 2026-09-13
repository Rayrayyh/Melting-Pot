import { PotShell } from "@/components/shell/pot-shell";
import { FeynmanSession } from "@/components/study/feynman-session";
import { listNoteTitles } from "@/lib/data/study";

export const metadata = { title: "Feynman" };

export default async function FeynmanPage({ params }: PageProps<"/p/[potId]/study/feynman">) {
  const { potId } = await params;
  const notes = await listNoteTitles(potId);
  return (
    <PotShell potId={potId}>
      {(pot) => <FeynmanSession potId={pot.id} potTitle={pot.title} notes={notes} />}
    </PotShell>
  );
}

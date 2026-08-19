import { PotFeed } from "@/components/pot/feed";
import { PotShell } from "@/components/shell/pot-shell";
import { getFeed } from "@/lib/data/pot";

export default async function PotPage({ params }: PageProps<"/p/[potId]">) {
  const { potId } = await params;
  const notes = await getFeed(potId);
  return (
    <PotShell potId={potId}>
      {(pot) => <PotFeed pot={pot} notes={notes} />}
    </PotShell>
  );
}

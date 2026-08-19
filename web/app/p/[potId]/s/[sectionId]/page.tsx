import { PotFeed } from "@/components/pot/feed";
import { PotShell } from "@/components/shell/pot-shell";
import { getFeed } from "@/lib/data/pot";

export default async function SectionPage({
  params,
}: PageProps<"/p/[potId]/s/[sectionId]">) {
  const { potId, sectionId } = await params;
  const notes = await getFeed(potId, sectionId);
  return (
    <PotShell potId={potId}>
      {(pot) => <PotFeed pot={pot} notes={notes} activeSectionId={sectionId} />}
    </PotShell>
  );
}

import { notFound } from "next/navigation";
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
      {(pot) => {
        // A deleted section leaves stale links; without this the feed would
        // render the whole-Pot empty state under a section URL, wrongly
        // implying the Pot is empty.
        if (!pot.sections.some((s) => s.id === sectionId)) notFound();
        return <PotFeed pot={pot} notes={notes} activeSectionId={sectionId} />;
      }}
    </PotShell>
  );
}

import { notFound } from "next/navigation";
import { CorrectFlow } from "@/components/correct/correct-flow";
import { PotShell } from "@/components/shell/pot-shell";
import { getNoteDetail } from "@/lib/data/pot";

export default async function CorrectPage({
  params,
}: PageProps<"/p/[potId]/n/[noteId]/correct">) {
  const { potId, noteId } = await params;
  const note = await getNoteDetail(potId, noteId);
  if (!note) notFound();

  return (
    <PotShell potId={potId}>
      {(pot) => (
        <CorrectFlow
          potId={pot.id}
          noteId={note.id}
          noteTitle={note.title}
          contributorName={note.contributorName}
          bodyText={note.bodyText}
        />
      )}
    </PotShell>
  );
}

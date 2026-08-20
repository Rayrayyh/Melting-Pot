import { notFound } from "next/navigation";
import { PotShell } from "@/components/shell/pot-shell";
import { StudyWorkspace } from "@/components/study/study-workspace";
import type { StudyKind } from "@/lib/gemini/contracts";

const KINDS = new Set<StudyKind>(["summary", "flashcards", "practice"]);

export default async function StudyPage({ params }: PageProps<"/p/[potId]/study/[kind]">) {
  const { potId, kind: requestedKind } = await params;
  if (!KINDS.has(requestedKind as StudyKind)) notFound();
  const kind = requestedKind as StudyKind;
  return (
    <PotShell potId={potId}>
      {(pot) => <StudyWorkspace potId={pot.id} potTitle={pot.title} kind={kind} />}
    </PotShell>
  );
}

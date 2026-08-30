import { notFound } from "next/navigation";
import { PotShell } from "@/components/shell/pot-shell";
import { MyStudyRecord } from "@/components/study/my-record";
import { StudyWorkspace } from "@/components/study/study-workspace";
import { listStudySets } from "@/lib/data/study";
import type { StudyKind } from "@/lib/mix/contracts";

const KINDS = new Set<StudyKind>(["summary", "flashcards", "practice"]);

export default async function StudyPage({ params }: PageProps<"/p/[potId]/study/[kind]">) {
  const { potId, kind: requestedKind } = await params;
  if (!KINDS.has(requestedKind as StudyKind)) notFound();
  const kind = requestedKind as StudyKind;
  // Read on the server so the list of what the Pot holds is there on first
  // paint, and so the payloads behind it never reach the browser.
  const savedSets = await listStudySets(potId, kind);
  return (
    <PotShell potId={potId}>
      {(pot) => (
        <>
          <StudyWorkspace
            potId={pot.id}
            potTitle={pot.title}
            kind={kind}
            sections={pot.sections}
            canModerate={pot.role === "maintainer" || pot.role === "owner"}
            savedSets={savedSets}
            archived={pot.archived}
          />
          <div className="mx-auto w-full max-w-3xl px-6 pb-10">
            <MyStudyRecord potId={pot.id} kind={kind} />
          </div>
        </>
      )}
    </PotShell>
  );
}

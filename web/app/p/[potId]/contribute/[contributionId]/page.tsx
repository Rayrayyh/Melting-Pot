import { notFound, redirect } from "next/navigation";
import { ContributeFlow } from "@/components/contribute/contribute-flow";
import { PotShell } from "@/components/shell/pot-shell";
import { supabaseServer } from "@/lib/supabase/server";

/** Resumes a draft. RLS guarantees only the author can load it. */
export default async function ResumeContributionPage({
  params,
}: PageProps<"/p/[potId]/contribute/[contributionId]">) {
  const { potId, contributionId } = await params;
  const supabase = await supabaseServer();
  const { data: contribution } = await supabase
    .from("contributions")
    .select("id, raw_text, section_id, status, shared_note_id")
    .eq("id", contributionId)
    .eq("pot_id", potId)
    .maybeSingle();
  if (!contribution) notFound();
  if (contribution.status === "shared" && contribution.shared_note_id) {
    redirect(`/p/${potId}/n/${contribution.shared_note_id}`);
  }

  return (
    <PotShell potId={potId}>
      {(pot) => (
        <ContributeFlow
          potId={pot.id}
          potTitle={pot.title}
          sections={pot.sections}
          initial={{
            id: contribution.id,
            rawText: contribution.raw_text,
            sectionId: contribution.section_id,
          }}
        />
      )}
    </PotShell>
  );
}

import { notFound, redirect } from "next/navigation";
import { ContributeFlow } from "@/components/contribute/contribute-flow";
import { PotShell } from "@/components/shell/pot-shell";
import { requireUser } from "@/lib/data/user";
import { supabaseServer } from "@/lib/supabase/server";

/** Resumes a draft. RLS guarantees only the author can load it. */
export default async function ResumeContributionPage({
  params,
}: PageProps<"/p/[potId]/contribute/[contributionId]">) {
  const { potId, contributionId } = await params;
  const user = await requireUser();
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
  if (contribution.status === "organizing") {
    // A tab closed mid-organize left this stuck; resuming returns it to draft.
    await supabase
      .from("contributions")
      .update({ status: "draft" })
      .eq("id", contribution.id);
  }

  return (
    <PotShell potId={potId}>
      {(pot) => (
        <ContributeFlow
          potId={pot.id}
          potTitle={pot.title}
          sections={pot.sections}
          viewerName={user.displayName}
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

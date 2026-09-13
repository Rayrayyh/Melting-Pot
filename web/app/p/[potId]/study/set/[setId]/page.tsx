import Link from "next/link";
import { notFound } from "next/navigation";
import { SetView } from "@/components/study/set-view";
import { getPotContext } from "@/lib/data/pot";
import type { StudyKind } from "@/lib/mix/contracts";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Saved set" };

/**
 * A permalink to one stored set: what a Classroom post, or a classmate, links
 * to. Membership is still the door, the payload still ships without keys, and
 * everything handed in is marked the same way the study pages mark it.
 */
export default async function SetPage({
  params,
}: PageProps<"/p/[potId]/study/set/[setId]">) {
  const { potId, setId } = await params;
  const pot = await getPotContext(potId);
  if (!pot) notFound();

  const supabase = await supabaseServer();
  const { data: set } = await supabase
    .from("study_sets")
    .select("kind, payload")
    .eq("id", setId)
    .eq("pot_id", potId)
    .is("removed_at", null)
    .maybeSingle();
  if (!set) notFound();

  const payload = (set.payload ?? {}) as Record<string, unknown>;
  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim()
      : "Saved set";

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-5">
      <Link href={`/p/${potId}`} className="text-[13px] text-ink-muted hover:text-ink">
        Back to {pot.title}
      </Link>
      <SetView setId={setId} kind={set.kind as StudyKind} payload={payload} />
      <p className="text-center text-[12px] text-ink-faint" aria-hidden={false}>
        {title}
      </p>
    </div>
  );
}

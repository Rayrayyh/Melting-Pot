import { PotShell } from "@/components/shell/pot-shell";
import { FocusSession } from "@/components/study/focus-session";

export const metadata = { title: "Focus" };

/**
 * A timed session with nothing to build. It earns its place beside the study
 * kinds because a focused run counts the same way they do, and because the
 * place a person goes to study is where a timer belongs.
 */
export default async function FocusPage({ params }: PageProps<"/p/[potId]/study/focus">) {
  const { potId } = await params;
  return (
    <PotShell potId={potId}>
      {(pot) => <FocusSession potId={pot.id} potTitle={pot.title} />}
    </PotShell>
  );
}

import { PotShell } from "@/components/shell/pot-shell";
import { DailyQuiz } from "@/components/study/daily-quiz";
import { MyStudyRecord } from "@/components/study/my-record";

export const metadata = { title: "Daily quiz" };

/**
 * The Pot's quiz for the day. It sits beside the study kinds rather than
 * inside them because it has no setup: the day is the configuration.
 */
export default async function DailyQuizPage({ params }: PageProps<"/p/[potId]/study/daily">) {
  const { potId } = await params;
  return (
    <PotShell potId={potId}>
      {(pot) => (
        <>
          <DailyQuiz potId={pot.id} potTitle={pot.title} />
          <div className="mx-auto w-full max-w-3xl px-6 pb-10">
            <MyStudyRecord potId={pot.id} kind="practice" attemptKind="daily" />
          </div>
        </>
      )}
    </PotShell>
  );
}

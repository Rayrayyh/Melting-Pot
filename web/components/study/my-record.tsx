import { CheckCircle, ClockCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { supabaseServer } from "@/lib/supabase/server";
import type { StudyKind } from "@/lib/mix/contracts";
import { relativeTime } from "@/lib/time";

/**
 * The reader's own study record, and nobody else's: row level security limits
 * this select to their rows before this code runs. Retries are shown as what
 * they are, and under two first passes the page says there is not enough here
 * to read anything into rather than pretending one number is a trend.
 */
export async function MyStudyRecord({
  potId,
  kind,
}: {
  potId: string;
  kind: StudyKind;
}) {
  if (kind === "summary") return null;
  const attemptKind = kind === "practice" ? "practice" : "flashcards";
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("study_attempts")
    .select("id, kind, first_pass, correct, total, known, learning, created_at")
    .eq("pot_id", potId)
    .eq("kind", attemptKind)
    .order("created_at", { ascending: false })
    .limit(12);
  const attempts = data ?? [];
  if (attempts.length === 0) return null;

  const firstPasses = attempts.filter((attempt) => attempt.first_pass);

  return (
    <section aria-label="Your record" className="space-y-3">
      <div className="space-y-1">
        <Eyebrow>Your record</Eyebrow>
        <p className="text-[12px] text-ink-faint">
          Only you and this Pot&apos;s maintainers can see this. It is practice,
          not a grade: retries count as coming back, never against you.
        </p>
      </div>
      {kind === "practice" && firstPasses.length < 2 ? (
        <p className="text-[13px] text-ink-muted">
          Not enough here to read anything into yet: trends start after a couple
          of first passes on different tests.
        </p>
      ) : null}
      <Card>
        <CardSection className="divide-y divide-edge p-0">
          {attempts.map((attempt) => (
            <div
              key={attempt.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]"
            >
              <span className="flex items-center gap-2 text-ink-muted">
                {attempt.first_pass ? (
                  <CheckCircle className="size-4 text-primary" aria-hidden />
                ) : (
                  <ClockCounterClockwise className="size-4 text-ink-faint" aria-hidden />
                )}
                {attempt.kind === "practice"
                  ? attempt.first_pass
                    ? "First pass"
                    : "Retry"
                  : attempt.first_pass
                    ? "First round"
                    : "Another round"}
              </span>
              <span className="tabular-nums text-ink">
                {attempt.kind === "practice"
                  ? `${attempt.correct ?? 0} of ${attempt.total ?? 0}`
                  : `${attempt.known ?? 0} known, ${attempt.learning ?? 0} still learning`}
              </span>
              <span className="tabular-nums text-ink-faint">
                {relativeTime(attempt.created_at)}
              </span>
            </div>
          ))}
        </CardSection>
      </Card>
    </section>
  );
}

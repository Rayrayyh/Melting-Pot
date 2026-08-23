import { Plant } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardSection } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { contributionMilestone, contributionStreak } from "@/lib/contributions/streak";
import { supabaseServer } from "@/lib/supabase/server";

function Heading() {
  return (
    <p className="flex items-center gap-2 text-sm font-semibold text-ink">
      <Plant className="size-4 text-clay" aria-hidden />
      Your contributions
    </p>
  );
}

function StatCell({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div className="rounded-(--radius-control) bg-sunken px-3 py-2.5">
      <dt className="text-[12px] text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold text-ink tabular-nums">
        {value}
        {unit ? (
          <span className="ml-1 text-[12px] font-normal text-ink-muted">{unit}</span>
        ) : null}
      </dd>
    </div>
  );
}

/**
 * A person's own record of what they have put into their Pots. Private by
 * design: nobody is ranked against anybody, and a quiet stretch costs nothing.
 */
export async function ContributionStreak({
  userId,
  contributeHref,
}: {
  userId: string;
  contributeHref?: string;
}) {
  const supabase = await supabaseServer();
  // RLS lets a member read the contributions they are entitled to see across a
  // Pot, so the author filter is what makes this the caller's own record.
  // The exact count survives the row cap, so a prolific student still sees a
  // true total even though only the recent rows feed the streak.
  const { data, count } = await supabase
    .from("contributions")
    .select("created_at", { count: "exact" })
    .eq("author_id", userId)
    .eq("status", "shared")
    .order("created_at", { ascending: false })
    .limit(400);

  const total = count ?? (data ?? []).length;

  // Someone with nothing yet gets a nudge towards writing, never a row of
  // zeroes telling them how far behind they are.
  if (total === 0) {
    return (
      <Card>
        <CardSection className="space-y-3">
          <Heading />
          <p className="text-[13px] text-ink-muted">
            Write up something from class in your own words. It stays private until
            you choose to share it.
          </p>
          {contributeHref ? (
            <Button href={contributeHref} size="sm" variant="secondary">
              Write your first note
            </Button>
          ) : null}
        </CardSection>
      </Card>
    );
  }

  // Days are cut in UTC. The server cannot read the student's zone, and one
  // steady boundary beats one that moves with whichever region rendered.
  const streak = contributionStreak(
    (data ?? []).map((row) => row.created_at),
    new Date().toISOString().slice(0, 10),
  );
  const milestone = contributionMilestone(total);
  const running = streak.current > 0;
  // A quiet stretch shows the run they already managed rather than a zero.
  const streakValue = running ? streak.current : streak.longest;

  return (
    <Card>
      <CardSection className="space-y-3.5">
        <Heading />

        <dl className={cn("grid gap-3", streak.longest > 0 && "grid-cols-2")}>
          <StatCell label="Notes shared" value={total} />
          {streak.longest > 0 ? (
            <StatCell
              label={running ? "Current streak" : "Longest streak"}
              value={streakValue}
              unit={streakValue === 1 ? "day" : "days"}
            />
          ) : null}
        </dl>

        {milestone ? (
          <div className="rounded-(--radius-control) bg-primary-soft px-3 py-2.5">
            <p className="text-[13px] font-medium text-ink">{milestone.label}</p>
            <p className="text-[12px] text-ink-muted">
              {milestone.nextAt
                ? `Next marker at ${milestone.nextAt} notes.`
                : "The last marker we keep."}
            </p>
          </div>
        ) : null}

        {streak.activeToday ? (
          <p className="text-[12px] text-ink-faint">You shared something today.</p>
        ) : null}
      </CardSection>
    </Card>
  );
}

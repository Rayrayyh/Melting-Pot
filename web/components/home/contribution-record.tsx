import { Plant } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardSection } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { contributionMilestone } from "@/lib/contributions/streak";
import type { WeekDay } from "@/lib/contributions/streak";
import { ClassStanding } from "@/components/contributions/class-standing";
import { getStanding } from "@/lib/data/contributions-page";
import { getOwnRecord } from "@/lib/data/streak";

function Heading() {
  return (
    <p className="flex items-center gap-2 text-sm font-semibold text-ink">
      <Plant className="size-4 text-clay" aria-hidden />
      Your contributions
    </p>
  );
}

function Cell({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-(--radius-control) bg-sunken px-3 py-2.5">
      <dt className="text-[12px] text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold text-ink tabular-nums">
        {value}
        {unit ? <span className="ml-1 text-[12px] font-normal text-ink-muted">{unit}</span> : null}
      </dd>
    </div>
  );
}

/** "14 Aug", from a YYYY-MM-DD, without the year the card already implies. */
function shortDate(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * The calendar week, Monday to Sunday: filled for a day that counted, ringed
 * for today, hairline for a day that did not, and dimmer for a day still
 * ahead so it never reads as a miss. No day is ever marked with a cross. To
 * assistive technology it is one picture named by the days that counted, and
 * never a score against seven.
 */
function WeekStrip({ week }: { week: WeekDay[] }) {
  const counted = week.flatMap((d, i) => (d.counted ? [DAY_NAMES[i]] : []));
  return (
    <div
      role="img"
      aria-label={`This week so far: ${counted.join(", ")}.`}
      className="flex items-end gap-1.5"
    >
      {week.map((d) => (
        <div key={d.day} className="flex flex-col items-center gap-1" aria-hidden>
          <span
            className={cn(
              "text-[10px] leading-none",
              d.today ? "font-semibold text-ink" : "text-ink-faint",
              d.future && "opacity-50",
            )}
          >
            {d.label}
          </span>
          <span
            className={cn(
              "block size-3 rounded-full",
              d.counted ? "bg-primary" : "border border-edge-strong",
              d.today && "ring-1 ring-ink ring-offset-1 ring-offset-surface",
              d.future && "opacity-40",
            )}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * A person's own record of the days they put something in or took something
 * out, and where that puts them in each class, said as what they are ahead
 * of. Nothing opens on its own, a quiet stretch shows the run they already
 * managed rather than a zero, and nobody else can read any of it. The whole
 * feature is this card; there is no moment.
 */
export async function ContributionRecord({
  userId,
  contributeHref,
}: {
  userId: string;
  contributeHref?: string;
}) {
  const [record, standings] = await Promise.all([getOwnRecord(userId), getStanding()]);
  const compared = standings.filter((s) => s.size > 1);
  const { current, longest, activeToday, notesShared, week, weekAt, monthAt } = record;

  // Someone with nothing yet gets a nudge towards writing, never a row of
  // zeroes telling them how far behind they are.
  if (longest === 0 && notesShared === 0) {
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

  const running = current > 0;
  const shown = running ? current : longest;
  const milestone = contributionMilestone(notesShared);
  // A week with nothing in it yet is left off rather than drawn empty.
  const showWeek = week.some((d) => d.counted);

  return (
    <Card>
      <CardSection className="space-y-3.5">
        <Heading />

        {longest > 0 ? (
          <div className="flex items-end justify-between gap-4">
            <p className="text-ink">
              <span className="font-display text-3xl font-semibold leading-none tabular-nums">
                {shown}
              </span>
              <span className="ml-1.5 text-[13px] text-ink-muted">
                {running
                  ? shown === 1
                    ? "day so far"
                    : "days in a row"
                  : `${shown === 1 ? "day" : "days"}, your longest run`}
              </span>
            </p>
            {showWeek ? <WeekStrip week={week} /> : null}
          </div>
        ) : null}

        {compared.length > 0 ? (
          <div className="space-y-0.5">
            <ClassStanding standings={compared.slice(0, 2)} compact />
            {compared.length > 2 ? (
              <p className="text-[12px] text-ink-faint">
                And {compared.length - 2} more {compared.length - 2 === 1 ? "class" : "classes"} on your Contributions page.
              </p>
            ) : null}
          </div>
        ) : null}

        {notesShared > 0 || (running && longest > current) || weekAt || monthAt ? (
          <dl className="grid grid-cols-2 gap-3">
            {notesShared > 0 ? <Cell label="Notes shared" value={notesShared} /> : null}
            {running && longest > current ? (
              <Cell label="Longest run" value={longest} unit="days" />
            ) : null}
            {weekAt ? <Cell label="First week in a row" value={shortDate(weekAt)} /> : null}
            {monthAt ? <Cell label="First month in a row" value={shortDate(monthAt)} /> : null}
          </dl>
        ) : null}

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

        {activeToday ? (
          <p className="text-[12px] text-ink-faint">Today is on your record. Only you see this.</p>
        ) : null}
      </CardSection>
    </Card>
  );
}

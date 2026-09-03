import type { ReactNode } from "react";
import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { UserShell } from "@/components/shell/user-shell";
import { Button } from "@/components/ui/button";
import { Card, CardSection } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getMonthEntries } from "@/lib/data/calendar";
import { supabaseServer } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";

export const metadata = { title: "Calendar" };

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthName(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * A record of what the class shared, by day.
 *
 * Deliberately not a planner. Nothing in this product has a due date, so a
 * calendar that invited you to add one would be promising something the rest
 * of the app cannot keep. Every square here is a note that really exists.
 */
export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.y) || now.getUTCFullYear();
  const month = Number.isFinite(Number(params.m)) && params.m !== undefined
    ? Number(params.m)
    : now.getUTCMonth();

  const entries = await getMonthEntries(year, month);
  const viewingCurrentMonth =
    year === now.getUTCFullYear() && month === now.getUTCMonth();

  // An empty month still offers the next action: back to today when browsing
  // history, or the first place a note could actually be written. The
  // memberships read is RLS scoped to the caller.
  let emptyAction: ReactNode = null;
  if (entries.length === 0) {
    if (!viewingCurrentMonth) {
      emptyAction = (
        <Button href="/calendar" variant="secondary">
          Back to this month
        </Button>
      );
    } else {
      const supabase = await supabaseServer();
      const { data: memberships } = await supabase
        .from("memberships")
        .select("pot_id, pots(archived_at)");
      const firstActivePotId =
        (memberships ?? []).find((m) => m.pots && !m.pots.archived_at)?.pot_id ?? null;
      emptyAction = firstActivePotId ? (
        <Button href={`/p/${firstActivePotId}/contribute`}>Add contribution</Button>
      ) : (
        <Button href="/join">Join a Pot</Button>
      );
    }
  }

  const byDay = new Map<number, typeof entries>();
  for (const entry of entries) {
    const day = new Date(entry.sharedAt).getUTCDate();
    byDay.set(day, [...(byDay.get(day) ?? []), entry]);
  }

  const first = new Date(Date.UTC(year, month, 1));
  // Monday-first, so the weekend sits together at the end of the row.
  const lead = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };
  const isToday = (day: number) =>
    now.getUTCFullYear() === year && now.getUTCMonth() === month && now.getUTCDate() === day;

  return (
    <UserShell>
      <div className="mx-auto w-full max-w-4xl px-6 py-12 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">{monthName(year, month)}</h1>
            <p className="text-sm text-ink-muted">
              When your classes shared notes. Every square is a note that exists.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href={`/calendar?y=${prev.y}&m=${prev.m}`}
              aria-label="Previous month"
              className="inline-flex size-9 items-center justify-center rounded-(--radius-control) border border-edge-strong text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
            >
              <CaretLeft className="size-4" aria-hidden />
            </Link>
            <Link
              href={`/calendar?y=${next.y}&m=${next.m}`}
              aria-label="Next month"
              className="inline-flex size-9 items-center justify-center rounded-(--radius-control) border border-edge-strong text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
            >
              <CaretRight className="size-4" aria-hidden />
            </Link>
          </div>
        </header>

        <Card>
          <CardSection>
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_LABELS.map((d) => (
                <div key={d} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  {d}
                </div>
              ))}
              {cells.map((day, i) => {
                const dayEntries = day ? byDay.get(day) ?? [] : [];
                return (
                  <div
                    key={i}
                    className={cn(
                      "min-h-16 rounded-(--radius-control) border p-1.5 text-left",
                      day === null
                        ? "border-transparent"
                        : dayEntries.length > 0
                          ? "border-edge bg-sunken"
                          : "border-edge",
                      day !== null && isToday(day) && "border-primary",
                    )}
                  >
                    {day === null ? null : (
                      <>
                        <span
                          className={cn(
                            "text-[12px] tabular-nums",
                            isToday(day) ? "font-semibold text-primary" : "text-ink-muted",
                          )}
                        >
                          {day}
                        </span>
                        {dayEntries.length > 0 ? (
                          <span className="mt-1 block text-[11px] leading-tight text-ink">
                            {dayEntries.length} {dayEntries.length === 1 ? "note" : "notes"}
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardSection>
        </Card>

        {entries.length === 0 ? (
          <Card>
            <EmptyState
              title="Nothing shared this month"
              body="When your class shares a note, the day it landed shows up here."
              action={emptyAction ?? undefined}
            />
          </Card>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li key={entry.noteId}>
                <Link href={`/p/${entry.potId}/n/${entry.noteId}`} className="mp-lift group block">
                  <Card className="group-hover:border-edge-strong transition-colors">
                    <CardSection className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink group-hover:text-primary">
                          {entry.title}
                        </p>
                        <p className="text-[12px] text-ink-faint">
                          {entry.contributorName} &middot; {entry.potTitle}
                        </p>
                      </div>
                      <span className="shrink-0 text-[12px] tabular-nums text-ink-muted">
                        {new Date(entry.sharedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          timeZone: "UTC",
                        })}
                      </span>
                    </CardSection>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </UserShell>
  );
}

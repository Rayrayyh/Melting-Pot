import { cn } from "@/lib/cn";

type Step = { pill: string; title: string; body: string; count?: number; unit?: string };

/**
 * How a contribution travels, in this product's own words rather than the
 * Figma file's: rough note, organized beside the original, approved by the
 * writer, shared, corrected by classmates, decided by a maintainer. The
 * person's own counts sit on the steps that have any, so the band is a
 * record as well as an explanation. The last step is the one lit, because
 * it is where the work ends up.
 */
export function ContributionJourney({
  drafts,
  shared,
  proposed,
  accepted,
}: {
  drafts: number;
  shared: number;
  proposed: number;
  accepted: number;
}) {
  const steps: Step[] = [
    { pill: "Rough", title: "Write it as it comes", body: "No formatting, no structure. What you know, the way you would say it." },
    { pill: "Organized", title: "Structured beside the original", body: "The organizer arranges it and keeps anything you were unsure of marked. Your original stays exactly as written." },
    { pill: "Yours", title: "You approve it", body: "Nothing reaches the class until you say so.", count: drafts, unit: "in progress" },
    { pill: "Shared", title: "In the class notes", body: "Live, credited to you, alongside everyone else's.", count: shared, unit: "shared" },
    { pill: "Proposed", title: "Corrections go in", body: "Anyone in the class can propose a fix to a shared note.", count: proposed, unit: "sent" },
    { pill: "Reviewed", title: "A maintainer decides", body: "Accepted corrections update the note and credit both people in its history.", count: accepted, unit: "accepted" },
  ];
  return (
    <div className="space-y-4">
      <div className="relative">
        <span aria-hidden className="absolute left-[8%] right-[8%] top-[7px] hidden h-px bg-edge-strong xl:block" />
        <ol className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {steps.map((step, i) => {
          const last = i === steps.length - 1;
          return (
            <li key={step.pill} className="flex flex-col items-stretch gap-3">
              <span
                aria-hidden
                className={cn(
                  "relative mx-auto hidden size-3.5 rounded-full xl:block",
                  i === steps.length - 2 ? "bg-primary/50" : "bg-primary",
                )}
                style={last ? { background: "var(--primary-active)" } : undefined}
              />
              <div
                className={cn(
                  "flex h-full flex-col gap-2 rounded-(--radius-card) border p-4",
                  last ? "border-primary/40 bg-primary-soft" : "border-edge bg-surface",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-sunken px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                    {step.pill}
                  </span>
                  {step.count !== undefined && step.count > 0 ? (
                    <span className="text-[11px] tabular-nums text-ink-faint">
                      {step.count} {step.unit}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm font-semibold text-ink">{step.title}</p>
                <p className="text-[12px] leading-relaxed text-ink-muted">{step.body}</p>
              </div>
            </li>
          );
        })}
        </ol>
      </div>
      <p className="inline-flex flex-wrap items-center gap-2 rounded-full bg-sunken px-3 py-1.5 text-[12px] text-ink-muted">
        <span className="font-medium text-ink">Revision loop</span>
        Revision requested? Edit the proposal and send the same one back for review.
      </p>
    </div>
  );
}

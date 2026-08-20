import { Card, CardSection } from "@/components/ui/card";
import type { ProposalDetail } from "@/lib/data/proposal";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/cn";

const KIND_LABEL: Record<string, string> = {
  submitted: "sent the proposal",
  edited: "edited the proposal",
  resubmitted: "resubmitted after feedback",
  accepted: "accepted the change",
  revision_requested: "requested a revision",
  declined: "declined the proposal",
  comment: "commented",
};

const KIND_TONE: Record<string, string> = {
  accepted: "bg-success",
  revision_requested: "bg-warning",
  declined: "bg-danger",
};

/** The discussion and decision history; nothing here is ever deleted. */
export function ProposalTimeline({ events }: { events: ProposalDetail["events"] }) {
  if (events.length === 0) return null;
  return (
    <Card>
      <CardSection className="space-y-0.5">
        <p className="text-sm font-semibold text-ink pb-2">History</p>
        <ol className="space-y-3">
          {events.map((event) => (
            <li key={event.id} className="flex gap-3">
              <span
                aria-hidden
                className={cn(
                  "mt-1.5 size-2 rounded-full shrink-0",
                  KIND_TONE[event.kind] ?? "bg-ink-faint",
                )}
              />
              <div className="min-w-0 space-y-0.5">
                <p className="text-[13px] text-ink">
                  <span className="font-medium">{event.actorName}</span>{" "}
                  {KIND_LABEL[event.kind] ?? event.kind}
                  <span className="text-ink-faint"> &middot; {relativeTime(event.createdAt)}</span>
                </p>
                {event.body ? (
                  <p className="text-[13px] text-ink-muted border-l-2 border-edge pl-2.5">
                    {event.body}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </CardSection>
    </Card>
  );
}

import Link from "next/link";
import {
  ListChecks,
  NotePencil,
  PencilSimpleLine,
} from "@phosphor-icons/react/dist/ssr";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pills";
import type {
  DraftItem,
  ReviewQueueItem,
  RevisionRequestedItem,
} from "@/lib/data/dashboard";
import { relativeTime } from "@/lib/time";

/** Maintainer lead module: corrections pending across every maintained Pot. */
export function ReviewQueueModule({ items }: { items: ReviewQueueItem[] }) {
  if (items.length === 0) return null;
  return (
    <Card className="border-pending/30">
      <CardSection className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ListChecks className="size-4 text-pending" aria-hidden />
              Waiting on your review
            </p>
            <StatusPill tone="pending">
              {items.length} open {items.length === 1 ? "correction" : "corrections"}
            </StatusPill>
          </div>
          {items.length > 1 ? (
            <p className="text-[12px] text-ink-faint">
              Oldest first, so nobody waits twice as long as anyone else.
            </p>
          ) : null}
        </div>
        <ul className="divide-y divide-edge">
          {items.slice(0, 4).map((item) => (
            <li key={item.proposalId}>
              <Link
                href={`/p/${item.potId}/review/${item.proposalId}`}
                className="flex items-center gap-3 py-2.5 group"
              >
                <Avatar name={item.proposerName} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ink truncate group-hover:text-primary transition-colors">
                    {item.noteTitle}
                  </span>
                  <span className="block text-[12px] text-ink-muted truncate">
                    {item.proposerName} &middot; {item.potTitle} &middot;{" "}
                    {relativeTime(item.createdAt)}
                  </span>
                </span>
                {/* The proposer's own reason is the fastest read on what the
                    correction is about, so it gets its own slot rather than a
                    fourth clause on a truncating line. */}
                {item.reason ? (
                  <span className="hidden sm:block shrink-0">
                    <StatusPill tone="neutral">{item.reason}</StatusPill>
                  </span>
                ) : null}
                <span className="text-[12px] font-medium text-primary shrink-0">
                  Review
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardSection>
    </Card>
  );
}

/** Member module: proposals returned with feedback, editable in place. */
export function RevisionRequestedModule({ items }: { items: RevisionRequestedItem[] }) {
  if (items.length === 0) return null;
  return (
    <Card className="border-warning/30">
      <CardSection className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <PencilSimpleLine className="size-4 text-warning" aria-hidden />
          Your proposals need edits
        </p>
        <ul className="divide-y divide-edge">
          {items.slice(0, 3).map((item) => (
            <li key={item.proposalId}>
              <Link
                href={`/p/${item.potId}/proposals/${item.proposalId}`}
                className="flex items-center gap-3 py-2.5 group"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ink truncate group-hover:text-primary transition-colors">
                    {item.noteTitle}
                  </span>
                  <span className="block text-[12px] text-ink-muted truncate">
                    {item.feedback
                      ? `"${item.feedback}"`
                      : `Revision requested in ${item.potTitle}`}
                  </span>
                </span>
                <StatusPill tone="warning">Revision requested</StatusPill>
              </Link>
            </li>
          ))}
        </ul>
      </CardSection>
    </Card>
  );
}

/**
 * A blank draft and an organized one waiting on approval both sit in this list,
 * and only the first needs writing, so each row names its own state.
 */
const draftState = {
  draft: { tone: "neutral", label: "Still writing" },
  organizing: { tone: "pending", label: "Organizing" },
  ready_to_review: { tone: "clay", label: "Ready to review" },
  failed: { tone: "warning", label: "Needs another try" },
} as const;

/** Member module: unfinished contributions, resumable in one tap. */
export function DraftsModule({ items }: { items: DraftItem[] }) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardSection className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <NotePencil className="size-4 text-clay" aria-hidden />
          Pick up where you left off
        </p>
        <ul className="divide-y divide-edge">
          {items.slice(0, 3).map((item) => (
            <li key={item.contributionId}>
              <Link
                href={`/p/${item.potId}/contribute/${item.contributionId}`}
                className="flex items-center gap-3 py-2.5 group"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 truncate text-sm text-ink group-hover:text-primary transition-colors">
                      {item.excerpt || "Untitled draft"}
                    </span>
                    <StatusPill tone={draftState[item.status].tone} className="shrink-0">
                      {draftState[item.status].label}
                    </StatusPill>
                  </span>
                  <span className="block text-[12px] text-ink-muted truncate">
                    {item.potTitle} &middot; {relativeTime(item.updatedAt)}
                  </span>
                </span>
                <span className="text-[12px] font-medium text-primary shrink-0">
                  {item.status === "ready_to_review" ? "Review and share" : "Resume draft"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Eyebrow>Drafts stay private until you share them</Eyebrow>
      </CardSection>
    </Card>
  );
}

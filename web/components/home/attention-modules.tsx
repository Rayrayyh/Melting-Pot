import Link from "next/link";
import {
  ListChecks,
  NotePencil,
  PencilSimpleLine,
} from "@phosphor-icons/react/dist/ssr";
import { AvatarInitial } from "@/components/ui/avatar";
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
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ListChecks className="size-4 text-pending" aria-hidden />
            Waiting on your review
          </p>
          <StatusPill tone="pending">
            {items.length} open {items.length === 1 ? "correction" : "corrections"}
          </StatusPill>
        </div>
        <ul className="divide-y divide-edge">
          {items.slice(0, 4).map((item) => (
            <li key={item.proposalId}>
              <Link
                href={`/p/${item.potId}/review/${item.proposalId}`}
                className="flex items-center gap-3 py-2.5 group"
              >
                <AvatarInitial name={item.proposerName} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ink truncate group-hover:text-primary transition-colors">
                    {item.noteTitle}
                  </span>
                  <span className="block text-[12px] text-ink-muted truncate">
                    {item.proposerName} &middot; {item.potTitle} &middot;{" "}
                    {relativeTime(item.createdAt)}
                  </span>
                </span>
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
                  <span className="block text-sm text-ink truncate group-hover:text-primary transition-colors">
                    {item.excerpt || "Untitled draft"}
                  </span>
                  <span className="block text-[12px] text-ink-muted truncate">
                    {item.potTitle} &middot; {relativeTime(item.updatedAt)}
                  </span>
                </span>
                <span className="text-[12px] font-medium text-primary shrink-0">
                  Resume draft
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

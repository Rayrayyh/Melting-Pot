import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardSection } from "@/components/ui/card";
import type { ActivityItem } from "@/lib/data/dashboard";
import { relativeTime } from "@/lib/time";

/** Latest shared notes across every Pot the user belongs to. */
export function ActivityList({
  items,
  contributeHref,
}: {
  items: ActivityItem[];
  /** Where a first note could be written; the empty state offers it. */
  contributeHref?: string;
}) {
  // R44: a panel with nothing in it says so. Returning null left a hole in the
  // sidebar and no explanation for it, so a class that had not shared yet just
  // saw the join card sitting on its own and no reason why.
  if (items.length === 0) {
    return (
      <Card>
        <CardSection className="space-y-1.5">
          <p className="text-sm font-semibold text-ink">New in your Pots</p>
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Nothing shared yet. Notes your class shares will appear here as they
            land.
          </p>
          {contributeHref ? (
            <div className="pt-1.5">
              <Button href={contributeHref} variant="secondary" size="sm">
                Add contribution
              </Button>
            </div>
          ) : null}
        </CardSection>
      </Card>
    );
  }
  return (
    <Card>
      <CardSection className="space-y-3">
        <p className="text-sm font-semibold text-ink">New in your Pots</p>
        <ul className="divide-y divide-edge">
          {items.map((item) => (
            <li key={item.noteId}>
              <Link
                href={`/p/${item.potId}/n/${item.noteId}`}
                className="flex items-start gap-2.5 py-2.5 group"
              >
                <Avatar name={item.contributorName} size="sm" className="mt-0.5" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-ink leading-snug group-hover:text-primary transition-colors line-clamp-2 break-words">
                    {item.title}
                  </span>
                  <span className="block text-[12px] text-ink-muted truncate">
                    {item.contributorName} &middot; {item.potTitle} &middot;{" "}
                    {relativeTime(item.sharedAt)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardSection>
    </Card>
  );
}

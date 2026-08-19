import Link from "next/link";
import { AvatarInitial } from "@/components/ui/avatar";
import { Card, CardSection } from "@/components/ui/card";
import type { ActivityItem } from "@/lib/data/dashboard";
import { relativeTime } from "@/lib/time";

/** Latest shared notes across every Pot the user belongs to. */
export function ActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;
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
                <AvatarInitial name={item.contributorName} size="sm" className="mt-0.5" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-ink leading-snug group-hover:text-primary transition-colors">
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

import Link from "next/link";
import { ArrowRight, ChatCircleText, Notebook, Users } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { RolePill } from "@/components/ui/pills";
import type { DashboardPot } from "@/lib/data/dashboard";
import { relativeTime } from "@/lib/time";

export function PotStatCard({ pot }: { pot: DashboardPot }) {
  const continueHref = pot.continueNoteId
    ? `/p/${pot.id}/n/${pot.continueNoteId}`
    : `/p/${pot.id}`;
  return (
    <Card className="h-full flex flex-col hover:border-edge-strong transition-colors">
      <div className="p-5 flex-1 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/p/${pot.id}`}
            className="min-w-0 flex-1 font-semibold text-ink leading-snug hover:text-primary transition-colors break-words"
          >
            {pot.title}
          </Link>
          <RolePill role={pot.role} />
        </div>
        <div className="flex items-center gap-4 text-[12px] text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" aria-hidden />
            {pot.memberCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Notebook className="size-3.5" aria-hidden />
            {pot.noteCount} {pot.noteCount === 1 ? "note" : "notes"}
          </span>
          {pot.openProposalCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-pending">
              <ChatCircleText className="size-3.5" aria-hidden />
              {pot.openProposalCount} open
            </span>
          ) : null}
        </div>
        {pot.lastActivityAt ? (
          <p className="text-[12px] text-ink-faint">
            Last shared {relativeTime(pot.lastActivityAt)}
          </p>
        ) : (
          <p className="text-[12px] text-ink-faint">No notes yet</p>
        )}
      </div>
      <Link
        href={continueHref}
        className="flex items-center justify-between gap-2 border-t border-edge px-5 py-3 text-[13px] font-medium text-primary hover:bg-primary-soft/50 transition-colors rounded-b-(--radius-card)"
      >
        <span className="truncate">
          {pot.continueNoteTitle ? `Continue: ${pot.continueNoteTitle}` : "Open the feed"}
        </span>
        <ArrowRight className="size-4 shrink-0" aria-hidden />
      </Link>
    </Card>
  );
}

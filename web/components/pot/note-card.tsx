import Link from "next/link";
import { ChatCircleText, Paperclip } from "@phosphor-icons/react/dist/ssr";
import { AvatarInitial } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pills";
import type { FeedNote } from "@/lib/data/pot";
import { relativeTime } from "@/lib/time";

export function NoteCard({ potId, note }: { potId: string; note: FeedNote }) {
  return (
    <Card className="hover:border-edge-strong transition-colors">
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/p/${potId}/n/${note.id}`}
            className="min-w-0 flex-1 font-semibold text-ink leading-snug hover:text-primary transition-colors break-words"
          >
            {note.title}
          </Link>
          {note.versionCount > 1 ? (
            <StatusPill tone="primary">v{note.versionCount}</StatusPill>
          ) : null}
        </div>
        {note.summary ? (
          <p className="text-sm text-ink-muted leading-relaxed line-clamp-2">
            {note.summary}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 min-w-0 text-[12px] text-ink-muted">
            <AvatarInitial name={note.contributorName} size="sm" />
            <span className="truncate">{note.contributorName}</span>
            <span aria-hidden className="text-ink-faint">&middot;</span>
            <span className="shrink-0">{relativeTime(note.sharedAt)}</span>
            {note.sectionTitle ? (
              <>
                <span aria-hidden className="text-ink-faint">&middot;</span>
                <span className="truncate text-ink-faint">{note.sectionTitle}</span>
              </>
            ) : null}
            {note.attachmentCount > 0 ? (
              <span className="inline-flex items-center gap-0.5 shrink-0 text-ink-faint">
                <Paperclip className="size-3.5" aria-hidden />
                {note.attachmentCount}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3 shrink-0 text-[12px]">
            <Link
              href={`/p/${potId}/n/${note.id}/correct`}
              className="inline-flex items-center gap-1 text-ink-faint hover:text-ink transition-colors"
            >
              <ChatCircleText className="size-3.5" aria-hidden />
              Suggest correction
            </Link>
            <Link
              href={`/p/${potId}/n/${note.id}`}
              className="font-medium text-primary hover:underline"
            >
              Open
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

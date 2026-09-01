import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChatCircleText,
  ClockCounterClockwise,
  DownloadSimple,
  EyeSlash,
  LinkSimple,
  Paperclip,
} from "@phosphor-icons/react/dist/ssr";
import { NoteBody, TakeawaysCard } from "@/components/pot/note-body";
import { NoteCards } from "@/components/pot/note-cards";
import { NoteModeration } from "@/components/pot/note-moderation";
import { NoteView } from "@/components/pot/note-view";
import { RecordView } from "@/components/pot/record-view";
import { SelectionToCard } from "@/components/pot/selection-to-card";
import { PotShell } from "@/components/shell/pot-shell";
import { AttributionRow } from "@/components/ui/avatar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardSection } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pills";
import { getNoteDetail, getNoteFlashcards } from "@/lib/data/pot";
import { relativeTime } from "@/lib/time";

export default async function NotePage({ params }: PageProps<"/p/[potId]/n/[noteId]">) {
  const { potId, noteId } = await params;
  const [note, cards] = await Promise.all([
    getNoteDetail(potId, noteId),
    getNoteFlashcards(potId, noteId),
  ]);
  if (!note) notFound();

  return (
    <PotShell potId={potId}>
      {(pot) => {
        const canModerate = pot.role === "maintainer" || pot.role === "owner";
        return (
          <div className="mx-auto w-full max-w-3xl px-6 py-8 space-y-6">
            <RecordView potId={pot.id} noteId={note.id} />
            <Breadcrumb
              crumbs={[
                { label: pot.title, href: `/p/${pot.id}` },
                ...(note.sectionTitle && note.sectionId
                  ? [{ label: note.sectionTitle, href: `/p/${pot.id}/s/${note.sectionId}` }]
                  : []),
                { label: note.title },
              ]}
            />

            {note.removedAt ? (
              <div className="rounded-(--radius-card) border border-warning/30 bg-warning-soft px-5 py-4 space-y-1.5">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-warning">
                  <EyeSlash className="size-4" aria-hidden />
                  Removed from the Pot
                </p>
                <p className="text-sm text-ink">
                  {note.removedReason || "No reason was given."}
                </p>
                <p className="text-[12px] text-ink-muted">
                  {note.removedByName ? `Removed by ${note.removedByName}. ` : ""}
                  It is out of the feed, out of search, and out of study material.
                  Nothing was deleted: every version and everyone credited is still
                  on the record.
                </p>
              </div>
            ) : null}

            <header className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-semibold tracking-tight leading-tight">
                  {note.title}
                </h1>
                {note.versionNumber > 1 ? (
                  <StatusPill tone="primary">Version {note.versionNumber}</StatusPill>
                ) : null}
              </div>
              {note.summary ? (
                <p className="text-[15px] text-ink-muted leading-relaxed">{note.summary}</p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3 border-y border-edge py-3">
                <AttributionRow
                  name={note.contributorName}
                  meta={`Shared ${relativeTime(note.sharedAt)}${
                    note.correctionContributorName
                      ? ` · corrected by ${note.correctionContributorName}`
                      : ""
                  }`}
                  size="sm"
                />
                {/* Wraps so the owner's third action (Remove) never pushes the
                    row past a phone's edge. */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="quiet"
                    size="sm"
                    href={`/p/${pot.id}/n/${note.id}/history`}
                  >
                    <ClockCounterClockwise className="size-4" />
                    History
                  </Button>
                  {/* A note that is out of the Pot is not something to correct
                      until someone puts it back. */}
                  {note.removedAt ? null : (
                    <Button
                      variant="secondary"
                      size="sm"
                      href={`/p/${pot.id}/n/${note.id}/correct`}
                    >
                      <ChatCircleText className="size-4" />
                      Suggest correction
                    </Button>
                  )}
                  {canModerate ? (
                    <NoteModeration noteId={note.id} removed={Boolean(note.removedAt)} />
                  ) : null}
                </div>
              </div>
            </header>

            <NoteView
              rawText={note.rawText}
              organized={
                <div className="space-y-6">
                  {/* Selecting a passage offers to turn it into a card, so the
                      note is somewhere to study from and not only to read. */}
                  <SelectionToCard potId={pot.id} noteId={note.id}>
                    <NoteBody blocks={note.body} />
                  </SelectionToCard>
                  <TakeawaysCard takeaways={note.takeaways} />
                  {note.attachments.length > 0 ? (
                    <Card>
                      <CardSection className="space-y-2.5">
                        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                          <Paperclip className="size-4" aria-hidden />
                          Attachments
                        </p>
                        {note.attachments.map((attachment) => (
                          <AttachmentRow
                            key={attachment.id}
                            name={attachment.name}
                            kind={attachment.kind}
                            url={attachment.url}
                            storagePath={attachment.storagePath}
                            aiCaption={attachment.aiCaption}
                            aiExtractedText={attachment.aiExtractedText}
                          />
                        ))}
                      </CardSection>
                    </Card>
                  ) : null}
                </div>
              }
            />

            <NoteCards cards={cards} canModerate={canModerate} />

            <p className="text-center text-[12px] text-ink-faint pt-4">
              Built from notes shared in this Pot. The original is always
              preserved alongside every version.
            </p>
          </div>
        );
      }}
    </PotShell>
  );
}

function AttachmentRow({
  name,
  kind,
  url,
  storagePath,
  aiCaption,
  aiExtractedText,
}: {
  name: string;
  kind: string;
  url: string | null;
  storagePath: string | null;
  aiCaption: string | null;
  aiExtractedText: string | null;
}) {
  const href =
    url ??
    (storagePath
      ? `/api/attachments/${storagePath.split("/").map(encodeURIComponent).join("/")}`
      : null);
  const icon =
    kind === "link" ? (
      <LinkSimple className="size-4 text-ink-faint" aria-hidden />
    ) : (
      <DownloadSimple className="size-4 text-ink-faint" aria-hidden />
    );
  if (!href) {
    return <AttachmentDescription icon={icon} name={name} aiCaption={aiCaption} aiExtractedText={aiExtractedText} />;
  }
  return (
    <div className="space-y-1">
      <Link
        href={href}
        target={kind === "link" ? "_blank" : undefined}
        rel={kind === "link" ? "noopener noreferrer" : undefined}
        className="flex items-center gap-2 text-sm text-ink hover:text-primary transition-colors"
      >
        {icon}
        <span className="truncate">{name}</span>
      </Link>
      {aiCaption ? <p className="pl-6 text-[12px] text-ink-muted">{aiCaption}</p> : null}
      {aiExtractedText ? (
        <details className="pl-6 text-[12px] text-ink-muted">
          <summary className="cursor-pointer">Text found in image</summary>
          <p className="mt-1 whitespace-pre-wrap">{aiExtractedText}</p>
        </details>
      ) : null}
    </div>
  );
}

function AttachmentDescription({ icon, name, aiCaption, aiExtractedText }: {
  icon: React.ReactNode;
  name: string;
  aiCaption: string | null;
  aiExtractedText: string | null;
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-2 text-sm text-ink-muted">{icon}{name}</p>
      {aiCaption ? <p className="pl-6 text-[12px] text-ink-muted">{aiCaption}</p> : null}
      {aiExtractedText ? <p className="pl-6 whitespace-pre-wrap text-[12px] text-ink-muted">{aiExtractedText}</p> : null}
    </div>
  );
}

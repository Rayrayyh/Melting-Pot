import Link from "next/link";
import { Plus, Tray } from "@phosphor-icons/react/dist/ssr";
import { NoteCard } from "@/components/pot/note-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionPill } from "@/components/ui/pills";
import type { FeedNote, PotContext } from "@/lib/data/pot";

export function PotFeed({
  pot,
  notes,
  activeSectionId,
}: {
  pot: PotContext;
  notes: FeedNote[];
  activeSectionId?: string;
}) {
  const activeSection = activeSectionId
    ? pot.sections.find((s) => s.id === activeSectionId)
    : undefined;
  const isMaintainer = pot.role !== "member";

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-8">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          {activeSection ? activeSection.title : pot.title}
        </h1>
        {!activeSection && pot.description ? (
          <p className="text-sm text-ink-muted">{pot.description}</p>
        ) : null}
      </header>

      {!activeSection ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Contributors" value={pot.memberCount} />
          <MetricCard label="Shared notes" value={pot.noteCount} />
          <MetricCard
            label="Open corrections"
            value={pot.openProposalCount}
            tone={pot.openProposalCount > 0 ? "attention" : "default"}
            href={isMaintainer ? `/p/${pot.id}/review` : undefined}
          />
          <MetricCard
            label="Class code"
            value={<span className="font-mono tracking-[0.12em]">{pot.classCode}</span>}
            accessory={<CopyButton value={pot.classCode} label="Copy" />}
          />
        </div>
      ) : null}

      {pot.sections.length > 0 ? (
        <nav aria-label="Sections" className="flex flex-wrap gap-2">
          <Link href={`/p/${pot.id}`}>
            <SectionPill active={!activeSection}>All sections</SectionPill>
          </Link>
          {pot.sections.map((section) => (
            <Link key={section.id} href={`/p/${pot.id}/s/${section.id}`}>
              <SectionPill active={activeSectionId === section.id}>
                {section.title}
              </SectionPill>
            </Link>
          ))}
        </nav>
      ) : null}

      {notes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Tray />}
            title={activeSection ? "Nothing in this section yet" : "Nothing in the pot yet"}
            body={
              pot.archived
                ? "This Pot is archived, so nothing new is being added."
                : "Be the first. Write it however it comes to you."
            }
            action={
              pot.archived ? undefined : (
                <Button href={`/p/${pot.id}/contribute`}>
                  <Plus className="size-4" />
                  Add contribution
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-ink-muted">
              {activeSection ? "Notes in this section" : "Latest shared notes"}
            </p>
            {pot.archived ? null : (
              // The left nav already carries the primary contribute button on
              // large screens; repeating it here only adds noise. Below lg
              // the nav is in a drawer, so the feed keeps its own.
              <Button href={`/p/${pot.id}/contribute`} size="sm" className="lg:hidden">
                <Plus className="size-4" />
                Add contribution
              </Button>
            )}
          </div>
          {notes.map((note) => (
            <NoteCard key={note.id} potId={pot.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}

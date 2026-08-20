import Link from "next/link";
import { Brain, Cards, FileText, Plus, Sparkle, Tray } from "@phosphor-icons/react/dist/ssr";
import { NoteCard } from "@/components/pot/note-card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionPill } from "@/components/ui/pills";
import { contributorActivity } from "@/lib/contributors";
import type { FeedNote, PotContext } from "@/lib/data/pot";
import { relativeTime } from "@/lib/time";

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
  // Pot-wide, so it belongs with the vitals rather than a filtered view.
  const contributors = activeSection ? [] : contributorActivity(notes);

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
        <>
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
          <section aria-labelledby="study-pot-heading" className="space-y-3">
            <div>
              <h2 id="study-pot-heading" className="text-[13px] font-medium text-ink-muted">Study this Pot</h2>
              <p className="mt-0.5 text-[12px] text-ink-faint">Browse the source notes or generate material from the full class vault.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <StudyTile href="#raw-notes" title="Raw Notes" description="Shared notes from everyone." icon={<FileText />} />
              <StudyTile href={`/p/${pot.id}/study/summary`} title="Summary" description="Build a fresh study guide." icon={<Sparkle />} featured />
              <StudyTile href={`/p/${pot.id}/study/flashcards`} title="Flashcards" description="Generate recall cards from the Pot." icon={<Cards />} />
              <StudyTile href={`/p/${pot.id}/study/practice`} title="Practice" description="Set the length and difficulty, then sit it." icon={<Brain />} />
            </div>
          </section>
        </>
      ) : null}

      {contributors.length > 0 ? (
        <section aria-labelledby="pot-contributors" className="space-y-3">
          <h2 id="pot-contributors" className="text-[13px] font-medium text-ink-muted">
            Recent contributors
          </h2>
          <ul className="flex flex-wrap gap-2">
            {contributors.map((contributor) => (
              <li
                key={contributor.name}
                className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface py-1.5 pl-1.5 pr-3.5"
              >
                <Avatar name={contributor.name} size="sm" />
                <span className="text-[13px] font-medium text-ink">{contributor.name}</span>
                <span className="text-[12px] text-ink-faint">
                  {contributor.noteCount} {contributor.noteCount === 1 ? "note" : "notes"}
                  {" · "}
                  {relativeTime(contributor.lastSharedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
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
        <div id="raw-notes" className="space-y-3 scroll-mt-6">
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

function StudyTile({ href, title, description, icon, featured = false }: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`mp-lift group block rounded-(--radius-card) border p-5 ${
        featured
          ? "border-primary/30 bg-primary-soft hover:border-primary/60"
          : "border-edge bg-surface hover:border-edge-strong"
      }`}
    >
      <span className="mb-5 inline-flex size-9 items-center justify-center rounded-lg bg-sunken text-primary [&>svg]:size-4">
        {icon}
      </span>
      <h3 className="font-semibold text-ink group-hover:text-primary">{title}</h3>
      <p className="mt-1 text-[12px] text-ink-muted">{description}</p>
    </Link>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Cards, TrashSimple } from "@phosphor-icons/react";
import { Card, CardSection } from "@/components/ui/card";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { NoteFlashcard } from "@/lib/data/pot";

/**
 * Cards written off this note by hand. Deleting is allowed for the person who
 * wrote the card and for maintainers; the database enforces both, and the
 * button only appears where it will work.
 */
export function NoteCards({
  cards,
  canModerate,
}: {
  cards: NoteFlashcard[];
  canModerate: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (cards.length === 0) return null;

  async function remove(id: string) {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    const { error: deleteError } = await supabaseBrowser()
      .from("note_flashcards")
      .delete()
      .eq("id", id);
    setBusyId(null);
    if (deleteError) {
      setError("That card could not be removed. Try again.");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardSection className="space-y-3">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
          <Cards className="size-4" aria-hidden />
          Cards from this note
        </p>
        <ul className="space-y-2.5">
          {cards.map((card) => (
            <li
              key={card.id}
              className="rounded-(--radius-control) border border-edge bg-sunken/50 px-3.5 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-ink">{card.front}</p>
                  <p className="text-[13px] leading-relaxed text-ink-muted">{card.back}</p>
                  {card.tags.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5 pt-0.5">
                      {card.tags.map((tag) => (
                        <li
                          key={tag}
                          className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-ink-muted"
                        >
                          {tag}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="text-[11px] text-ink-faint">
                    {card.writtenByViewer ? "Written by you" : `Written by ${card.writerName}`}
                  </p>
                </div>
                {card.writtenByViewer || canModerate ? (
                  <button
                    type="button"
                    onClick={() => void remove(card.id)}
                    disabled={busyId === card.id}
                    aria-label={`Delete the card "${card.front}"`}
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-(--radius-control) text-ink-faint transition-colors hover:bg-surface hover:text-danger disabled:opacity-40"
                  >
                    <TrashSimple className="size-4" aria-hidden />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        {error ? (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        ) : null}
      </CardSection>
    </Card>
  );
}

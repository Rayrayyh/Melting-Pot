"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowCounterClockwise, EyeSlash } from "@phosphor-icons/react";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { RemovedNote } from "@/lib/data/pot";
import { relativeTime } from "@/lib/time";

/**
 * What a maintainer has taken out of the Pot, and the way back. Removal never
 * deletes anything, so this list is the whole of it: every note here can be
 * read and put back.
 */
export function RemovedNotesPanel({
  potId,
  notes,
}: {
  potId: string;
  notes: RemovedNote[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function restore(id: string) {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    const { error: rpcError } = await supabaseBrowser().rpc("set_shared_note_removed", {
      p_note_id: id,
      p_removed: false,
      p_reason: "",
    });
    setBusyId(null);
    if (rpcError) {
      setError("That note could not be put back. Try again.");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardSection className="space-y-3">
        <div className="space-y-1">
          <Eyebrow>Removed notes</Eyebrow>
          <p className="text-[13px] text-ink-muted">
            {notes.length === 0
              ? "Nothing has been removed from this Pot."
              : "Out of the feed, out of search, out of study material. Nothing was deleted."}
          </p>
        </div>
        {notes.length > 0 ? (
          <ul aria-label="Removed notes" className="space-y-2">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-(--radius-control) border border-edge bg-sunken/50 px-3.5 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <Link
                      href={`/p/${potId}/n/${note.id}`}
                      className="flex items-center gap-1.5 text-sm font-medium text-ink transition-colors hover:text-primary"
                    >
                      <EyeSlash className="size-4 shrink-0 text-ink-faint" aria-hidden />
                      <span className="truncate">{note.title}</span>
                    </Link>
                    {note.removedReason ? (
                      <p className="text-[13px] text-ink-muted">{note.removedReason}</p>
                    ) : null}
                    <p className="text-[11px] text-ink-faint">
                      Shared by {note.contributorName} · removed{" "}
                      {relativeTime(note.removedAt)}
                      {note.removedByName ? ` by ${note.removedByName}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void restore(note.id)}
                    disabled={busyId === note.id}
                  >
                    <ArrowCounterClockwise className="size-4" />
                    {busyId === note.id ? "Putting it back" : "Put it back"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {error ? (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        ) : null}
      </CardSection>
    </Card>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowCounterClockwise, Cards, Sparkle } from "@phosphor-icons/react";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { AdminRemovedCard, AdminRemovedSet } from "@/lib/data/admin";
import { relativeTime } from "@/lib/time";

const kindLabel = {
  summary: "Summary",
  flashcards: "Flashcards",
  practice: "Practice test",
} as const;

/**
 * Study material a maintainer has taken out, and the way back.
 *
 * Removing a set or a card used to destroy it, which meant a maintainer
 * clearing one bad deck could take work a whole class was studying from with
 * nothing anywhere to undo it. Neither is destroyed now, so this list is
 * complete: everything on it can be put back exactly as it was.
 */
export function AdminRestore({
  sets,
  cards,
}: {
  sets: AdminRemovedSet[];
  cards: AdminRemovedCard[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (sets.length === 0 && cards.length === 0) return null;

  async function restore(kind: "set" | "card", id: string) {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    const supabase = supabaseBrowser();
    const { error: rpcError } =
      kind === "set"
        ? await supabase.rpc("restore_study_set", { p_study_set_id: id })
        : await supabase.rpc("set_flashcard_removed", { p_card_id: id, p_removed: false });
    setBusyId(null);
    if (rpcError) {
      setError("That could not be put back. Try again.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}

      {sets.length > 0 ? (
        <Card>
          <CardSection className="space-y-3">
            <Eyebrow>Removed study material</Eyebrow>
            {sets.map((set) => (
              <div
                key={set.id}
                className="flex items-center gap-3 border-t border-edge pt-3 first:border-0 first:pt-0"
              >
                <Sparkle className="size-4 shrink-0 text-ink-faint" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">{set.title}</p>
                  <p className="text-[12px] text-ink-muted truncate">
                    {kindLabel[set.kind]} · built by {set.builtByName} · removed{" "}
                    {relativeTime(set.removedAt)}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void restore("set", set.id)}
                  disabled={busyId === set.id}
                >
                  <ArrowCounterClockwise className="size-4" />
                  {busyId === set.id ? "Restoring" : "Restore"}
                </Button>
              </div>
            ))}
          </CardSection>
        </Card>
      ) : null}

      {cards.length > 0 ? (
        <Card>
          <CardSection className="space-y-3">
            <Eyebrow>Removed cards</Eyebrow>
            {cards.map((card) => (
              <div
                key={card.id}
                className="flex items-center gap-3 border-t border-edge pt-3 first:border-0 first:pt-0"
              >
                <Cards className="size-4 shrink-0 text-ink-faint" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">{card.front}</p>
                  <p className="text-[12px] text-ink-muted truncate">
                    {card.back} · {card.writerName} · removed {relativeTime(card.removedAt)}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void restore("card", card.id)}
                  disabled={busyId === card.id}
                >
                  <ArrowCounterClockwise className="size-4" />
                  {busyId === card.id ? "Restoring" : "Restore"}
                </Button>
              </div>
            ))}
          </CardSection>
        </Card>
      ) : null}
    </>
  );
}

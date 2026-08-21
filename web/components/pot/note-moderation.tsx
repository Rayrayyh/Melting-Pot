"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowCounterClockwise, EyeSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, TextArea } from "@/components/ui/input";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Taking a note out of the Pot, and putting it back. Removal is not deletion:
 * the note, every version of it, and everyone credited on it all survive. It
 * stops appearing in the feed, in search, and in generated study material, and
 * anyone opening its link sees why it was removed and who removed it.
 */
export function NoteModeration({
  noteId,
  removed,
}: {
  noteId: string;
  removed: boolean;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(nextRemoved: boolean, nextReason: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabaseBrowser().rpc("set_shared_note_removed", {
      p_note_id: noteId,
      p_removed: nextRemoved,
      p_reason: nextReason,
    });
    setBusy(false);
    if (rpcError) {
      setError(
        rpcError.message.includes("not_pot_maintainer")
          ? "Only a maintainer can do that."
          : "That didn't go through. Try again.",
      );
      return;
    }
    setAsking(false);
    setReason("");
    router.refresh();
  }

  if (removed) {
    return (
      <div className="space-y-1.5">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void submit(false, "")}
          disabled={busy}
        >
          <ArrowCounterClockwise className="size-4" />
          {busy ? "Restoring" : "Restore"}
        </Button>
        {error ? (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const trimmed = reason.trim();

  return (
    <>
      <Button variant="quiet" size="sm" onClick={() => setAsking(true)}>
        <EyeSlash className="size-4" />
        Remove from the Pot
      </Button>
      <ConfirmDialog
        open={asking}
        title="Remove this note from the Pot?"
        confirmLabel={busy ? "Removing" : "Remove"}
        tone="danger"
        busy={busy || trimmed.length === 0}
        onConfirm={() => void submit(true, trimmed)}
        onCancel={() => {
          setAsking(false);
          setError(null);
        }}
      >
        <div className="space-y-3">
          <p>
            The note stops appearing in the feed, in search, and in study material.
            Nothing is deleted: every version and everyone credited stays on the
            record, and you can put it back at any time.
          </p>
          <Field label="Why" hint="The class sees this on the note.">
            {(props) => (
              <TextArea
                {...props}
                rows={3}
                value={reason}
                maxLength={400}
                placeholder="Duplicate of an earlier note."
                onChange={(event) => setReason(event.target.value)}
              />
            )}
          </Field>
          {error ? (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </ConfirmDialog>
    </>
  );
}

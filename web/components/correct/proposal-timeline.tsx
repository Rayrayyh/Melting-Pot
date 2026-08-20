"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardSection } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getClientAuth } from "@/lib/auth/client";
import type { ProposalDetail } from "@/lib/data/proposal";
import { supabaseBrowser } from "@/lib/supabase/client";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/cn";

const KIND_LABEL: Record<string, string> = {
  submitted: "sent the proposal",
  edited: "edited the proposal",
  resubmitted: "resubmitted after feedback",
  accepted: "accepted the change",
  revision_requested: "requested a revision",
  declined: "declined the proposal",
  comment: "commented",
};

const KIND_TONE: Record<string, string> = {
  accepted: "bg-success",
  revision_requested: "bg-warning",
  declined: "bg-danger",
};

/**
 * A question is not a decision, so it stays available after one. Status is
 * written only by the RPCs; this writes discussion and nothing else.
 */
function CommentComposer({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();
    const userId = await getClientAuth().getUserId();
    if (!userId) {
      setError("You're signed out. Sign in again to add to the discussion.");
      setBusy(false);
      return;
    }
    const { error: insertError } = await supabase.from("proposal_events").insert({
      proposal_id: proposalId,
      actor_id: userId,
      kind: "comment",
      body,
    });
    if (insertError) {
      setError(
        insertError.message.includes("rate_limited")
          ? "You're sending messages very quickly. Wait a moment and try again."
          : "Sending didn't go through. Your message is still here; try again.",
      );
      setBusy(false);
      return;
    }
    setText("");
    setBusy(false);
    router.refresh();
  }

  return (
    <form
      className="border-t border-edge pt-3 space-y-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <div className="flex items-center gap-2">
        <Input
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, 300))}
          placeholder="Ask a question or add context"
          aria-label="Ask a question or add context"
        />
        <Button type="submit" disabled={busy || !text.trim()}>
          {busy ? "Sending" : "Send"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/** The discussion and decision history; nothing here is ever deleted. */
export function ProposalTimeline({
  proposalId,
  events,
}: {
  proposalId: string;
  events: ProposalDetail["events"];
}) {
  return (
    <Card>
      <CardSection className="space-y-0.5">
        <p className="text-sm font-semibold text-ink pb-2">History</p>
        {events.length > 0 ? (
          <ol className="space-y-3 pb-3">
            {events.map((event) => (
              <li key={event.id} className="flex gap-3">
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 size-2 rounded-full shrink-0",
                    KIND_TONE[event.kind] ?? "bg-ink-faint",
                  )}
                />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-[13px] text-ink">
                    <span className="font-medium">{event.actorName}</span>{" "}
                    {KIND_LABEL[event.kind] ?? event.kind}
                    <span className="text-ink-faint"> &middot; {relativeTime(event.createdAt)}</span>
                  </p>
                  {event.body ? (
                    <p className="text-[13px] text-ink-muted border-l-2 border-edge pl-2.5">
                      {event.body}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        ) : null}
        {/* Reading this screen and writing a comment carry the same RLS
            audience, so everyone who can see the history may add to it. */}
        <CommentComposer proposalId={proposalId} />
      </CardSection>
    </Card>
  );
}

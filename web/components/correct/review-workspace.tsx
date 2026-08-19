"use client";

import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { Robot, ShieldCheck, Warning } from "@phosphor-icons/react";
import { BeforeAfter, DiffText } from "@/components/correct/diff-view";
import { ProposalTimeline } from "@/components/correct/proposal-timeline";
import { AttributionRow } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { Field, TextArea } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/pills";
import { countOccurrences, replaceInBlocks, summarizeDiff } from "@/lib/diff";
import { blocksToBodyText } from "@/lib/organizer/edit";
import type { ProposalDetail } from "@/lib/data/proposal";
import { supabaseBrowser } from "@/lib/supabase/client";
import { relativeTime } from "@/lib/time";

/** The maintainer's decision surface. Only a person can publish from here. */
export function ReviewWorkspace({ proposal }: { proposal: ProposalDetail }) {
  const router = useRouter();
  const [mode, setMode] = useState<"decide" | "revise" | "decline">("decide");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newBlocks = useMemo(
    () => replaceInBlocks(proposal.currentBlocks, proposal.selectedText, proposal.proposedText),
    [proposal],
  );
  const conflict = newBlocks === null;

  // Honest, rule-based review assistance: everything it says is checkable.
  const assistance = useMemo(() => {
    const notes: Array<{ tone: "info" | "warn"; text: string }> = [];
    notes.push({ tone: "info", text: summarizeDiff(proposal.selectedText, proposal.proposedText) });
    if (conflict) {
      notes.push({
        tone: "warn",
        text: "The selected sentence no longer appears in the current version. The note may have changed since this was proposed; accepting is disabled.",
      });
    }
    const occurrences = countOccurrences(proposal.currentBodyText, proposal.selectedText);
    if (!conflict && occurrences > 1) {
      notes.push({
        tone: "warn",
        text: `The selected sentence appears ${occurrences} times in this note. Accepting updates every occurrence.`,
      });
    }
    const elsewhere = proposal.currentBodyText
      .replace(proposal.selectedText, "")
      .toLowerCase()
      .includes(proposal.proposedText.toLowerCase().slice(0, 60));
    if (!conflict && elsewhere) {
      notes.push({
        tone: "warn",
        text: "The proposed wording may overlap content already elsewhere in the note.",
      });
    }
    if (proposal.source) {
      notes.push({ tone: "info", text: `A supporting source is attached: ${proposal.source}` });
    } else {
      notes.push({ tone: "info", text: "No supporting source was attached." });
    }
    return notes;
  }, [proposal, conflict]);

  async function decide(decision: "accepted" | "revision_requested" | "declined") {
    if (busy) return;
    if (decision !== "accepted" && !note.trim()) return;
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();

    const payload =
      decision === "accepted" && newBlocks
        ? {
            p_new_title: proposal.currentTitle,
            p_new_summary: proposal.currentSummary,
            p_new_body: newBlocks,
            p_new_body_text: blocksToBodyText(newBlocks),
            p_new_takeaways: proposal.currentTakeaways,
            p_change_summary:
              proposal.diffSummary ??
              summarizeDiff(proposal.selectedText, proposal.proposedText),
            p_expected_version_id: proposal.currentVersionId ?? undefined,
          }
        : {};

    const { error: rpcError } = await supabase.rpc("decide_proposal", {
      p_proposal_id: proposal.id,
      p_decision: decision,
      p_note: note.trim() || undefined,
      ...payload,
    });
    if (rpcError) {
      if (rpcError.message.includes("proposal_conflict")) {
        setError(
          "The note changed while this page was open. Review the newest version before deciding.",
        );
        setBusy(false);
        router.refresh();
        return;
      }
      setError("The decision didn't go through. Try again.");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow>Correction proposal</Eyebrow>
          <StatusPill tone="pending">Waiting on your review</StatusPill>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{proposal.noteTitle}</h1>
        <div className="flex flex-wrap gap-x-6 gap-y-1.5">
          <AttributionRow
            name={proposal.proposerName}
            meta={`Proposed ${relativeTime(proposal.createdAt)}`}
            size="sm"
          />
          <AttributionRow
            name={proposal.noteContributorName}
            meta="Original contributor"
            size="sm"
          />
        </div>
      </header>

      <section className="space-y-2">
        <Eyebrow>The change</Eyebrow>
        <BeforeAfter
          before={proposal.selectedText}
          after={proposal.proposedText}
          beforeLabel="Current version"
          afterLabel="Suggested version"
        />
        <Card>
          <CardSection>
            <Eyebrow className="pb-1">Marked up</Eyebrow>
            <DiffText before={proposal.selectedText} after={proposal.proposedText} />
          </CardSection>
        </Card>
      </section>

      <section className="space-y-2">
        <Eyebrow>In context</Eyebrow>
        <Card>
          <CardSection>
            <p className="font-serif text-[15px] leading-relaxed text-ink-muted whitespace-pre-line">
              {proposal.currentBodyText.includes(proposal.selectedText)
                ? proposal.currentBodyText
                    .split(proposal.selectedText)
                    .map((part, i, parts) => (
                      <Fragment key={i}>
                        {part}
                        {i < parts.length - 1 ? (
                          <mark className="bg-pending-soft text-ink rounded px-0.5">
                            {proposal.selectedText}
                          </mark>
                        ) : null}
                      </Fragment>
                    ))
                : proposal.currentBodyText}
            </p>
          </CardSection>
        </Card>
      </section>

      {proposal.reason || proposal.explanation ? (
        <Card>
          <CardSection className="space-y-2 text-sm">
            {proposal.reason ? (
              <p>
                <span className="text-ink-muted">Reason:</span> {proposal.reason}
              </p>
            ) : null}
            {proposal.explanation ? (
              <p>
                <span className="text-ink-muted">{proposal.proposerName}&apos;s explanation:</span>{" "}
                {proposal.explanation}
              </p>
            ) : null}
          </CardSection>
        </Card>
      ) : null}

      <section className="space-y-2">
        <Eyebrow>Review assistance</Eyebrow>
        <Card>
          <CardSection className="space-y-2.5">
            {assistance.map((item, i) => (
              <p key={i} className="flex items-start gap-2 text-[13px] leading-relaxed">
                {item.tone === "warn" ? (
                  <Warning className="size-4 text-warning shrink-0 mt-0.5" aria-hidden />
                ) : (
                  <Robot className="size-4 text-ink-faint shrink-0 mt-0.5" aria-hidden />
                )}
                <span className={item.tone === "warn" ? "text-warning" : "text-ink-muted"}>
                  {item.text}
                </span>
              </p>
            ))}
            <p className="flex items-start gap-2 text-[13px] font-medium text-ink border-t border-edge pt-2.5">
              <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" aria-hidden />
              AI cannot publish this change. A maintainer must decide.
            </p>
          </CardSection>
        </Card>
      </section>

      <ProposalTimeline events={proposal.events} />

      {mode !== "decide" ? (
        <Card className={mode === "decline" ? "border-danger/30" : "border-warning/30"}>
          <CardSection className="space-y-3">
            <Field
              label={mode === "revise" ? "What should they improve?" : "Why are you declining?"}
              hint={
                mode === "revise"
                  ? "They can edit and resubmit this same proposal."
                  : "Their proposal stays visible to them with this reason."
              }
            >
              {(props) => (
                <TextArea
                  {...props}
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  autoFocus
                />
              )}
            </Field>
            <div className="flex justify-end gap-2.5">
              <Button variant="secondary" onClick={() => setMode("decide")} disabled={busy}>
                Back
              </Button>
              <Button
                variant={mode === "decline" ? "danger" : "primary"}
                disabled={busy || !note.trim()}
                onClick={() =>
                  void decide(mode === "revise" ? "revision_requested" : "declined")
                }
              >
                {busy
                  ? "Sending"
                  : mode === "revise"
                    ? "Request revisions"
                    : "Decline proposal"}
              </Button>
            </div>
          </CardSection>
        </Card>
      ) : null}

      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}

      {mode === "decide" ? (
        <div className="sticky bottom-0 -mx-6 border-t border-edge bg-surface/95 backdrop-blur-sm px-6 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-ink-muted hidden sm:block">
              Accepting publishes this as the newest version and credits both
              contributors.
            </p>
            <div className="flex items-center gap-2.5">
              <Button variant="danger" onClick={() => setMode("decline")} disabled={busy}>
                Decline
              </Button>
              <Button variant="secondary" onClick={() => setMode("revise")} disabled={busy}>
                Request revisions
              </Button>
              <Button onClick={() => void decide("accepted")} disabled={busy || conflict}>
                {busy ? "Working" : "Accept changes"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

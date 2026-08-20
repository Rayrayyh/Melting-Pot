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
import { countOccurrences, diffWords, replaceInBlocks, summarizeDiff } from "@/lib/diff";
import { blocksToBodyText } from "@/lib/organizer/edit";
import type { NoteBlock } from "@/lib/data/pot";
import type { ProposalDetail } from "@/lib/data/proposal";
import { supabaseBrowser } from "@/lib/supabase/client";
import { relativeTime } from "@/lib/time";

const STALE_SENTENCE_NOTE =
  "The sentence this points at is not in the note any more. Pick the sentence again and send it back.";

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

function wordsIn(text: string): string[] {
  return text.toLowerCase().match(WORD) ?? [];
}

/** The maintainer's decision surface. Only a person can publish from here. */
type OrganizedPayload = {
  title: string;
  summary: string;
  blocks: NoteBlock[];
  takeaways: string[];
};

/**
 * Organizes a whole-note correction before it is published. The route falls
 * back to the deterministic organizer when the model is unavailable, so this
 * returns null only when the request itself failed, and the caller publishes
 * nothing rather than a half-built note.
 */
async function organizeProposedNote(
  potId: string,
  rawText: string,
): Promise<OrganizedPayload | null> {
  try {
    const response = await fetch("/api/ai/organize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ potId, rawText }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { result?: OrganizedPayload }
      | null;
    if (!response.ok || !payload?.result?.blocks?.length) return null;
    return payload.result;
  } catch {
    return null;
  }
}

export function ReviewWorkspace({ proposal }: { proposal: ProposalDetail }) {
  const router = useRouter();
  const [mode, setMode] = useState<"decide" | "revise" | "decline">("decide");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  // Someone else decided this while the page was open; the decision stands,
  // so the buttons stay dead until the refresh swaps this screen out.
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A whole-note correction hands over the entire body rather than one
  // sentence, so there is nothing to splice into: it is organized again from
  // the proposer's text when it is accepted. replaceInBlocks would return null
  // for it, which is the same signal as a stale selection, so the two are
  // separated here before that null means "conflict".
  const wholeNote = proposal.selectedText.trim() === proposal.currentBodyText.trim();
  const newBlocks = useMemo(
    () =>
      wholeNote
        ? null
        : replaceInBlocks(proposal.currentBlocks, proposal.selectedText, proposal.proposedText),
    [proposal, wholeNote],
  );
  const conflict = !wholeNote && newBlocks === null;

  // Accepting rebuilds the body and passes the summary and key points
  // through untouched, so wording this correction removes can survive there
  // and contradict the sentence it just fixed.
  const strandedWords = useMemo(() => {
    if (conflict) return [];
    const kept = new Set([
      ...wordsIn(proposal.currentSummary),
      ...proposal.currentTakeaways.flatMap(wordsIn),
    ]);
    const surviving = new Set(wordsIn(proposal.proposedText));
    const seen = new Set<string>();
    const found: string[] = [];
    for (const segment of diffWords(proposal.selectedText, proposal.proposedText)) {
      if (segment.type !== "removed") continue;
      for (const word of segment.text.match(WORD) ?? []) {
        // Short words carry no meaning on their own; a digit makes even a
        // short one worth naming, because dates and figures are what go stale.
        if (word.length < 4 && !/\d/.test(word)) continue;
        const key = word.toLowerCase();
        if (seen.has(key) || surviving.has(key) || !kept.has(key)) continue;
        seen.add(key);
        found.push(word);
      }
    }
    return found;
  }, [proposal, conflict]);

  // Honest, rule-based review assistance: everything it says is checkable.
  const assistance = useMemo(() => {
    const notes: Array<{ tone: "info" | "warn"; text: string }> = [];
    notes.push({ tone: "info", text: summarizeDiff(proposal.selectedText, proposal.proposedText) });
    if (conflict) {
      notes.push({
        tone: "warn",
        text: "The selected sentence is not in this note any more, so there is nothing here to accept. Ask for a new sentence and the correction carries over.",
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
    if (strandedWords.length > 0) {
      // Three names are enough to send the maintainer looking; a longer list
      // reads as noise. Nothing is rewritten for them: a summary is a
      // paraphrase, and splicing body wording into it produces nonsense.
      const named = strandedWords.slice(0, 3).map((word) => `"${word}"`);
      const list =
        named.length === 1
          ? named[0]
          : `${named.slice(0, -1).join(", ")} and ${named[named.length - 1]}`;
      notes.push({
        tone: "warn",
        text: `The summary or key points still contain ${list}. Accepting updates the note body only, so those keep their current wording.`,
      });
    }
    if (proposal.source) {
      notes.push({ tone: "info", text: `A supporting source is attached: ${proposal.source}` });
    } else {
      notes.push({ tone: "info", text: "No supporting source was attached." });
    }
    return notes;
  }, [proposal, conflict, strandedWords]);

  async function decide(decision: "accepted" | "revision_requested" | "declined") {
    if (busy || settled) return;
    if (decision !== "accepted" && !note.trim()) return;
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();

    let organized: OrganizedPayload | null = null;
    if (decision === "accepted" && wholeNote) {
      organized = await organizeProposedNote(proposal.potId, proposal.proposedText);
      if (!organized) {
        setError(
          "The note could not be organized just now, so nothing was published. Try again in a moment.",
        );
        setBusy(false);
        return;
      }
    }

    const payload =
      decision === "accepted" && organized
        ? {
            p_new_title: organized.title,
            p_new_summary: organized.summary,
            p_new_body: organized.blocks,
            p_new_body_text: blocksToBodyText(organized.blocks),
            p_new_takeaways: organized.takeaways,
            p_change_summary:
              proposal.diffSummary ??
              summarizeDiff(proposal.selectedText, proposal.proposedText),
            p_expected_version_id: proposal.currentVersionId ?? undefined,
          }
        : decision === "accepted" && newBlocks
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
      if (rpcError.message.includes("proposal_not_pending")) {
        setError("This correction was already decided. Showing the decision.");
        setBusy(false);
        setSettled(true);
        router.refresh();
        return;
      }
      if (rpcError.message.includes("proposal_conflict")) {
        setError(
          "The note changed while this page was open. Review the newest version before deciding.",
        );
        setBusy(false);
        router.refresh();
        return;
      }
      setError(
        rpcError.message.includes("rate_limited")
          ? "You're deciding very quickly. Wait a moment and try again."
          : "The decision didn't go through. Try again.",
      );
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

      <ProposalTimeline proposalId={proposal.id} events={proposal.events} />

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
                disabled={busy || settled || !note.trim()}
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
          <p className="text-[12px] text-ink-faint pb-2">
            You can ask a question without deciding yet.
            {wholeNote
              ? " This one rewrites the whole note, so accepting organizes it again from their words and rebuilds the headings and key points."
              : ""}
          </p>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-ink-muted hidden sm:block">
              {conflict
                ? "This cannot be accepted as it stands, because the sentence it points at is gone."
                : "Accepting publishes this as the newest version and credits both contributors."}
            </p>
            <div className="flex items-center gap-2.5">
              <Button
                variant="danger"
                onClick={() => setMode("decline")}
                disabled={busy || settled}
              >
                Decline
              </Button>
              <Button
                variant="secondary"
                onClick={() => setMode("revise")}
                disabled={busy || settled}
              >
                Request revisions
              </Button>
              {conflict ? (
                <Button
                  onClick={() => {
                    setNote(STALE_SENTENCE_NOTE);
                    setMode("revise");
                  }}
                  disabled={busy || settled}
                >
                  Ask for a new sentence
                </Button>
              ) : (
                <Button onClick={() => void decide("accepted")} disabled={busy || settled}>
                  {busy ? "Working" : "Accept changes"}
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

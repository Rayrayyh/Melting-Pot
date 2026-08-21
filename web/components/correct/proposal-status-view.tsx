"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle,
  HourglassMedium,
  ProhibitInset,
  ShieldCheck,
  Warning,
} from "@phosphor-icons/react";
import { SentencePicker } from "@/components/correct/correct-flow";
import { BeforeAfter, DiffText } from "@/components/correct/diff-view";
import { ProposalTimeline } from "@/components/correct/proposal-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { Field, Input, TextArea } from "@/components/ui/input";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { summarizeDiff } from "@/lib/diff";
import { asSingleLine, blocksToBodyText } from "@/lib/organizer/edit";
import { organizeErrorMessage, organizeNote } from "@/lib/organizer/request";
import type { ProposalDetail } from "@/lib/data/proposal";
import type { Json } from "@/lib/database.types";
import { supabaseBrowser } from "@/lib/supabase/client";

/** The proposer's view of one correction across its whole lifecycle. */
export function ProposalStatusView({
  proposal,
  isProposer,
}: {
  proposal: ProposalDetail;
  isProposer: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState(proposal.selectedText);
  const [proposed, setProposed] = useState(proposal.proposedText);
  const [explanation, setExplanation] = useState(proposal.explanation ?? "");
  const [source, setSource] = useState(proposal.source ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Another correction landed first and took the sentence with it. Saying
  // "waiting on maintainer" here would be a lie: there is nothing left to
  // accept until the proposer points this at the note as it now reads.
  const gone = !proposal.currentBodyText.includes(proposal.selectedText);

  function startEditing() {
    setSelected(proposal.selectedText);
    setPicking(gone);
    setEditing(true);
  }

  // A correction that hands over the whole note is revised the same way it was
  // written: the words are organized again before they go back, so the stored
  // organized note always belongs to the text beside it. Re-pointing at a
  // single sentence turns this off, because then there is a sentence to splice.
  const wholeNote = !picking && selected.trim() === proposal.currentBodyText.trim();

  async function resubmit() {
    if (busy || !proposed.trim() || !selected) return;
    setBusy(true);
    setError(null);

    let organizedText = asSingleLine(proposed);
    let organizedPayload = null;
    if (wholeNote) {
      const result = await organizeNote(proposal.potId, proposed.trim());
      if ("error" in result) {
        setError(organizeErrorMessage(result.error));
        setBusy(false);
        return;
      }
      organizedText = blocksToBodyText(result.note.blocks);
      organizedPayload = result.note;
    }

    const supabase = supabaseBrowser();
    const { error: rpcError } = await supabase.rpc("resubmit_proposal", {
      p_proposal_id: proposal.id,
      p_selected_text: selected,
      p_proposed_text: organizedText,
      p_proposed_organized: organizedPayload
        ? (organizedPayload as unknown as Json)
        : null,
      p_explanation: explanation.trim() || undefined,
      p_source: source.trim() || undefined,
      p_diff_summary: summarizeDiff(selected, organizedText),
    });
    if (rpcError) {
      setError(
        rpcError.message.includes("rate_limited")
          ? "You're resubmitting very quickly. Wait a moment and try again."
          : "Resubmitting didn't go through. Try again.",
      );
      setBusy(false);
      return;
    }
    setEditing(false);
    setPicking(false);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 space-y-6">
      <header className="space-y-1">
        <Eyebrow>Correction proposal</Eyebrow>
        <h1 className="text-2xl font-semibold tracking-tight">{proposal.noteTitle}</h1>
        <p className="text-sm text-ink-muted">
          Proposed by {proposal.proposerName} &middot; original note by{" "}
          {proposal.noteContributorName}
        </p>
      </header>

      {proposal.status === "pending" && gone ? (
        <NoticeBanner
          tone="warning"
          icon={<Warning />}
          title={
            isProposer
              ? "This note changed since you wrote this"
              : "This note changed since this was written"
          }
          action={
            isProposer && !editing ? (
              <Button size="sm" onClick={startEditing}>
                Pick the sentence again
              </Button>
            ) : undefined
          }
        >
          {isProposer
            ? "The sentence you picked is not in the note any more. Pick the sentence again and your correction carries over."
            : `The sentence ${proposal.proposerName} picked is not in the note any more. They can pick it again and the correction carries over.`}
        </NoticeBanner>
      ) : proposal.status === "pending" ? (
        <NoticeBanner tone="warning" icon={<HourglassMedium />} title="Waiting on maintainer">
          {isProposer
            ? "A maintainer will compare both versions and decide. You can still edit this proposal; edits keep the same proposal and its history."
            : `A maintainer will compare both versions and decide. ${proposal.proposerName} can still edit this proposal while it waits.`}
        </NoticeBanner>
      ) : null}
      {proposal.status === "accepted" ? (
        <NoticeBanner
          tone="success"
          icon={<CheckCircle />}
          title="Accepted. The shared note is updated."
          action={
            <Button size="sm" href={`/p/${proposal.potId}/n/${proposal.noteId}`}>
              View updated note
            </Button>
          }
        >
          {isProposer
            ? `Your correction became the newest version and is credited to you.${
                proposal.decidedByName ? ` Reviewed by ${proposal.decidedByName}.` : ""
              }`
            : `${proposal.proposerName}'s correction became the newest version and is credited to them.${
                proposal.decidedByName ? ` Reviewed by ${proposal.decidedByName}.` : ""
              }`}
        </NoticeBanner>
      ) : null}
      {proposal.status === "revision_requested" ? (
        <NoticeBanner tone="warning" title="Revision requested">
          {isProposer
            ? "Keep working on this same proposal; nothing was thrown away."
            : `${proposal.proposerName} can keep working on this same proposal; nothing was thrown away.`}
        </NoticeBanner>
      ) : null}
      {proposal.status === "declined" ? (
        <NoticeBanner
          tone="danger"
          icon={<ProhibitInset />}
          title="Declined. This proposal won't change the note."
        >
          {isProposer
            ? "The note stays as it is, and your proposal stays visible here."
            : `The note stays as it is, and the proposal stays visible to ${proposal.proposerName}.`}
        </NoticeBanner>
      ) : null}

      {proposal.status === "revision_requested" && proposal.decisionNote ? (
        <Card className="border-warning/30">
          <CardSection className="space-y-1.5">
            <Eyebrow>{proposal.decidedByName ?? "Maintainer"}&apos;s feedback</Eyebrow>
            <p className="text-sm text-ink leading-relaxed">
              &quot;{proposal.decisionNote}&quot;
            </p>
          </CardSection>
        </Card>
      ) : null}
      {proposal.status === "declined" && proposal.decisionNote ? (
        <Card className="border-danger/30">
          <CardSection className="space-y-1.5">
            <Eyebrow>Reason from {proposal.decidedByName ?? "the maintainer"}</Eyebrow>
            <p className="text-sm text-ink leading-relaxed">
              &quot;{proposal.decisionNote}&quot;
            </p>
          </CardSection>
        </Card>
      ) : null}

      {editing ? (
        <Card>
          <CardSection className="space-y-4">
            <div className="space-y-1.5">
              <Eyebrow>{wholeNote ? "The whole note" : "Selected sentence"}</Eyebrow>
              {picking ? (
                <SentencePicker
                  bodyText={proposal.currentBodyText}
                  selected={selected}
                  hint="Tap the sentence you want to correct. This is the note as it reads now."
                  onSelect={(sentence) => {
                    setSelected(sentence);
                    setPicking(false);
                  }}
                />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-ink-muted">
                    {wholeNote
                      ? "This correction rewrites the note, so there is no one sentence to point at."
                      : selected}
                  </p>
                  <Button variant="quiet" size="sm" onClick={() => setPicking(true)}>
                    {wholeNote ? "Correct one sentence instead" : "Pick a different sentence"}
                  </Button>
                </div>
              )}
            </div>
            <Field
              label={wholeNote ? "The note, as you would write it" : "Your correction"}
              hint={
                wholeNote
                  ? "Write it however it comes out. The headings and the key points are rebuilt from your words when you send it."
                  : undefined
              }
            >
              {(props) => (
                <TextArea
                  {...props}
                  rows={wholeNote ? 14 : 3}
                  value={proposed}
                  onChange={(e) => setProposed(e.target.value)}
                  className={wholeNote ? "font-serif text-[15px]" : undefined}
                />
              )}
            </Field>
            <Field label="Why this is more accurate (optional)">
              {(props) => (
                <TextArea
                  {...props}
                  rows={2}
                  autoGrow
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value.slice(0, 300))}
                />
              )}
            </Field>
            <Field label="Supporting source (optional)">
              {(props) => (
                <Input {...props} value={source} onChange={(e) => setSource(e.target.value)} />
              )}
            </Field>
            {error ? (
              <p role="alert" className="text-[13px] text-danger">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2.5">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditing(false);
                  setPicking(false);
                }}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void resubmit()}
                disabled={busy || picking || !proposed.trim()}
              >
                {busy
                  ? wholeNote
                    ? "Organizing"
                    : "Sending"
                  : proposal.status === "revision_requested"
                    ? "Resubmit to maintainer"
                    : "Update proposal"}
              </Button>
            </div>
          </CardSection>
        </Card>
      ) : (
        <>
          <BeforeAfter before={proposal.selectedText} after={proposal.proposedText} />
          <Card>
            <CardSection className="space-y-3">
              <div>
                <Eyebrow className="pb-1">Marked up</Eyebrow>
                <DiffText before={proposal.selectedText} after={proposal.proposedText} />
              </div>
              {proposal.diffSummary ? (
                <p className="text-[13px] text-ink-muted border-t border-edge pt-3">
                  {proposal.diffSummary}
                </p>
              ) : null}
            </CardSection>
          </Card>
        </>
      )}

      {!editing && (proposal.reason || proposal.explanation || proposal.source) ? (
        <Card>
          <CardSection className="space-y-2 text-sm">
            {proposal.reason ? (
              <p>
                <span className="text-ink-muted">Reason:</span> {proposal.reason}
              </p>
            ) : null}
            {proposal.explanation ? (
              <p>
                <span className="text-ink-muted">Why:</span> {proposal.explanation}
              </p>
            ) : null}
            {proposal.source ? (
              <p>
                <span className="text-ink-muted">Source:</span> {proposal.source}
              </p>
            ) : null}
          </CardSection>
        </Card>
      ) : null}

      <ProposalTimeline proposalId={proposal.id} events={proposal.events} />

      <div className="flex items-center justify-between gap-3">
        <NoticeBanner tone="primary" icon={<ShieldCheck />} className="flex-1">
          AI cannot publish this change. A maintainer must decide.
        </NoticeBanner>
      </div>

      {isProposer &&
      !editing &&
      (proposal.status === "pending" || proposal.status === "revision_requested") ? (
        <div className="flex justify-end">
          <Button
            variant={proposal.status === "revision_requested" ? "primary" : "secondary"}
            onClick={startEditing}
          >
            Edit this proposal
          </Button>
        </div>
      ) : null}
    </div>
  );
}

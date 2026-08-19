"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle, HourglassMedium, ProhibitInset, ShieldCheck } from "@phosphor-icons/react";
import { BeforeAfter, DiffText } from "@/components/correct/diff-view";
import { ProposalTimeline } from "@/components/correct/proposal-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { Field, Input, TextArea } from "@/components/ui/input";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { summarizeDiff } from "@/lib/diff";
import type { ProposalDetail } from "@/lib/data/proposal";
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
  const [proposed, setProposed] = useState(proposal.proposedText);
  const [explanation, setExplanation] = useState(proposal.explanation ?? "");
  const [source, setSource] = useState(proposal.source ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resubmit() {
    if (busy || !proposed.trim()) return;
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { error: rpcError } = await supabase.rpc("resubmit_proposal", {
      p_proposal_id: proposal.id,
      p_selected_text: proposal.selectedText,
      p_proposed_text: proposed.trim(),
      p_explanation: explanation.trim() || undefined,
      p_source: source.trim() || undefined,
      p_diff_summary: summarizeDiff(proposal.selectedText, proposed.trim()),
    });
    if (rpcError) {
      setError("Resubmitting didn't go through. Try again.");
      setBusy(false);
      return;
    }
    setEditing(false);
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

      {proposal.status === "pending" ? (
        <NoticeBanner tone="warning" icon={<HourglassMedium />} title="Waiting on maintainer">
          A maintainer will compare both versions and decide. You can still edit
          this proposal; edits keep the same proposal and its history.
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
          Your correction became the newest version and is credited to you.
          {proposal.decidedByName ? ` Reviewed by ${proposal.decidedByName}.` : ""}
        </NoticeBanner>
      ) : null}
      {proposal.status === "revision_requested" ? (
        <NoticeBanner tone="warning" title="Revision requested">
          Keep working on this same proposal; nothing was thrown away.
        </NoticeBanner>
      ) : null}
      {proposal.status === "declined" ? (
        <NoticeBanner
          tone="danger"
          icon={<ProhibitInset />}
          title="Declined. This proposal won't change the note."
        >
          The note stays as it is, and your proposal stays visible here.
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
              <Eyebrow>Selected sentence</Eyebrow>
              <p className="text-sm text-ink-muted">{proposal.selectedText}</p>
            </div>
            <Field label="Your correction">
              {(props) => (
                <TextArea
                  {...props}
                  rows={3}
                  value={proposed}
                  onChange={(e) => setProposed(e.target.value)}
                />
              )}
            </Field>
            <Field label="Why this is more accurate (optional)">
              {(props) => (
                <TextArea
                  {...props}
                  rows={2}
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
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={() => void resubmit()} disabled={busy || !proposed.trim()}>
                {busy
                  ? "Sending"
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

      <ProposalTimeline events={proposal.events} />

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
            onClick={() => setEditing(true)}
          >
            Edit this proposal
          </Button>
        </div>
      ) : null}
    </div>
  );
}

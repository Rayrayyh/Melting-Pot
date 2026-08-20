"use client";

import { getClientAuth } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Eye, ShieldCheck } from "@phosphor-icons/react";
import { BeforeAfter, DiffText } from "@/components/correct/diff-view";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { Field, Input, TextArea } from "@/components/ui/input";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { selectableSentences, summarizeDiff } from "@/lib/diff";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

const REASONS = ["Incorrect fact", "Incomplete", "Unclear wording", "Outdated"] as const;

/**
 * Picking a sentence is the one gesture that starts a correction, and it has
 * to work the same way when a stale proposal comes back to be re-pointed.
 * The caller decides what a second tap on the same sentence means.
 */
export function SentencePicker({
  bodyText,
  selected,
  hint,
  onSelect,
}: {
  bodyText: string;
  selected: string | null;
  hint: string;
  onSelect: (sentence: string) => void;
}) {
  const sentences = selectableSentences(bodyText);
  return (
    <>
      <p className="text-[12px] text-ink-muted pb-2">{hint}</p>
      <p className="font-serif text-[16px] leading-loose text-ink">
        {sentences.map((sentence, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(sentence)}
            aria-pressed={sentence === selected}
            className={cn(
              "text-left rounded px-0.5 -mx-0.5 transition-colors",
              sentence === selected
                ? "bg-pending-soft outline outline-1 outline-pending/40"
                : "hover:bg-sunken",
            )}
          >
            {sentence}{" "}
          </button>
        ))}
      </p>
    </>
  );
}

export function CorrectFlow({
  potId,
  noteId,
  noteTitle,
  contributorName,
  bodyText,
}: {
  potId: string;
  noteId: string;
  noteTitle: string;
  contributorName: string;
  bodyText: string;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<"select" | "compare">("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [proposed, setProposed] = useState("");
  const [explanation, setExplanation] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!selected || !proposed.trim() || busy) return;
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();
    const userId = await getClientAuth().getUserId();
    if (!userId) {
      setError("You're signed out. Sign in again to send this correction.");
      setBusy(false);
      return;
    }
    const { data, error: insertError } = await supabase
      .from("revision_proposals")
      .insert({
        note_id: noteId,
        pot_id: potId,
        proposer_id: userId,
        selected_text: selected,
        proposed_text: proposed.trim(),
        reason,
        explanation: explanation.trim() || null,
        source: source.trim() || null,
        diff_summary: summarizeDiff(selected, proposed.trim()),
      })
      .select("id")
      .single();
    if (insertError || !data) {
      setError(
        insertError?.message.includes("rate_limited")
          ? "You're sending corrections very quickly. Wait a moment and try again."
          : "Sending didn't go through. Your correction is still here; try again.",
      );
      setBusy(false);
      return;
    }
    await supabase.from("proposal_events").insert({
      proposal_id: data.id,
      actor_id: userId,
      kind: "submitted",
    });
    router.push(`/p/${potId}/proposals/${data.id}`);
    router.refresh();
  }

  if (stage === "select") {
    return (
      <div className="flex flex-col flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 py-8 space-y-6 flex-1 pb-24">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Suggest a correction</h1>
            <p className="text-sm text-ink-muted">
              Select what seems off in {contributorName}&apos;s note, then write the fix
              in your own words.
            </p>
          </header>

          <section className="space-y-2">
            <Eyebrow>{noteTitle}</Eyebrow>
            <Card>
              <CardSection className="space-y-1">
                <SentencePicker
                  bodyText={bodyText}
                  selected={selected}
                  hint="Tap the sentence you want to correct."
                  onSelect={(sentence) =>
                    setSelected(sentence === selected ? null : sentence)
                  }
                />
              </CardSection>
            </Card>
            {selected ? (
              <div className="border border-pending/30 bg-pending-soft/40 rounded-(--radius-card) px-4 py-3 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pending">
                  Selected
                </p>
                <p className="text-sm text-ink">{selected}</p>
              </div>
            ) : null}
          </section>

          <section className="space-y-2.5">
            <Eyebrow>What seems off?</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setReason(option === reason ? null : option)}
                  aria-pressed={option === reason}
                  className={cn(
                    "h-9 px-4 rounded-full border text-[13px] font-medium transition-colors",
                    option === reason
                      ? "bg-primary text-on-primary border-primary"
                      : "bg-surface border-edge-strong text-ink-muted hover:text-ink",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-ink-faint">
              This helps the maintainer review faster.
            </p>
          </section>

          <section className="space-y-4">
            <Field label="Your correction" hint="Write it plainly. Formatting does not matter.">
              {(props) => (
                <TextArea
                  {...props}
                  rows={3}
                  value={proposed}
                  onChange={(e) => setProposed(e.target.value)}
                  placeholder="What should this sentence say instead?"
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
                <Input
                  {...props}
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Textbook section, lecture slide, or a link"
                />
              )}
            </Field>
          </section>

          <NoticeBanner tone="primary" icon={<ShieldCheck />} title="A maintainer approves changes">
            Your proposal won&apos;t replace the note automatically.
          </NoticeBanner>
        </div>

        <div className="sticky bottom-0 z-20 border-t border-edge bg-surface/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 px-6 py-3.5">
            <Button variant="quiet" href={`/p/${potId}/n/${noteId}`}>
              Cancel
            </Button>
            <Button
              disabled={!selected || !proposed.trim()}
              onClick={() => setStage("compare")}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="mx-auto w-full max-w-3xl px-6 py-8 space-y-6 flex-1 pb-24">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Show the change</h1>
          <p className="text-sm text-ink-muted">
            Your maintainer will compare these side by side.
          </p>
        </header>

        <BeforeAfter before={selected ?? ""} after={proposed.trim()} />

        <Card>
          <CardSection className="space-y-3">
            <div>
              <Eyebrow className="pb-1">Marked up</Eyebrow>
              <DiffText before={selected ?? ""} after={proposed.trim()} />
            </div>
            <p className="text-[13px] text-ink-muted border-t border-edge pt-3">
              {summarizeDiff(selected ?? "", proposed.trim())}
            </p>
          </CardSection>
        </Card>

        {reason || explanation.trim() || source.trim() ? (
          <Card>
            <CardSection className="space-y-2 text-sm">
              {reason ? (
                <p>
                  <span className="text-ink-muted">Reason:</span> {reason}
                </p>
              ) : null}
              {explanation.trim() ? (
                <p>
                  <span className="text-ink-muted">Why:</span> {explanation.trim()}
                </p>
              ) : null}
              {source.trim() ? (
                <p>
                  <span className="text-ink-muted">Source:</span> {source.trim()}
                </p>
              ) : null}
            </CardSection>
          </Card>
        ) : null}

        {error ? (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        ) : null}
      </div>

      <div className="sticky bottom-0 z-20 border-t border-edge bg-surface/95 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-2 text-[13px] text-ink-muted">
            <Eye className="size-4" aria-hidden />
            No changes are public until approved.
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="quiet" onClick={() => setStage("select")}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button onClick={() => void send()} disabled={busy}>
              {busy ? "Sending" : "Send to maintainer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

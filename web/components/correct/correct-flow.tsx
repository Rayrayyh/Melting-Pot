"use client";

import { getClientAuth } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { ArrowLeft, Eye, ShieldCheck } from "@phosphor-icons/react";
import { BeforeAfter, DiffText } from "@/components/correct/diff-view";
import { NoteBody, TakeawaysCard } from "@/components/pot/note-body";
import { Button } from "@/components/ui/button";
import { Stir } from "@/components/brand/stir";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { Field, Input, TextArea } from "@/components/ui/input";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { selectableSentences, summarizeDiff } from "@/lib/diff";
import { asSingleLine, blocksToBodyText } from "@/lib/organizer/edit";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { organizeErrorMessage, organizeNote } from "@/lib/organizer/request";
import type { ProposedNote } from "@/lib/organizer/types";
import type { Json } from "@/lib/database.types";
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
  // body_text joins blocks with newlines so a selection never spans two of
  // them (memory/decisions/007). Rendering every sentence into one paragraph
  // threw that structure away, so a heading with no terminal punctuation ran
  // straight into the sentence after it. Each line keeps its own row.
  const lines = bodyText
    .split(/\n+/)
    .map((line) => selectableSentences(line))
    .filter((sentences) => sentences.length > 0);
  return (
    <>
      <p className="text-[12px] text-ink-muted pb-2">{hint}</p>
      <div className="font-serif text-[16px] leading-loose text-ink space-y-1.5">
        {lines.map((sentences, lineIndex) => (
          <p key={lineIndex}>
            {sentences.map((sentence, i) => (
              <Fragment key={i}>
                {/* The gap between two sentences sharing a line belongs to
                    neither of them, so it sits outside both hit targets. */}
                {i > 0 ? " " : null}
              <button
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
                {sentence}
              </button>
              </Fragment>
            ))}
          </p>
        ))}
      </div>
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
  // "sentence" corrects one sentence; "note" hands the whole thing over to be
  // edited freely. A whole-note correction sets selected to the entire body,
  // which keeps the staleness check in decide_proposal meaningful and tells
  // the maintainer's screen to organize the result rather than splice it.
  const [mode, setMode] = useState<"sentence" | "note">("sentence");
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [proposed, setProposed] = useState("");
  const [explanation, setExplanation] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  // busy also covers sending the proposal, which is one insert. Only the
  // organizer call is long enough to earn the full screen.
  const [organizing, setOrganizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The organized note is tied to the text it was built from, so editing after
  // organizing makes it stale rather than wrong. Deriving that beats clearing
  // it on every keystroke, and it means going back and forward again without
  // touching a word costs nothing.
  const [organized, setOrganized] = useState<{ source: string; note: ProposedNote } | null>(null);
  const organizedNote = organized?.source === proposed.trim() ? organized.note : null;

  // What actually gets stored. A sentence replacement is spliced into one
  // block, so a pasted line break in it would split that block in two; a whole
  // note is stored as the organizer rebuilt it, which is what both the
  // maintainer and the class will read.
  const finalText =
    mode === "note"
      ? organizedNote
        ? blocksToBodyText(organizedNote.blocks)
        : proposed.trim()
      : asSingleLine(proposed);

  // Measured against what will be stored, not against what was typed. Adding
  // only a line break to a sentence reads as an edit and collapses straight
  // back to the original, and a correction that changes nothing is not one.
  const unchanged = Boolean(selected) && finalText === selected?.trim();

  async function continueToCompare() {
    if (!selected || !proposed.trim() || unchanged || busy) return;
    if (mode === "sentence") {
      setError(null);
      setStage("compare");
      return;
    }
    if (organizedNote) {
      setStage("compare");
      return;
    }
    setBusy(true);
    setOrganizing(true);
    setError(null);
    // finally, not a trailing call: this one puts a cover over the whole
    // screen, and a rejected request that never cleared it would strand the
    // reader with no way back to what they were writing.
    try {
      const result = await organizeNote(potId, proposed.trim());
      if ("error" in result) {
        setError(organizeErrorMessage(result.error));
        return;
      }
      setOrganized({ source: proposed.trim(), note: result.note });
      setStage("compare");
    } catch {
      setError("The connection dropped while this was being organized. Try again.");
    } finally {
      setBusy(false);
      setOrganizing(false);
    }
  }

  async function send() {
    if (!selected || !finalText || unchanged || busy) return;
    if (mode === "note" && !organizedNote) return;
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
        proposed_text: finalText,
        proposed_organized: organizedNote ? (organizedNote as unknown as Json) : null,
        reason,
        explanation: explanation.trim() || null,
        source: source.trim() || null,
        diff_summary: summarizeDiff(selected, finalText),
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
        <LoadingScreen
          open={organizing}
          message={[
            "Organizing your correction",
            "Reading what you changed",
            "Setting it beside the original",
          ]}
        />
        <div className="mx-auto w-full max-w-3xl px-6 py-8 space-y-6 flex-1 pb-24">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Suggest a correction</h1>
            <p className="text-sm text-ink-muted">
              Select what seems off in {contributorName}&apos;s note, then write the fix
              in your own words.
            </p>
          </header>

          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Eyebrow>{noteTitle}</Eyebrow>
              <div className="flex gap-1.5">
                {(
                  [
                    ["sentence", "Correct one sentence"],
                    ["note", "Edit the whole note"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={mode === key}
                    onClick={() => {
                      setMode(key);
                      // Each mode owns what is being corrected, so switching
                      // starts that mode's editor from the note as it stands
                      // rather than carrying the other mode's half-written text.
                      if (key === "note") {
                        setSelected(bodyText);
                        setProposed(bodyText);
                      } else {
                        setSelected(null);
                        setProposed("");
                      }
                    }}
                    className={cn(
                      "h-8 px-3.5 rounded-full border text-[13px] font-medium transition-colors",
                      mode === key
                        ? "bg-primary-soft border-primary/30 text-primary"
                        : "bg-surface border-edge-strong text-ink-muted hover:text-ink",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {mode === "note" ? (
              <>
                <Field
                  label="The note, as you would write it"
                  hint="Change anything, or all of it. Line breaks separate the parts."
                >
                  {(props) => (
                    <TextArea
                      {...props}
                      rows={14}
                      value={proposed}
                      onChange={(e) => setProposed(e.target.value)}
                      className="font-serif text-[15px]"
                    />
                  )}
                </Field>
                <p className="text-[12px] text-ink-faint">
                  Write it however it comes out. The headings and the key points are
                  rebuilt from your words when you continue, and you see the result
                  before anything is sent.
                </p>
              </>
            ) : (
            <Card>
              <CardSection className="space-y-1">
                <SentencePicker
                  bodyText={bodyText}
                  selected={selected}
                  hint="Tap the sentence you want to correct."
                  onSelect={(sentence) => {
                    // Re-tapping the selected sentence clears it. Tapping a
                    // new one seeds the editor, because nobody should retype
                    // a sentence to change a character in it.
                    const next = sentence === selected ? null : sentence;
                    setSelected(next);
                    setProposed(next ?? "");
                  }}
                />
              </CardSection>
            </Card>
            )}
            {mode === "sentence" && selected ? (
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
            {mode === "sentence" ? (
              <Field
                label="Your correction"
                hint="The sentence is already here. Change what is wrong and leave the rest."
              >
                {(props) => (
                  <TextArea
                    {...props}
                    rows={3}
                    autoGrow
                    value={proposed}
                    onChange={(e) => setProposed(e.target.value)}
                    placeholder="Pick a sentence above to edit it."
                  />
                )}
              </Field>
            ) : null}
            {/* A correction that changes nothing is not a correction, and the
                seeded editor makes it easy to send one by accident. */}
            {unchanged ? (
              <p className="text-[12px] text-ink-faint">
                Nothing has changed yet.{" "}
                {mode === "sentence"
                  ? "Edit the sentence above to send a correction."
                  : "Edit the note above to send a correction."}
              </p>
            ) : null}
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
                <Input
                  {...props}
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Textbook section, lecture slide, or a link"
                />
              )}
            </Field>
          </section>

          {error ? (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          ) : null}

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
              disabled={!selected || !proposed.trim() || unchanged || busy}
              onClick={() => void continueToCompare()}
            >
              {busy ? (
                <>
                  <Stir size={16} tone="on-primary" />
                  Organizing
                </>
              ) : (
                "Continue"
              )}
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
            {organizedNote
              ? "This is how the note will read. Your maintainer sees the same thing."
              : "Your maintainer will compare these side by side."}
          </p>
        </header>

        {organizedNote ? (
          <section className="space-y-2">
            <Eyebrow>How it will read</Eyebrow>
            <Card>
              <CardSection className="space-y-3">
                <div>
                  <h2 className="font-display text-xl tracking-tight">{organizedNote.title}</h2>
                  <p className="text-[13px] text-ink-muted pt-1">{organizedNote.summary}</p>
                </div>
                <NoteBody blocks={organizedNote.blocks} className="text-[15px]" />
                <TakeawaysCard takeaways={organizedNote.takeaways} />
              </CardSection>
            </Card>
            <p className="text-[12px] text-ink-faint">
              Your words, with the structure rebuilt. Go back to change any of it.
            </p>
          </section>
        ) : null}

        <BeforeAfter before={selected ?? ""} after={finalText} />

        <Card>
          <CardSection className="space-y-3">
            <div>
              <Eyebrow className="pb-1">Marked up</Eyebrow>
              <DiffText before={selected ?? ""} after={finalText} />
            </div>
            <p className="text-[13px] text-ink-muted border-t border-edge pt-3">
              {summarizeDiff(selected ?? "", finalText)}
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

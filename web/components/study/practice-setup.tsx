"use client";

import { useState, type ReactNode } from "react";
import { Check, Clock, MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Stir } from "@/components/brand/stir";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { estimatedMinutes } from "@/lib/study/practice-session";
import {
  DIFFICULTIES,
  MAX_EMPHASIS,
  QUESTION_COUNTS,
  type PracticeDifficulty,
  type PracticeOptions,
} from "@/lib/study/practice-options";
import {
  GRAPH_TIERS,
  type GraphTier,
} from "@/lib/study/graph-options";

const CHOICE =
  "inline-flex h-9 items-center justify-center rounded-full border px-4 text-[13px] font-medium transition-colors";

/**
 * What to ask for before a test is written: how long, how hard, which parts of
 * the Pot, and anything to concentrate on. Every combination is stored on its
 * own, so a class can keep a short warm-up and a long exam rehearsal at once.
 */
export function PracticeSetup({
  kind = "practice",
  options,
  onChange,
  sections,
  notes = [],
  tier = "fast",
  onTier,
  hasSaved,
  checking,
  busy,
  error,
  errorAction,
  onBuild,
  onOpenSaved,
}: {
  /**
   * Every kind is set up on this one screen. A summary, a deck and a graph
   * hide the length and difficulty, which only mean something for questions,
   * and keep the choices that matter everywhere: what to build from, and what
   * to lean on. A graph swaps them for how carefully it should be drawn.
   */
  kind?: "practice" | "summary" | "flashcards" | "graph";
  options: PracticeOptions;
  onChange: (next: PracticeOptions) => void;
  sections: Array<{ id: string; title: string }>;
  /** The Pot's notes by title, for building from particular notes. */
  notes?: Array<{ id: string; title: string }>;
  /** How carefully a graph is drawn; ignored by every other kind. */
  tier?: GraphTier;
  onTier?: (tier: GraphTier) => void;
  /** True when a test with exactly these settings is already in the Pot. */
  hasSaved: boolean;
  /** True while the store is being asked about the settings on screen. */
  checking: boolean;
  busy: boolean;
  error: string | null;
  /** Optional next step rendered under the error, e.g. a contribute link. */
  errorAction?: ReactNode;
  onBuild: () => void;
  onOpenSaved: () => void;
}) {
  // One noun instead of a ternary at every use.
  const noun = kind === "summary" ? "summary" : kind === "flashcards" ? "deck" : kind === "graph" ? "graph" : "test";
  const [noteQuery, setNoteQuery] = useState("");
  // Notes and sections never hold a choice at the same time, so what the
  // reader picked always means one thing when the request arrives.
  function toggleNote(id: string) {
    const noteIds = options.noteIds.includes(id)
      ? options.noteIds.filter((noteId) => noteId !== id)
      : [...options.noteIds, id].sort();
    onChange({ ...options, noteIds, sectionIds: noteIds.length > 0 ? [] : options.sectionIds });
  }
  function toggleSection(id: string) {
    const next = options.sectionIds.includes(id)
      ? options.sectionIds.filter((sectionId) => sectionId !== id)
      : [...options.sectionIds, id].sort();
    onChange({ ...options, sectionIds: next, noteIds: next.length > 0 ? [] : options.noteIds });
  }

  const query = noteQuery.trim().toLowerCase();
  const matches = notes.filter((note) => note.title.toLowerCase().includes(query));
  const visibleNotes = matches.slice(0, 30);
  const pickedCount = options.noteIds.length;

  return (
    <Card>
      <CardSection className="space-y-6 py-8">
        <div className="space-y-1.5 text-center">
          <Eyebrow>Set up the {noun}</Eyebrow>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-muted">
            {kind === "practice"
              ? "Every question comes from notes this class shared. Nothing outside the Pot goes in."
              : "Everything in it comes from notes this class shared. Nothing outside the Pot goes in."}
          </p>
        </div>

        <fieldset className={cn("space-y-2", kind !== "practice" && "hidden")}>
          <legend className="text-[13px] font-medium text-ink">How many questions</legend>
          <div className="flex flex-wrap gap-2">
            {QUESTION_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                aria-pressed={options.questionCount === count}
                onClick={() => onChange({ ...options, questionCount: count })}
                className={cn(
                  CHOICE,
                  options.questionCount === count
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-edge-strong bg-surface text-ink-muted hover:bg-sunken",
                )}
              >
                {count}
              </button>
            ))}
            <span className="inline-flex items-center gap-1 text-[12px] text-ink-faint">
              <Clock className="size-3.5" aria-hidden />
              about {estimatedMinutes(options.questionCount)} min
            </span>
          </div>
        </fieldset>

        <fieldset className={cn("space-y-2", kind !== "practice" && "hidden")}>
          <legend className="text-[13px] font-medium text-ink">Difficulty level</legend>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((entry) => (
              <button
                key={entry.key}
                type="button"
                aria-pressed={options.difficulty === entry.key}
                onClick={() =>
                  onChange({ ...options, difficulty: entry.key as PracticeDifficulty })
                }
                className={cn(
                  CHOICE,
                  options.difficulty === entry.key
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-edge-strong bg-surface text-ink-muted hover:bg-sunken",
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-ink-faint">
            {DIFFICULTIES.find((entry) => entry.key === options.difficulty)?.hint}
          </p>
        </fieldset>

        {notes.length > 0 ? (
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-medium text-ink">Which notes</legend>
            <p className="text-[12px] text-ink-faint">
              Build from particular notes, or leave this empty and choose by part below.
            </p>
            {notes.length > 8 ? (
              <div className="relative">
                <MagnifyingGlass
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
                  aria-hidden
                />
                <Input
                  value={noteQuery}
                  onChange={(event) => setNoteQuery(event.target.value)}
                  placeholder="Search the notes"
                  aria-label="Search the notes"
                  className="pl-9"
                />
              </div>
            ) : null}
            {pickedCount > 0 ? (
              <p className="text-[12px] text-ink-faint">
                {pickedCount} {pickedCount === 1 ? "note" : "notes"} picked.{" "}
                <button
                  type="button"
                  onClick={() => onChange({ ...options, noteIds: [] })}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Clear
                </button>
              </p>
            ) : null}
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-(--radius-control) border border-edge bg-surface p-1.5">
              {visibleNotes.map((note) => {
                const on = options.noteIds.includes(note.id);
                return (
                  <button
                    key={note.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleNote(note.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-full px-3.5 py-1.5 text-left text-[13px] transition-colors",
                      on
                        ? "bg-primary-soft font-medium text-primary"
                        : "text-ink-muted hover:bg-sunken hover:text-ink",
                    )}
                  >
                    <span className="truncate">{note.title}</span>
                    {on ? <Check weight="bold" className="size-3.5 shrink-0" aria-hidden /> : null}
                  </button>
                );
              })}
              {matches.length === 0 ? (
                <p className="px-2.5 py-1.5 text-[12px] text-ink-faint">No notes match that.</p>
              ) : null}
              {matches.length > visibleNotes.length ? (
                <p className="px-2.5 py-1 text-[12px] text-ink-faint">
                  And {matches.length - visibleNotes.length} more. Search to narrow it.
                </p>
              ) : null}
            </div>
          </fieldset>
        ) : null}

        {sections.length > 0 ? (
          <fieldset className={cn("space-y-2", pickedCount > 0 && "opacity-50")}>
            <legend className="text-[13px] font-medium text-ink">Which parts</legend>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={options.sectionIds.length === 0 && pickedCount === 0}
                onClick={() => onChange({ ...options, sectionIds: [], noteIds: [] })}
                className={cn(
                  CHOICE,
                  options.sectionIds.length === 0 && pickedCount === 0
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-edge-strong bg-surface text-ink-muted hover:bg-sunken",
                )}
              >
                The whole Pot
              </button>
              {sections.map((section) => {
                const on = options.sectionIds.includes(section.id);
                return (
                  <button
                    key={section.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleSection(section.id)}
                    className={cn(
                      CHOICE,
                      "max-w-full",
                      on
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-edge-strong bg-surface text-ink-muted hover:bg-sunken",
                    )}
                  >
                    <span className="truncate">{section.title}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {kind === "graph" && onTier ? (
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-medium text-ink">How carefully</legend>
            <div className="flex flex-wrap gap-2">
              {GRAPH_TIERS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  aria-pressed={tier === entry.key}
                  onClick={() => onTier(entry.key)}
                  className={cn(
                    CHOICE,
                    tier === entry.key
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-edge-strong bg-surface text-ink-muted hover:bg-sunken",
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-ink-faint">
              {GRAPH_TIERS.find((entry) => entry.key === tier)?.hint}
            </p>
          </fieldset>
        ) : null}

        <Field
          label="Anything to concentrate on"
          hint={`Optional. Name a topic and the ${noun} leans that way.`}
        >
          {(props) => (
            <Input
              {...props}
              value={options.emphasis}
              maxLength={MAX_EMPHASIS}
              placeholder="Osmosis problems and the cell cycle order"
              onChange={(event) => onChange({ ...options, emphasis: event.target.value })}
            />
          )}
        </Field>

        {error ? (
          <div className="flex flex-col items-center gap-3">
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
            {errorAction}
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {hasSaved ? (
              <>
                <Button onClick={onOpenSaved}>
                  Open the saved {noun}
                </Button>
                <Button variant="secondary" onClick={onBuild} disabled={busy}>
                  {busy ? (
                    <>
                      <Stir size={16} />
                      {kind === "practice" ? "Writing" : "Building"}
                    </>
                  ) : (
                    kind === "practice" ? "Write a new one" : "Build a new one"
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={onBuild} disabled={busy}>
                {busy ? (
                  <>
                    <Stir size={16} tone="on-primary" />
                    {kind === "practice" ? "Writing the test" : `Building the ${noun}`}
                  </>
                ) : (
                  kind === "practice" ? "Write the test" : `Build the ${noun}`
                )}
              </Button>
            )}
          </div>
          {/* Changing a setting looks for the test those settings describe. It
              says so here, in one line, rather than replacing this whole form
              with a loading screen and throwing away what has been typed. */}
          <p className="min-h-4 text-center text-[12px] text-ink-faint" aria-live="polite">
            {checking
              ? "Checking what the Pot already has."
              : hasSaved
                ? "The class already has a test with these settings."
                : ""}
          </p>
        </div>
      </CardSection>
    </Card>
  );
}

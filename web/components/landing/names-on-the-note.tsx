"use client";

import { useState } from "react";
import { motion, useReducedMotion, type Transition } from "framer-motion";
import { AttributionRow, Avatar } from "@/components/ui/avatar";
import { Card, CardSection } from "@/components/ui/card";
import { RolePill, SectionPill, StatusPill } from "@/components/ui/pills";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/cn";

// The one sentence three people touched. Both readings are kept as constants
// because each appears in two of the three states.
const AS_WRITTEN = "The body uses it for growth and repair.";
const AS_CORRECTED =
  "The body uses it for growth, repair, and replacing worn-out cells; most of your cells divide this way.";

// The tints the correction views use, at a coarser grain: whole sentences
// rather than words. DiffText is fixed to sans at 14px and this body is serif
// at 15, so the marks are written out here instead of imported.
const REMOVED =
  "rounded px-0.5 bg-removed-soft text-removed line-through decoration-removed/50";
const ADDED = "rounded px-0.5 bg-added-soft text-added no-underline";

const PEOPLE = [
  {
    id: "ava",
    name: "Ava Morgan",
    railDetail: "Wrote it and shared it with the class",
    owner: false,
    tone: "neutral",
    status: "Version 1",
    sentence: AS_WRITTEN,
    label: null,
    credit: "First shared by Ava Morgan",
    detail: null,
    reviewer: null,
    footer: "This is how Ava wrote it. This version never goes away.",
  },
  {
    id: "omar",
    name: "Omar Haddad",
    railDetail: "Corrected one sentence",
    owner: false,
    tone: "pending",
    status: "Waiting for review",
    sentence: (
      <>
        <mark className={REMOVED}>{AS_WRITTEN}</mark>{" "}
        <mark className={ADDED}>{AS_CORRECTED}</mark>
      </>
    ),
    label: "Struck through is removed. Tinted is added.",
    credit: "Correction proposed by Omar Haddad",
    detail: {
      reason: "Incomplete",
      explanation:
        "The textbook lists three functions, not two, and the scope matters for the exam.",
      source: "OpenStax Biology, section 10.2",
    },
    reviewer: null,
    footer:
      "The note has not changed yet. It stays as Ava wrote it until a maintainer decides.",
  },
  {
    id: "maya",
    name: "Maya Chen",
    railDetail: "Read the correction and accepted it",
    owner: true,
    tone: "success",
    status: "Current",
    sentence: <mark className={ADDED}>{AS_CORRECTED}</mark>,
    label: "Tinted words arrived in version 2, from Omar's correction.",
    credit: "Correction by Omar Haddad, approved by Maya Chen",
    detail: null,
    reviewer: "Maya wrote: Good catch, this matches the textbook.",
    footer: "Version 1 is still here, exactly as Ava wrote it.",
  },
] as const;

// Maya last: the note as the class actually finds it, correction in and a
// person's name on the approval. Everything before it is how it got there.
const RESTING_STATE = 2;

const CROSSFADE: Transition = { duration: 0.18, ease: [0.22, 1, 0.36, 1] };

/**
 * Three people, one paragraph, and the record of who did what to it. The rail
 * selects a person and the stage shows the note as it stood in their hands, so
 * the claim that attribution survives every step is demonstrated rather than
 * asserted. Deliberately has no button and no link: the orange card below is
 * the page's only ask.
 */
export function NamesOnTheNote() {
  const [active, setActive] = useState(RESTING_STATE);
  // The resting state is also the server render, so the first paint must not
  // fade: the tint is part of the note, not an effect pointing at it.
  const [switched, setSwitched] = useState(false);
  const reduced = useReducedMotion();
  const person = PEOPLE[active];

  // Framer writes inline styles that the global reduced-motion CSS cannot
  // reach, so the preference is honored here instead.
  const still = reduced || !switched;
  const fade = {
    initial: still ? false : { opacity: 0 },
    animate: { opacity: 1 },
    transition: CROSSFADE,
  };

  function choose(index: number) {
    setSwitched(true);
    setActive(index);
  }

  return (
    <section
      aria-label="Who is behind a shared note"
      className="px-6 sm:px-10 py-24 sm:py-36 bg-surface border-y border-edge"
    >
      <Reveal className="mx-auto w-full max-w-5xl space-y-16">
        <div className="max-w-2xl space-y-5">
          <div className="space-y-3">
            <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
              The people in the Pot
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
              The notes have names on them.
            </h2>
          </div>
          <p className="text-lg text-ink-muted leading-relaxed">
            A shared note carries the person who wrote it, the person who
            corrected it, and the person who read that correction and said yes.
            Nobody here is anonymous, and nobody is keeping score. When you open
            a note two days before the test, you know who worked it out, and you
            know a person checked the last change to it.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_minmax(0,20rem)] gap-10 lg:gap-14 items-start">
          <Card>
            <CardSection className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionPill>Week 3: Cell division</SectionPill>
                <motion.span
                  key={`status-${person.id}`}
                  className="inline-flex"
                  {...fade}
                >
                  <StatusPill tone={person.tone}>{person.status}</StatusPill>
                </motion.span>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold tracking-tight text-ink">
                  Mitosis vs meiosis
                </h3>
                <AttributionRow
                  name="Ava Morgan"
                  meta="Wrote this note"
                  size="sm"
                />
              </div>

              {/* The third sentence rewraps with the name too, so the
                  paragraph and the record under it are floored together at
                  the correction state, the fullest one, and the record takes
                  up whatever slack is left. Flooring the record on its own
                  still let two lines of paragraph shove the closing line, and
                  the whole page below this section, on every click. */}
              <div className="flex min-h-96 flex-col gap-5">
                <p className="font-serif text-[15px] leading-relaxed text-ink">
                  Mitosis is ordinary cell division. One cell divides once and
                  produces two identical daughter cells.{" "}
                  <motion.span key={`sentence-${person.id}`} {...fade}>
                    {person.sentence}
                  </motion.span>
                </p>

                {/* The closing line holds the floor of the box. */}
                <motion.div
                  key={`record-${person.id}`}
                  className="flex grow flex-col gap-3"
                  {...fade}
                >
                  {person.label ? (
                    <p className="text-[12px] text-ink-faint">{person.label}</p>
                  ) : null}
                  <p className="text-[13px] font-medium text-ink">
                    {person.credit}
                  </p>
                  {person.reviewer ? (
                    <p className="text-[13px] text-ink-muted leading-relaxed">
                      {person.reviewer}
                    </p>
                  ) : null}
                  {person.detail ? (
                    <div className="bg-sunken border border-edge rounded-(--radius-card) px-4 py-3 space-y-1.5">
                      <p className="text-[13px] text-ink">
                        <span className="text-ink-muted">Reason:</span>{" "}
                        {person.detail.reason}
                      </p>
                      <p className="text-[13px] text-ink-muted leading-relaxed">
                        {person.detail.explanation}
                      </p>
                      <p className="text-[13px] text-ink">
                        <span className="text-ink-muted">Source:</span>{" "}
                        {person.detail.source}
                      </p>
                    </div>
                  ) : null}
                  <p className="mt-auto border-t border-edge pt-3 text-[13px] text-ink-muted leading-relaxed">
                    {person.footer}
                  </p>
                </motion.div>
              </div>
            </CardSection>
          </Card>

          <div className="space-y-4">
            <p className="text-[13px] text-ink-muted">
              Choose a name to see what that person did to this note.
            </p>
            <ol aria-label="The people behind this note" className="space-y-3">
              {PEOPLE.map((entry, index) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    aria-pressed={index === active}
                    onClick={() => choose(index)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-(--radius-card) border px-4 py-3.5 text-left transition-colors",
                      index === active
                        ? "border-primary/50 bg-primary-soft/60"
                        : "border-edge bg-surface hover:border-edge-strong",
                    )}
                  >
                    <Avatar name={entry.name} size="sm" className="mt-0.5" />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-medium text-ink">
                          {entry.name}
                        </span>
                        {entry.owner ? <RolePill role="owner" /> : null}
                      </span>
                      <span className="text-[12px] text-ink-muted leading-relaxed">
                        {entry.railDetail}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-1 pt-2 text-center">
          <p className="text-[13px] text-ink-muted">
            One paragraph, three people. Every note in the Pot keeps the same
            record.
          </p>
          <p className="mx-auto max-w-2xl text-[12px] text-ink-faint">
            An example note. Who wrote it, who corrected it, and who approved the
            correction are three separate columns on every version of every note.
          </p>
        </div>
      </Reveal>
    </section>
  );
}

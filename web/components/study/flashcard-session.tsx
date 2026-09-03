"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import {
  ArrowClockwise,
  ArrowLeft,
  ArrowRight,
  Check,
  Shuffle,
  Sparkle,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { SectionPill } from "@/components/ui/pills";
import { cn } from "@/lib/cn";
import {
  cardsWithTag,
  deckTags,
  flashcardProgress,
  flashcardReducer,
  startSession,
  type StudyCard,
} from "@/lib/study/flashcard-session";

const CONTROL =
  "inline-flex size-9 items-center justify-center rounded-full border border-edge-strong bg-surface text-ink transition-colors hover:bg-sunken disabled:opacity-40 disabled:hover:bg-surface";

function ProgressBar({ value, total }: { value: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-sunken"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label="Cards marked"
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/**
 * One side of the card. Both sides are always mounted and stacked, which is
 * what makes the turn a turn: the back is pre-rotated so it reads the right way
 * up once the card has gone half way round, and each side hides its own reverse
 * so only one is ever visible. The hidden side is taken out of the accessibility
 * tree too, or a screen reader would read the answer alongside the question.
 */
function CardFace({
  back = false,
  hidden,
  children,
}: {
  back?: boolean;
  hidden: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      data-face={back ? "back" : "front"}
      // Absent rather than "false" when this side is the one being read, so the
      // attribute is a plain statement about which side is turned away.
      aria-hidden={hidden || undefined}
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto rounded-(--radius-card) border border-edge bg-surface px-8 py-10 text-center [backface-visibility:hidden]",
        back && "[transform:rotateX(180deg)]",
      )}
    >
      {children}
    </div>
  );
}

/**
 * One card at a time, the way anyone actually studies: read the front, decide,
 * turn it over, say whether you knew it. What you say is only kept for as long
 * as the page is open.
 */
export function FlashcardSession({
  cards,
  onRegenerate,
  regenerating,
  onFinished,
  dayCounted = false,
}: {
  cards: StudyCard[];
  onRegenerate: () => void;
  regenerating: boolean;
  /** Called once when a round ends, with how the cards were sorted. */
  onFinished?: (known: number, learning: number) => void;
  /** Whether this round was the first thing to count today on their record. */
  dayCounted?: boolean;
}) {
  const [tag, setTag] = useState<string | null>(null);
  const [session, dispatch] = useReducer(
    flashcardReducer,
    cardsWithTag(cards, null),
    startSession,
  );
  const reduced = useReducedMotion();

  const tags = deckTags(cards);
  const progress = flashcardProgress(session);
  const recordedRound = useRef(false);
  useEffect(() => {
    if (!session.finished) {
      recordedRound.current = false;
      return;
    }
    if (recordedRound.current) return;
    recordedRound.current = true;
    onFinished?.(progress.known, progress.learning);
  }, [session.finished, progress.known, progress.learning, onFinished]);
  const current = cards[session.order[session.position]];

  useEffect(() => {
    if (session.finished) return;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      // A focused control owns its own keys; only stray presses steer the deck.
      const inControl =
        target?.closest("button, a, input, textarea, select") !== null &&
        (event.key === " " || event.key === "Enter");
      if (inControl) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        dispatch({ type: "move", delta: 1 });
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        dispatch({ type: "move", delta: -1 });
      } else if (event.key === " ") {
        event.preventDefault();
        dispatch({ type: "flip" });
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [session.finished]);

  function chooseTag(next: string | null) {
    setTag(next);
    dispatch({ type: "setOrder", order: cardsWithTag(cards, next) });
  }

  const cardIndex = session.order[session.position];

  if (session.finished) {
    return (
      <Results
        progress={progress}
        onReview={() => dispatch({ type: "review" })}
        onRestart={() => dispatch({ type: "restart" })}
        onStudyLearning={() => dispatch({ type: "studyLearning" })}
        onRegenerate={onRegenerate}
        regenerating={regenerating}
        dayCounted={dayCounted}
      />
    );
  }

  return (
    <div className="space-y-4">
      {tags.length > 0 ? (
        <nav aria-label="Filter cards by tag" className="flex flex-wrap gap-2">
          <button type="button" onClick={() => chooseTag(null)} aria-pressed={tag === null}>
            <SectionPill active={tag === null}>All {cards.length}</SectionPill>
          </button>
          {tags.map((entry) => (
            <button
              key={entry.tag}
              type="button"
              onClick={() => chooseTag(entry.tag)}
              aria-pressed={tag === entry.tag}
            >
              <SectionPill active={tag === entry.tag}>
                {entry.tag} {entry.count}
              </SectionPill>
            </button>
          ))}
        </nav>
      ) : null}

      {!current ? (
        <Card>
          <CardSection className="space-y-3 py-10 text-center">
            <p className="text-sm text-ink-muted">No cards carry that tag.</p>
            <div className="flex justify-center">
              <Button variant="secondary" size="sm" onClick={() => chooseTag(null)}>
                Show every card
              </Button>
            </div>
          </CardSection>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-[13px] text-ink-muted">
              <span className="tabular-nums">
                {progress.position} / {progress.total}
              </span>
              <span>
                {progress.known} know it · {progress.learning} still learning
              </span>
            </div>
            <ProgressBar value={progress.answered} total={progress.total} />
          </div>

          {/* The card is one object with two faces, turned on its horizontal
              axis. The perspective lives on the frame so the far edge really
              recedes: without it the rotation flattens into a wipe. */}
          <div className="[perspective:1600px]">
            <motion.button
              // A new card starts face up. Keying on it remounts rather than
              // animating the old card back over, which would read as a second
              // flip nobody asked for.
              key={cardIndex}
              type="button"
              onClick={() => dispatch({ type: "flip" })}
              aria-label={session.showingBack ? "Show the question" : "Show the answer"}
              className="relative block h-72 w-full [transform-style:preserve-3d] sm:h-80"
              initial={reduced ? false : { opacity: 0, x: 36 }}
              animate={{ opacity: 1, x: 0, rotateX: session.showingBack ? 180 : 0 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { duration: 0.44, ease: [0.32, 0.72, 0, 1] as const }
              }
            >
              <CardFace hidden={session.showingBack}>
                <Eyebrow>Question</Eyebrow>
                <p className="font-serif text-xl leading-relaxed text-ink">{current.front}</p>
                <span className="text-[12px] text-ink-faint">
                  Click the card, or press space, to turn it over
                </span>
              </CardFace>
              <CardFace back hidden={!session.showingBack}>
                <Eyebrow>Answer</Eyebrow>
                <p className="font-serif text-[17px] leading-relaxed text-ink">{current.back}</p>
              </CardFace>
            </motion.button>
          </div>

          {/* The card's own source, kept quiet: it is provenance, not the lesson. */}
          <p className="text-center text-[12px] text-ink-faint">
            From {current.sourceNoteTitle || "this Pot"}
            {current.tags.length > 0 ? ` · ${current.tags.join(", ")}` : ""}
          </p>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className={CONTROL}
              onClick={() => dispatch({ type: "move", delta: -1 })}
              disabled={session.position === 0}
              aria-label="Previous card"
            >
              <ArrowLeft className="size-4" aria-hidden />
            </button>

            <div className="flex flex-1 justify-center gap-2.5">
              <Button
                variant="secondary"
                onClick={() => dispatch({ type: "mark", verdict: "learning" })}
              >
                Still learning
              </Button>
              <Button onClick={() => dispatch({ type: "mark", verdict: "known" })}>
                <Check className="size-4" />
                Know it
              </Button>
            </div>

            <button
              type="button"
              className={CONTROL}
              onClick={() => dispatch({ type: "move", delta: 1 })}
              disabled={session.position >= session.order.length - 1}
              aria-label="Next card"
            >
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-edge pt-4">
            <Button
              variant="quiet"
              size="sm"
              onClick={() => dispatch({ type: "shuffle", seed: Math.floor(Math.random() * 2 ** 31) })}
            >
              <Shuffle className="size-4" />
              Shuffle
            </Button>
            <Button variant="quiet" size="sm" onClick={() => dispatch({ type: "restart" })}>
              <ArrowClockwise className="size-4" />
              Start over
            </Button>
            {progress.learning > 0 ? (
              <Button
                variant="quiet"
                size="sm"
                onClick={() => dispatch({ type: "studyLearning" })}
              >
                Study the {progress.learning} still learning
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function Results({
  progress,
  onReview,
  onRestart,
  onStudyLearning,
  onRegenerate,
  regenerating,
  dayCounted,
}: {
  progress: ReturnType<typeof flashcardProgress>;
  onReview: () => void;
  onRestart: () => void;
  onStudyLearning: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
  dayCounted: boolean;
}) {
  return (
    <Card>
      <CardSection className="space-y-6 py-10 text-center">
        <div className="space-y-2">
          <Eyebrow>Round finished</Eyebrow>
          <p className="font-display text-3xl text-ink">
            You knew {progress.known} of {progress.total}
          </p>
          <p className="text-sm text-ink-muted">
            {progress.percentage}% of this round, this time through.
            {dayCounted ? " Today is on your record." : ""}
          </p>
        </div>

        <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
          <div className="rounded-(--radius-control) bg-success-soft px-3 py-3">
            <p className="text-[12px] text-ink-muted">Know it</p>
            <p className="text-lg font-semibold tabular-nums text-success">{progress.known}</p>
          </div>
          <div className="rounded-(--radius-control) bg-pending-soft px-3 py-3">
            <p className="text-[12px] text-ink-muted">Still learning</p>
            <p className="text-lg font-semibold tabular-nums text-pending">
              {progress.learning}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5">
          {progress.learning > 0 ? (
            <Button onClick={onStudyLearning}>
              Study the {progress.learning} still learning
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onRestart}>
            <ArrowClockwise className="size-4" />
            Start over
          </Button>
          <Button variant="quiet" onClick={onReview}>
            Look back through the deck
          </Button>
          <Button variant="quiet" onClick={onRegenerate} disabled={regenerating}>
            <Sparkle className="size-4" />
            {regenerating ? "Building a new deck" : "Build a new deck"}
          </Button>
        </div>
      </CardSection>
    </Card>
  );
}

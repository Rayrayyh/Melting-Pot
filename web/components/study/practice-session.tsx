"use client";

import { useReducer, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  ListChecks,
  Sparkle,
  XCircle,
} from "@phosphor-icons/react";
import { ScoreFlourish } from "@/components/study/score-flourish";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import {
  estimatedMinutes,
  practiceReducer,
  scoreFromMarking,
  scorePractice,
  startPractice,
  type PracticeMarking,
  type PracticeQuestion,
} from "@/lib/study/practice-session";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function ProgressBar({ value, total }: { value: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-sunken"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label="Questions answered"
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/**
 * A practice test taken the way a real one is: one question at a time, nothing
 * marked until it is handed in, and every answer changeable until then. The
 * marking afterwards shows the right answer next to what was chosen and says
 * which note it came from, so a wrong answer sends you back to the source.
 */
export function PracticeSession({
  title,
  questions,
  onRegenerate,
  regenerating,
  mark,
  recorded,
}: {
  title: string;
  questions: PracticeQuestion[];
  /** Back to the setup, where the length, difficulty, and focus are chosen. */
  onRegenerate: () => void;
  regenerating: boolean;
  /**
   * Marks a handed-in test. On a secured set this submits to the server, which
   * holds the answers and writes the attempt down; on a legacy set the page
   * marks itself and nothing is recorded.
   */
  mark: (order: number[], answers: Record<number, number>) => Promise<PracticeMarking>;
  /** Whether handing this test in leaves a record on the Pot. */
  recorded: boolean;
}) {
  const [session, dispatch] = useReducer(
    practiceReducer,
    questions.map((_, index) => index),
    startPractice,
  );
  const [marking, setMarking] = useState<PracticeMarking | null>(null);
  const [handingIn, setHandingIn] = useState(false);
  const [handInError, setHandInError] = useState<string | null>(null);

  async function handIn() {
    if (handingIn) return;
    setHandingIn(true);
    setHandInError(null);
    // The finally matters: mark() reaches the network on a secured set, and a
    // dropped connection must land back on the review screen, not a dead one.
    try {
      const marked = await mark(session.order, session.answers);
      setMarking(marked);
      dispatch({ type: "submit" });
    } catch {
      setHandInError("This test could not be handed in. Check your connection and try again; your answers are still here.");
    } finally {
      setHandingIn(false);
    }
  }

  const score = scorePractice(questions, session);
  const questionIndex = session.order[session.position];
  const question = questions[questionIndex];

  if (session.phase === "start") {
    const minutes = estimatedMinutes(session.order.length);
    return (
      <Card>
        <CardSection className="space-y-6 py-12 text-center">
          <div className="space-y-2">
            <Eyebrow>Practice test</Eyebrow>
            <h2 className="font-display text-2xl text-ink">{title}</h2>
          </div>
          <dl className="mx-auto grid max-w-sm grid-cols-2 gap-3">
            <div className="rounded-(--radius-control) bg-sunken px-3 py-3">
              <dt className="text-[12px] text-ink-muted">Questions</dt>
              <dd className="text-lg font-semibold tabular-nums text-ink">
                {session.order.length}
              </dd>
            </div>
            <div className="rounded-(--radius-control) bg-sunken px-3 py-3">
              <dt className="flex items-center justify-center gap-1 text-[12px] text-ink-muted">
                <Clock className="size-3.5" aria-hidden />
                About
              </dt>
              <dd className="text-lg font-semibold tabular-nums text-ink">
                {minutes} min
              </dd>
            </div>
          </dl>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-muted">
            Nothing is marked until you hand it in, and you can change any answer
            before then. Every question comes from a note this class shared.
          </p>
          <div className="flex justify-center">
            <Button onClick={() => dispatch({ type: "begin" })}>Start the test</Button>
          </div>
        </CardSection>
      </Card>
    );
  }

  if (session.phase === "results" && marking) {
    const marked = scoreFromMarking(session.order, marking);
    return (
      <PracticeResults
        questions={questions}
        order={session.order}
        marking={marking}
        score={marked}
        recorded={recorded}
        onRetryIncorrect={() => {
          setMarking(null);
          dispatch({ type: "retryIncorrect", incorrect: marked.missed });
        }}
        onRestart={() => {
          setMarking(null);
          dispatch({ type: "restart", order: questions.map((_, index) => index) });
        }}
        onRegenerate={onRegenerate}
        regenerating={regenerating}
      />
    );
  }

  if (session.phase === "review") {
    return (
      <div className="space-y-4">
        <Card>
          <CardSection className="space-y-4">
            <div className="space-y-1">
              <Eyebrow>Before you hand it in</Eyebrow>
              <h2 className="text-lg font-semibold text-ink">
                {score.answered} of {score.total} answered
              </h2>
              <p className="text-sm text-ink-muted">
                {score.unanswered > 0
                  ? `${score.unanswered} ${
                      score.unanswered === 1 ? "question is" : "questions are"
                    } still blank. A blank answer counts as missed.`
                  : "Everything is answered. Nothing is marked until you hand it in."}
              </p>
            </div>
            <ol className="space-y-2">
              {session.order.map((index, position) => {
                const chosen = session.answers[index];
                return (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({ type: "backToQuestions", position })
                      }
                      className="flex w-full items-start gap-3 rounded-(--radius-control) border border-edge px-3.5 py-2.5 text-left transition-colors hover:border-edge-strong hover:bg-sunken"
                    >
                      <span className="text-[13px] font-semibold tabular-nums text-ink-faint">
                        {position + 1}
                      </span>
                      <span className="min-w-0 flex-1 space-y-0.5">
                        <span className="block truncate text-sm text-ink">
                          {questions[index]?.prompt}
                        </span>
                        <span
                          className={cn(
                            "block text-[12px]",
                            chosen === undefined ? "text-pending" : "text-ink-muted",
                          )}
                        >
                          {chosen === undefined
                            ? "Not answered"
                            : `Your answer: ${questions[index]?.choices[chosen]}`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {handInError ? (
              <p role="alert" className="text-[13px] text-danger">
                {handInError}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2.5">
              <Button
                variant="secondary"
                onClick={() => dispatch({ type: "backToQuestions" })}
                disabled={handingIn}
              >
                Keep answering
              </Button>
              <Button onClick={() => void handIn()} disabled={handingIn}>
                {handingIn ? "Marking" : "Hand it in"}
              </Button>
            </div>
          </CardSection>
        </Card>
      </div>
    );
  }

  if (!question) return null;

  const chosen = session.answers[questionIndex];
  const last = session.position >= session.order.length - 1;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-[13px] text-ink-muted">
          <span className="tabular-nums">
            Question {session.position + 1} of {session.order.length}
          </span>
          <span className="tabular-nums">{score.answered} answered</span>
        </div>
        <ProgressBar value={score.answered} total={score.total} />
      </div>

      <Card>
        <CardSection className="space-y-4">
          <p className="text-[17px] font-medium leading-relaxed text-ink">
            {question.prompt}
          </p>
          <fieldset className="space-y-2">
            <legend className="sr-only">Choose one answer</legend>
            {question.choices.map((choice, choiceIndex) => {
              const picked = chosen === choiceIndex;
              return (
                <label
                  key={choice}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-(--radius-control) border px-3.5 py-3 text-sm transition-colors",
                    picked
                      ? "border-primary bg-primary-soft text-ink"
                      : "border-edge hover:border-edge-strong hover:bg-sunken",
                  )}
                >
                  <input
                    type="radio"
                    name={`question-${questionIndex}`}
                    className="sr-only"
                    checked={picked}
                    onChange={() => dispatch({ type: "answer", choice: choiceIndex })}
                  />
                  <span
                    className={cn(
                      "mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                      picked
                        ? "border-primary bg-primary text-on-primary"
                        : "border-edge-strong text-ink-faint",
                    )}
                    aria-hidden
                  >
                    {LETTERS[choiceIndex]}
                  </span>
                  <span className="leading-relaxed">{choice}</span>
                </label>
              );
            })}
          </fieldset>
          {/* Nothing about right or wrong until the whole test is handed in. */}
          <p className="text-[12px] text-ink-faint">
            You can change this answer until you hand the test in.
          </p>
        </CardSection>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => dispatch({ type: "move", delta: -1 })}
          disabled={session.position === 0}
        >
          <ArrowLeft className="size-4" />
          Previous
        </Button>
        {last ? (
          <Button size="sm" onClick={() => dispatch({ type: "toReview" })}>
            <ListChecks className="size-4" />
            Review answers
          </Button>
        ) : (
          <Button size="sm" onClick={() => dispatch({ type: "move", delta: 1 })}>
            Next
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>

      <nav aria-label="Jump to a question" className="space-y-2 border-t border-edge pt-4">
        <p className="text-[12px] text-ink-faint">Jump to a question</p>
        <ol className="flex flex-wrap gap-1.5">
          {session.order.map((index, position) => {
            const answered = session.answers[index] !== undefined;
            const here = position === session.position;
            return (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "goTo", position })}
                  aria-current={here ? "true" : undefined}
                  aria-label={`Question ${position + 1}${answered ? ", answered" : ", not answered"}`}
                  className={cn(
                    "size-8 rounded-full border text-[12px] font-semibold tabular-nums transition-colors",
                    here
                      ? "border-primary bg-primary text-on-primary"
                      : answered
                        ? "border-primary/30 bg-primary-soft text-primary"
                        : "border-edge-strong bg-surface text-ink-muted hover:bg-sunken",
                  )}
                >
                  {position + 1}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="flex justify-end pt-1">
          <Button variant="quiet" size="sm" onClick={() => dispatch({ type: "toReview" })}>
            Review and hand in
          </Button>
        </div>
      </nav>
    </div>
  );
}

function PracticeResults({
  questions,
  order,
  marking,
  score,
  recorded,
  onRetryIncorrect,
  onRestart,
  onRegenerate,
  regenerating,
}: {
  questions: PracticeQuestion[];
  order: number[];
  marking: PracticeMarking;
  score: ReturnType<typeof scorePractice>;
  recorded: boolean;
  onRetryIncorrect: () => void;
  onRestart: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardSection className="space-y-6 py-10 text-center">
          <div className="space-y-3">
            <Eyebrow>Marked</Eyebrow>
            <ScoreFlourish
              percentage={score.percentage}
              correct={score.correct}
              total={score.total}
            />
            <p className="text-sm text-ink-muted">
              {score.correct === score.total
                ? "Every question. Nothing left to go back to."
                : "Everything you missed is below, with the answer and where it came from."}
            </p>
            {recorded ? (
              <p className="text-[12px] text-ink-faint">
                {marking.firstPass
                  ? "Recorded as your first pass on this test."
                  : "Recorded as a retry. Your first pass stands."}
              </p>
            ) : (
              <p className="text-[12px] text-ink-faint">
                Practice only: this test carries its own answers, so nothing is recorded.
              </p>
            )}
          </div>
          <dl className="mx-auto grid max-w-md grid-cols-3 gap-3">
            <div className="rounded-(--radius-control) bg-success-soft px-3 py-3">
              <dt className="text-[12px] text-ink-muted">Right</dt>
              <dd className="text-lg font-semibold tabular-nums text-success">
                {score.correct}
              </dd>
            </div>
            <div className="rounded-(--radius-control) bg-danger-soft px-3 py-3">
              <dt className="text-[12px] text-ink-muted">Wrong</dt>
              <dd className="text-lg font-semibold tabular-nums text-danger">
                {score.incorrect}
              </dd>
            </div>
            <div className="rounded-(--radius-control) bg-sunken px-3 py-3">
              <dt className="text-[12px] text-ink-muted">Blank</dt>
              <dd className="text-lg font-semibold tabular-nums text-ink-muted">
                {score.unanswered}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap justify-center gap-2.5">
            {score.missed.length > 0 ? (
              <Button onClick={onRetryIncorrect}>
                Try the {score.missed.length} you missed
              </Button>
            ) : null}
            <Button variant="secondary" onClick={onRestart}>
              Take it again
            </Button>
            <Button variant="quiet" onClick={onRegenerate} disabled={regenerating}>
              <Sparkle className="size-4" />
              Change the test
            </Button>
          </div>
        </CardSection>
      </Card>

      <ol className="space-y-3">
        {order.map((index, position) => {
          const question = questions[index];
          const mark = marking.marks[index];
          if (!question || !mark) return null;
          const chosen = mark.choice ?? undefined;
          const right = mark.correct;
          return (
            <li key={index}>
              <Card>
                <CardSection className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    {right ? (
                      <CheckCircle className="mt-0.5 size-5 shrink-0 text-success" weight="fill" aria-hidden />
                    ) : (
                      <XCircle className="mt-0.5 size-5 shrink-0 text-danger" weight="fill" aria-hidden />
                    )}
                    <p className="text-sm font-medium leading-relaxed text-ink">
                      <span className="mr-2 tabular-nums text-ink-faint">{position + 1}.</span>
                      {question.prompt}
                    </p>
                  </div>
                  <dl className="space-y-1.5 pl-7 text-[13px]">
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-ink-muted">Your answer</dt>
                      <dd className={cn(right ? "text-success" : "text-danger")}>
                        {chosen === undefined
                          ? "Left blank"
                          : question.choices[chosen]}
                      </dd>
                    </div>
                    {!right && mark.answerIndex !== null ? (
                      <div className="flex gap-2">
                        <dt className="shrink-0 text-ink-muted">Correct answer</dt>
                        <dd className="text-success">{question.choices[mark.answerIndex]}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <div className="ml-7 rounded-(--radius-control) bg-sunken px-3.5 py-3">
                    <p className="text-[13px] leading-relaxed text-ink-muted">
                      {mark.explanation ?? question.explanation}
                    </p>
                    <p className="mt-1.5 text-[11px] text-ink-faint">
                      From {question.sourceNoteTitle || "this Pot"}
                    </p>
                  </div>
                </CardSection>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

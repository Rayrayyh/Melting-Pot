"use client";

import { useState } from "react";
import { ArrowLeft, Brain, Cards, CheckCircle, Sparkle, XCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { StudyKind } from "@/lib/gemini/contracts";

type SummaryResult = {
  overview: string;
  keyTopics: Array<{ title: string; explanation: string }>;
  stillToConfirm: string[];
};
type FlashcardResult = { cards: Array<{ front: string; back: string; sourceNoteTitle: string }> };
type PracticeResult = {
  title: string;
  questions: Array<{
    prompt: string;
    choices: string[];
    answerIndex: number;
    explanation: string;
    sourceNoteTitle: string;
  }>;
};

const copy = {
  summary: { title: "Summary", description: "Turn the full Pot into a focused study guide.", icon: Sparkle },
  flashcards: { title: "Flashcards", description: "Build recall cards from the notes everyone shared.", icon: Cards },
  practice: { title: "Practice", description: "Generate a rigorous practice test grounded in the Pot.", icon: Brain },
} as const;

export function StudyWorkspace({ potId, potTitle, kind }: { potId: string; potTitle: string; kind: StudyKind }) {
  const [result, setResult] = useState<SummaryResult | FlashcardResult | PracticeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const mode = copy[kind];
  const Icon = mode.icon;

  async function generate() {
    setBusy(true);
    setError(null);
    setAnswers({});
    const response = await fetch("/api/ai/study", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ potId, kind }),
    });
    const payload = await response.json().catch(() => null) as { result?: typeof result; error?: string; detail?: string } | null;
    setBusy(false);
    if (!response.ok || !payload?.result) {
      setError(payload?.error === "gemini_not_configured"
        ? "Gemini isn't configured on this server yet. Add the API key, then restart the app."
        : payload?.error === "no_notes"
          ? "Share at least one note before generating study material."
          : payload?.error === "rate_limited"
            ? "You've generated several study sets recently. Wait a little and try again."
            : payload?.detail || "This study set couldn't be generated.");
      return;
    }
    setResult(payload.result);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-6">
      <Button variant="quiet" size="sm" href={`/p/${potId}`}>
        <ArrowLeft className="size-4" /> Back to {potTitle}
      </Button>
      <header className="flex items-start justify-between gap-5">
        <div className="space-y-1.5">
          <Eyebrow>Study from the full Pot</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight">{mode.title}</h1>
          <p className="text-sm text-ink-muted">{mode.description}</p>
        </div>
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon className="size-5" weight="fill" />
        </span>
      </header>

      {!result ? (
        <Card>
          <CardSection className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="max-w-md text-sm leading-relaxed text-ink-muted">
              Gemini will use the latest shared notes and reviewed image captions. Generated material stays grounded in this Pot.
            </p>
            <Button onClick={() => void generate()} disabled={busy}>
              <Sparkle className="size-4" weight="fill" />
              {busy ? "Generating…" : `Generate ${mode.title.toLowerCase()}`}
            </Button>
            {error ? <p role="alert" className="text-[13px] text-danger">{error}</p> : null}
          </CardSection>
        </Card>
      ) : (
        <div className="space-y-4">
          {kind === "summary" ? <SummaryView result={result as SummaryResult} /> : null}
          {kind === "flashcards" ? <FlashcardView result={result as FlashcardResult} /> : null}
          {kind === "practice" ? (
            <PracticeView result={result as PracticeResult} answers={answers} setAnswers={setAnswers} />
          ) : null}
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => void generate()} disabled={busy}>
              {busy ? "Regenerating…" : "Generate a new set"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryView({ result }: { result: SummaryResult }) {
  return (
    <div className="space-y-4">
      <Card><CardSection><p className="text-[15px] leading-relaxed text-ink">{result.overview}</p></CardSection></Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {result.keyTopics.map((topic) => (
          <Card key={topic.title}><CardSection className="space-y-1.5"><h2 className="font-semibold">{topic.title}</h2><p className="text-sm leading-relaxed text-ink-muted">{topic.explanation}</p></CardSection></Card>
        ))}
      </div>
      {result.stillToConfirm.length ? (
        <Card><CardSection className="space-y-2"><Eyebrow>Still to confirm</Eyebrow><ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">{result.stillToConfirm.map((item) => <li key={item}>{item}</li>)}</ul></CardSection></Card>
      ) : null}
    </div>
  );
}

function FlashcardView({ result }: { result: FlashcardResult }) {
  return <div className="grid gap-3 sm:grid-cols-2">{result.cards.map((card, index) => (
    <details key={`${card.front}-${index}`} className="group rounded-(--radius-card) border border-edge bg-surface p-5 open:border-primary/40">
      <summary className="cursor-pointer list-none font-semibold text-ink">{card.front}<span className="mt-3 block text-[12px] font-normal text-primary group-open:hidden">Reveal answer</span></summary>
      <div className="mt-4 border-t border-edge pt-4"><p className="text-sm leading-relaxed text-ink-muted">{card.back}</p><p className="mt-3 text-[11px] text-ink-faint">From {card.sourceNoteTitle}</p></div>
    </details>
  ))}</div>;
}

function PracticeView({ result, answers, setAnswers }: {
  result: PracticeResult;
  answers: Record<number, number>;
  setAnswers: (answers: Record<number, number>) => void;
}) {
  return <div className="space-y-4"><h2 className="text-lg font-semibold">{result.title}</h2>{result.questions.map((question, index) => {
    const selected = answers[index];
    const answered = selected !== undefined;
    return <Card key={`${question.prompt}-${index}`}><CardSection className="space-y-3">
      <p className="font-medium"><span className="mr-2 text-primary">{index + 1}.</span>{question.prompt}</p>
      <div className="grid gap-2">{question.choices.map((choice, choiceIndex) => {
        const correct = answered && choiceIndex === question.answerIndex;
        const wrong = answered && choiceIndex === selected && selected !== question.answerIndex;
        return <button key={choice} type="button" disabled={answered} onClick={() => setAnswers({ ...answers, [index]: choiceIndex })} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors", correct ? "border-success bg-success-soft" : wrong ? "border-danger bg-danger-soft" : "border-edge hover:border-edge-strong")}>{correct ? <CheckCircle className="size-4 text-success" weight="fill" /> : wrong ? <XCircle className="size-4 text-danger" weight="fill" /> : <span className="size-4 rounded-full border border-edge-strong" />}{choice}</button>;
      })}</div>
      {answered ? <div className="rounded-xl bg-sunken p-3 text-[13px] leading-relaxed text-ink-muted"><p>{question.explanation}</p><p className="mt-1 text-[11px] text-ink-faint">From {question.sourceNoteTitle}</p></div> : null}
    </CardSection></Card>;
  })}</div>;
}

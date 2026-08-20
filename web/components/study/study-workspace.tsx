"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Brain, Cards, Sparkle, TrashSimple } from "@phosphor-icons/react";
import { FlashcardSession } from "@/components/study/flashcard-session";
import { PracticeSession } from "@/components/study/practice-session";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { StudyKind } from "@/lib/gemini/contracts";
import type { StudyCard } from "@/lib/study/flashcard-session";
import type { PracticeQuestion } from "@/lib/study/practice-session";
import { relativeTime } from "@/lib/time";

type SummaryResult = {
  overview: string;
  keyTopics: Array<{ title: string; explanation: string }>;
  stillToConfirm: string[];
};
type FlashcardResult = { cards: StudyCard[] };
type PracticeResult = { title: string; questions: PracticeQuestion[] };
type StudyResult = SummaryResult | FlashcardResult | PracticeResult;

type Loaded = {
  result: StudyResult;
  /** True when the set came out of the Pot's store rather than a fresh call. */
  cached: boolean;
  generatedAt: string | null;
  studySetId: string | null;
};

const copy = {
  summary: {
    title: "Summary",
    description: "Turn the full Pot into a focused study guide.",
    icon: Sparkle,
    build: "Build the summary",
    rebuild: "Build a new summary",
  },
  flashcards: {
    title: "Flashcards",
    description: "Build recall cards from the notes everyone shared.",
    icon: Cards,
    build: "Build the deck",
    rebuild: "Build a new deck",
  },
  practice: {
    title: "Practice",
    description: "Generate a rigorous practice test grounded in the Pot.",
    icon: Brain,
    build: "Write the test",
    rebuild: "Write a new test",
  },
} as const;

function message(error: string | undefined, detail: string | undefined): string {
  if (error === "gemini_not_configured") {
    return "Gemini isn't configured on this server yet. Add the API key, then restart the app.";
  }
  if (error === "no_notes") return "Share at least one note before generating study material.";
  if (error === "rate_limited") {
    return "You've generated several study sets recently. Wait a little and try again.";
  }
  if (error === "not_pot_member") return "You need to be in this Pot to study from it.";
  return detail || "This study set couldn't be generated.";
}

export function StudyWorkspace({
  potId,
  potTitle,
  kind,
  canModerate,
}: {
  potId: string;
  potTitle: string;
  kind: StudyKind;
  /** Maintainers can take a bad set away so the class stops being served it. */
  canModerate: boolean;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [looking, setLooking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const mode = copy[kind];
  const Icon = mode.icon;

  const load = useCallback(
    async (options: { peek?: boolean; regenerate?: boolean }) => {
      const response = await fetch("/api/ai/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ potId, kind, ...options }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { result?: StudyResult; cached?: boolean; generatedAt?: string; studySetId?: string | null; error?: string; detail?: string }
        | null;
      if (!response.ok || !payload?.result) {
        return { failure: payload?.error, detail: payload?.detail };
      }
      return {
        loaded: {
          result: payload.result,
          cached: payload.cached === true,
          generatedAt: payload.generatedAt ?? null,
          studySetId: payload.studySetId ?? null,
        } satisfies Loaded,
      };
    },
    [potId, kind],
  );

  // What the Pot already has appears without asking for anything, and without
  // spending a generation.
  useEffect(() => {
    let live = true;
    void load({ peek: true }).then((outcome) => {
      if (!live) return;
      if (outcome.loaded) setLoaded(outcome.loaded);
      setLooking(false);
    });
    return () => {
      live = false;
    };
  }, [load]);

  async function generate(regenerate: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const outcome = await load({ regenerate });
    setBusy(false);
    if (!outcome.loaded) {
      setError(message(outcome.failure, outcome.detail));
      return;
    }
    setLoaded(outcome.loaded);
  }

  async function removeSet() {
    if (!loaded?.studySetId || deleting) return;
    setDeleting(true);
    const { error: rpcError } = await supabaseBrowser().rpc("delete_study_set", {
      p_study_set_id: loaded.studySetId,
    });
    setDeleting(false);
    setAsking(false);
    if (rpcError) {
      setError("That set could not be removed. Try again.");
      return;
    }
    setLoaded(null);
  }

  const regenerating = busy && loaded !== null;

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

      {looking ? (
        <Card>
          <CardSection className="py-12 text-center">
            <p className="text-sm text-ink-muted">Looking for what this Pot already has.</p>
          </CardSection>
        </Card>
      ) : !loaded ? (
        <Card>
          <CardSection className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="max-w-md text-sm leading-relaxed text-ink-muted">
              Gemini will use the latest shared notes and reviewed image captions.
              Generated material stays grounded in this Pot, and the class shares
              what you build here until someone shares a new note.
            </p>
            <Button onClick={() => void generate(false)} disabled={busy}>
              <Sparkle className="size-4" weight="fill" />
              {busy ? "Generating" : mode.build}
            </Button>
            {error ? (
              <p role="alert" className="text-[13px] text-danger">
                {error}
              </p>
            ) : null}
          </CardSection>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge pb-3">
            <p className="text-[12px] text-ink-faint">
              {loaded.cached && loaded.generatedAt
                ? `Built ${relativeTime(loaded.generatedAt)} from the notes as they are now. Everyone in the Pot sees this one.`
                : "Built just now from the notes as they are now."}
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="quiet"
                size="sm"
                onClick={() => void generate(true)}
                disabled={busy}
              >
                <Sparkle className="size-4" />
                {regenerating ? "Working" : mode.rebuild}
              </Button>
              {canModerate && loaded.studySetId ? (
                <Button variant="quiet" size="sm" onClick={() => setAsking(true)}>
                  <TrashSimple className="size-4" />
                  Remove this set
                </Button>
              ) : null}
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          ) : null}

          {kind === "summary" ? <SummaryView result={loaded.result as SummaryResult} /> : null}
          {kind === "flashcards" ? (
            <FlashcardSession
              // A rebuilt deck is a new session, not the old one with new cards.
              key={loaded.generatedAt ?? "deck"}
              cards={(loaded.result as FlashcardResult).cards}
              onRegenerate={() => void generate(true)}
              regenerating={busy}
            />
          ) : null}
          {kind === "practice" ? (
            <PracticeSession
              key={loaded.generatedAt ?? "test"}
              title={(loaded.result as PracticeResult).title}
              questions={(loaded.result as PracticeResult).questions}
              onRegenerate={() => void generate(true)}
              regenerating={busy}
            />
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={asking}
        title="Remove this set from the Pot?"
        confirmLabel={deleting ? "Removing" : "Remove"}
        tone="danger"
        busy={deleting}
        onConfirm={() => void removeSet()}
        onCancel={() => setAsking(false)}
      >
        <p>
          The class stops being served this set. The notes it was built from are
          untouched, and anyone can build a new one.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function SummaryView({ result }: { result: SummaryResult }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardSection>
          <p className="text-[15px] leading-relaxed text-ink">{result.overview}</p>
        </CardSection>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {result.keyTopics.map((topic) => (
          <Card key={topic.title}>
            <CardSection className="space-y-1.5">
              <h2 className="font-semibold">{topic.title}</h2>
              <p className="text-sm leading-relaxed text-ink-muted">{topic.explanation}</p>
            </CardSection>
          </Card>
        ))}
      </div>
      {result.stillToConfirm.length ? (
        <Card>
          <CardSection className="space-y-2">
            <Eyebrow>Still to confirm</Eyebrow>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
              {result.stillToConfirm.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardSection>
        </Card>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkle } from "@phosphor-icons/react";
import type { Json } from "@/lib/database.types";
import { checkRecord, type RecordCheck } from "@/app/actions/record";
import { StillStirring } from "@/components/streak/still-stirring";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { Stir } from "@/components/brand/stir";
import { PracticeSession } from "@/components/study/practice-session";
import {
  markLocally,
  type PracticeMarking,
  type PracticeQuestion,
} from "@/lib/study/practice-session";
import { utcDay } from "@/lib/study/daily";
import { supabaseBrowser } from "@/lib/supabase/client";

type DailyPayload = { title: string; questions: PracticeQuestion[] };
type DailyLoad = {
  result: DailyPayload;
  studySetId: string | null;
  secured: boolean;
  cached: boolean;
};

/**
 * The Pot's one quiz for the day: the same five questions for everyone, taken
 * once, marked on the server. Whoever opens it first on a day brings it in and
 * spends that one build; everyone after that opens what is already here.
 */
export function DailyQuiz({
  potId,
  potTitle,
}: {
  potId: string;
  potTitle: string;
}) {
  const router = useRouter();
  const [load, setLoad] = useState<DailyLoad | null>(null);
  const [checking, setChecking] = useState(true);
  const [building, setBuilding] = useState(false);
  const [sitting, setSitting] = useState(false);
  const [taken, setTaken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationClosed, setGenerationClosed] = useState(false);
  const [record, setRecord] = useState<RecordCheck | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const askedRef = useRef(false);

  useEffect(() => {
    if (askedRef.current) return;
    askedRef.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/ai/study", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ potId, kind: "daily", peek: true, options: {} }),
        });
        if (response.ok) {
          setLoad((await response.json()) as DailyLoad);
        } else if (response.status === 403) {
          setGenerationClosed(true);
        }
        // 404 simply means nobody has brought today's quiz in yet.
      } catch {
        setError("Today's quiz could not be looked for. Try again.");
      } finally {
        setChecking(false);
      }
    })();
  }, [potId]);

  async function bringIn() {
    if (building) return;
    setBuilding(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ potId, kind: "daily", options: {} }),
      });
      const body = (await response.json().catch(() => null)) as
        | (DailyLoad & { error?: string })
        | { error?: string; detail?: string }
        | null;
      if (!response.ok || !body || !("result" in body) || !body.result) {
        if (body?.error === "generation_closed") setGenerationClosed(true);
        else if (body?.error === "rate_limited") setError("The class has built a lot today. Try again in a little while.");
        else setError("Today's quiz could not be built. Try again in a moment.");
        return;
      }
      setLoad(body as DailyLoad);
    } catch {
      // The build may have landed even if the reply did not, so look again
      // before claiming failure.
      const response = await fetch("/api/ai/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ potId, kind: "daily", peek: true, options: {} }),
      }).catch(() => null);
      if (response?.ok) {
        setLoad((await response.json()) as DailyLoad);
      } else {
        setError("Today's quiz could not be built. Try again in a moment.");
      }
    } finally {
      setBuilding(false);
    }
  }

  const mark = async (
    order: number[],
    answers: Record<number, number>,
  ): Promise<PracticeMarking> => {
    const questions = load?.result.questions ?? [];
    if (!load?.secured || !load.studySetId) {
      // A quiz whose server save failed marks itself and records nothing,
      // exactly like a legacy practice set.
      return markLocally(questions, order, answers);
    }
    const { data, error: rpcError } = await supabaseBrowser().rpc("submit_daily_quiz", {
      p_attempt_id: crypto.randomUUID(),
      p_set_id: load.studySetId,
      p_answers: { order, choices: answers } as unknown as Json,
    });
    if (rpcError) {
      if (rpcError.message.includes("already_taken")) {
        setTaken(true);
        throw new Error("You have already taken today's quiz. It comes back tomorrow.");
      }
      throw new Error("Today's quiz could not be marked. Try once more.");
    }
    const returned = data as {
      firstPass?: boolean;
      correct?: number;
      total?: number;
      marks?: Array<{
        index: number;
        choice: number | null;
        correct: boolean;
        answerIndex: number | null;
        explanation: string | null;
      }>;
    };
    const marks: Record<number, { choice: number | null; correct: boolean; answerIndex: number | null; explanation: string | null }> = {};
    for (const mark of returned.marks ?? []) {
      marks[mark.index] = {
        choice: mark.choice,
        correct: mark.correct === true,
        answerIndex: mark.answerIndex,
        explanation: mark.explanation,
      };
    }
    const check = await checkRecord().catch(() => null);
    const countedNow = Boolean(check?.countedNow);
    if (countedNow) {
      setRecord(check);
      setCelebrating(true);
      router.refresh();
    }
    return {
      firstPass: returned.firstPass === true,
      correct: returned.correct ?? 0,
      total: returned.total ?? order.length,
      marks,
      countedToday: countedNow,
    };
  };

  if (sitting && load) {
    return (
      <div className="space-y-4" data-no-shortcuts>
        {record?.countedNow ? (
          <StillStirring
            open={celebrating}
            days={record.days}
            week={record.week}
            onClose={() => setCelebrating(false)}
          />
        ) : null}
        <PracticeSession
          title={load.result.title || "Today's quiz"}
          questions={load.result.questions}
          onRegenerate={() => setSitting(false)}
          regenerating={false}
          mark={mark}
          recorded={Boolean(load.secured && load.studySetId)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-6">
      <Button variant="quiet" size="sm" href={`/p/${potId}`}>
        <ArrowLeft className="size-4" /> Back to {potTitle}
      </Button>
      {record?.countedNow ? (
        <StillStirring
          open={celebrating}
          days={record.days}
          week={record.week}
          onClose={() => setCelebrating(false)}
        />
      ) : null}
      <Card>
        <CardSection className="space-y-5 py-8">
          <div className="space-y-1.5 text-center">
            <Eyebrow>Daily quiz</Eyebrow>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-muted">
              Five questions from the Pot, the same for everyone today, marked
              on the server. It comes back tomorrow as a new one.
            </p>
          </div>

          {checking ? (
            <p className="min-h-4 text-center text-[12px] text-ink-faint" aria-live="polite">
              Checking whether today&apos;s quiz is here.
            </p>
          ) : null}

          {!checking && error ? (
            <p role="alert" className="text-center text-[13px] text-danger">
              {error}
            </p>
          ) : null}

          {!checking && taken ? (
            <p className="text-center text-[13px] text-ink-muted">
              You have already taken today&apos;s quiz. It comes back tomorrow.
            </p>
          ) : null}

          {!checking && !taken ? (
            load ? (
              <div className="flex flex-col items-center gap-3">
                <Button onClick={() => setSitting(true)}>
                  <Sparkle className="size-4" />
                  Take today&apos;s quiz
                </Button>
                <p className="text-[12px] text-ink-faint">
                  {load.cached
                    ? "Brought in earlier today, ready for you."
                    : "Built just now, ready for you."}
                </p>
              </div>
            ) : generationClosed ? (
              <p className="text-center text-[13px] text-ink-muted">
                This Pot is set so only maintainers bring in study material.
                Today&apos;s quiz appears here once one of them opens this page.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Button onClick={() => void bringIn()} disabled={building}>
                  {building ? (
                    <>
                      <Stir size={16} tone="on-primary" />
                      Building
                    </>
                  ) : (
                    <>
                      <Sparkle className="size-4" />
                      Bring in today&apos;s quiz
                    </>
                  )}
                </Button>
                <p className="max-w-sm text-center text-[12px] text-ink-faint">
                  Whoever opens this first today spends one build, and the whole
                  class gets the same questions until midnight UTC.
                </p>
              </div>
            )
          ) : null}
        </CardSection>
      </Card>
      <p className="text-center text-[12px] text-ink-faint">
        {utcDay()} · one quiz a day, for the whole Pot
      </p>
    </div>
  );
}

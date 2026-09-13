"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Json } from "@/lib/database.types";
import { checkRecord, type RecordCheck } from "@/app/actions/record";
import { StillStirring } from "@/components/streak/still-stirring";
import { FlashcardSession } from "@/components/study/flashcard-session";
import { PracticeSession } from "@/components/study/practice-session";
import type { PracticeMarking, PracticeQuestion } from "@/lib/study/practice-session";
import { markLocally } from "@/lib/study/practice-session";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { StudyKind } from "@/lib/mix/contracts";
import type { StudyCard } from "@/lib/study/flashcard-session";

/**
 * One stored set, drawn on its own: what a permalink shows.
 *
 * The rendering is deliberately simple rather than a refactor of the study
 * workspace: a permalink is how material arrives from outside (a Classroom
 * post, a link a classmate passed on), and what it must do is open the set
 * and mark it exactly the same way the study pages do. Summaries are read
 * only; decks record their rounds; tests are marked on the server when the
 * set is secured, which its payload here never contradicts, because the keys
 * live in their own table and cannot reach this component.
 */
export function SetView({ setId, kind, payload }: {
  setId: string;
  kind: StudyKind;
  payload: Record<string, unknown>;
}) {
  const router = useRouter();
  const [record, setRecord] = useState<RecordCheck | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const celebratedRef = useRef(false);
  const celebrateOnce = useCallback(
    (check: RecordCheck) => {
      if (celebratedRef.current) return;
      celebratedRef.current = true;
      setRecord(check);
      setCelebrating(true);
      router.refresh();
    },
    [router],
  );

  if (kind === "summary") {
    return (
      <SummaryPayload payload={payload} />
    );
  }

  if (kind === "flashcards") {
    const cards = Array.isArray(payload.cards) ? (payload.cards as StudyCard[]) : [];
    return (
      <RecordWrap record={record} celebrating={celebrating} onClose={() => setCelebrating(false)}>
        <FlashcardSession
          cards={cards}
          onRegenerate={() => undefined}
          regenerating={false}
          onFinished={async (known, learning) => {
            await supabaseBrowser().rpc("record_flashcard_run", {
              p_attempt_id: crypto.randomUUID(),
              p_set_id: setId,
              p_known: known,
              p_learning: learning,
            });
            const check = await checkRecord().catch(() => null);
            if (check?.countedNow && !celebratedRef.current) {
              celebratedRef.current = true;
              setRecord(check);
              setCelebrating(true);
              router.refresh();
            }
          }}
        />
      </RecordWrap>
    );
  }

  return (
    <PracticePayload
      setId={setId}
      payload={payload}
      record={record}
      celebrating={celebrating}
      onCelebrate={celebrateOnce}
      onCloseCelebration={() => setCelebrating(false)}
    />
  );
}

function RecordWrap({ record, celebrating, onClose, children }: {
  record: RecordCheck | null;
  celebrating: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {record?.countedNow ? (
        <StillStirring open={celebrating} days={record.days} week={record.week} onClose={onClose} />
      ) : null}
      {children}
    </>
  );
}

function SummaryPayload({ payload }: { payload: Record<string, unknown> }) {
  const topics = Array.isArray(payload.keyTopics)
    ? (payload.keyTopics as Array<{ title?: unknown; explanation?: unknown }>)
    : [];
  const still = Array.isArray(payload.stillToConfirm) ? (payload.stillToConfirm as string[]) : [];
  return (
    <div className="space-y-4">
      <Card>
        <CardSection>
          <p className="text-[15px] leading-relaxed text-ink">
            {typeof payload.overview === "string" ? payload.overview : ""}
          </p>
        </CardSection>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {topics.map((topic, index) =>
          typeof topic.title === "string" ? (
            <Card key={index}>
              <CardSection className="space-y-1.5">
                <h2 className="font-semibold">{topic.title}</h2>
                <p className="text-sm leading-relaxed text-ink-muted">
                  {typeof topic.explanation === "string" ? topic.explanation : ""}
                </p>
              </CardSection>
            </Card>
          ) : null,
        )}
      </div>
      {still.length ? (
        <Card>
          <CardSection className="space-y-2">
            <Eyebrow>Still to confirm</Eyebrow>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
              {still.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardSection>
        </Card>
      ) : null}
    </div>
  );
}

function PracticePayload({ setId, payload, record, celebrating, onCelebrate, onCloseCelebration }: {
  setId: string;
  payload: Record<string, unknown>;
  record: RecordCheck | null;
  celebrating: boolean;
  onCelebrate: (check: RecordCheck) => void;
  onCloseCelebration: () => void;
}) {
  const router = useRouter();
  const [secured, setSecured] = useState<boolean | null>(null);
  const questions = useMemo(
    () => (Array.isArray(payload.questions) ? (payload.questions as PracticeQuestion[]) : []),
    [payload.questions],
  );

  useEffect(() => {
    void (async () => {
      const { data } = await supabaseBrowser()
        .from("study_sets")
        .select("secured")
        .eq("id", setId)
        .maybeSingle();
      setSecured(data?.secured === true);
    })();
  }, [setId]);

  const mark = useCallback(
    async (order: number[], answers: Record<number, number>): Promise<PracticeMarking> => {
      if (!secured) return markLocally(questions, order, answers);
      const { data, error } = await supabaseBrowser().rpc("submit_practice_test", {
        p_attempt_id: crypto.randomUUID(),
        p_set_id: setId,
        p_answers: { order, choices: answers } as unknown as Json,
      });
      if (error || !data) throw new Error("submit_failed");
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
      if (check?.countedNow) {
        onCelebrate(check);
      }
      router.refresh();
      return {
        firstPass: returned.firstPass === true,
        correct: returned.correct ?? 0,
        total: returned.total ?? order.length,
        marks,
        countedToday: Boolean(check?.countedNow),
      };
    },
    [secured, questions, setId, onCelebrate, router],
  );

  return (
    <RecordWrap record={record} celebrating={celebrating} onClose={onCloseCelebration}>
      {questions.length === 0 ? (
        <p className="text-[13px] text-ink-muted">This set holds no questions any more.</p>
      ) : (
        <PracticeSession
          title={typeof payload.title === "string" ? payload.title : "Practice test"}
          questions={questions}
          onRegenerate={() => undefined}
          regenerating={false}
          mark={mark}
          recorded={secured === true}
        />
      )}
      <p className="text-center text-[12px] text-ink-faint">
        Saved study material from this Pot.
      </p>
    </RecordWrap>
  );
}

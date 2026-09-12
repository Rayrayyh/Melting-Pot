"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { checkRecord, type RecordCheck } from "@/app/actions/record";
import { StillStirring } from "@/components/streak/still-stirring";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  FOCUS_MINUTES,
  focusClock,
  focusReducer,
  focusRemainingMs,
  initialFocusSession,
  MAX_FOCUS_LABEL,
} from "@/lib/study/focus";
import { cn } from "@/lib/cn";

const CHOICE =
  "inline-flex h-10 items-center justify-center rounded-full border px-5 text-[14px] font-medium transition-colors";

/**
 * A timed study session: pick a length, work with the screen quiet, and the
 * minutes land on the record when the clock runs out. Nothing is recorded for
 * leaving early, and the page says so.
 */
export function FocusSession({
  potId,
  potTitle,
}: {
  potId: string;
  potTitle: string;
}) {
  const router = useRouter();
  const [session, dispatch] = useReducer(focusReducer, undefined, initialFocusSession);
  const [now, setNow] = useState(() => Date.now());
  const [record, setRecord] = useState<RecordCheck | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [leftEarly, setLeftEarly] = useState(false);
  const [recording, setRecording] = useState(false);
  const recordedRef = useRef(false);

  const remaining = focusRemainingMs(session, now);

  async function recordRun(minutes: number, label: string) {
    setRecording(true);
    try {
      const supabase = supabaseBrowser();
      await supabase.rpc("record_study_run", {
        p_attempt_id: crypto.randomUUID(),
        p_pot_id: potId,
        p_kind: "focus",
        p_detail: { minutes, label: label.trim() ? label.trim() : null },
      });
      const check = await checkRecord().catch(() => null);
      if (check?.countedNow) {
        setRecord(check);
        setCelebrating(true);
        router.refresh();
      }
    } finally {
      setRecording(false);
    }
  }

  // The clock is read on a short interval, but the remaining time always comes
  // from the anchor, so a backgrounded tab that wakes up late shows what is
  // actually left.
  useEffect(() => {
    if (session.phase !== "running") return;
    const tick = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(tick);
  }, [session.phase]);

  useEffect(() => {
    if (session.phase !== "running" || remaining > 0 || recordedRef.current) return;
    recordedRef.current = true;
    dispatch({ type: "finish" });
    void recordRun(session.minutes ?? 0, session.label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.phase, remaining]);

  function leave() {
    setLeftEarly(true);
    dispatch({ type: "reset" });
  }

  if (session.phase === "choosing") {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-6" data-no-shortcuts>
        <Button variant="quiet" size="sm" href={`/p/${potId}`}>
          <ArrowLeft className="size-4" /> Back to {potTitle}
        </Button>
        <Card>
          <CardSection className="space-y-6 py-8">
            <div className="space-y-1.5 text-center">
              <Eyebrow>Focus</Eyebrow>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-muted">
                Pick how long, then work with the screen quiet. When the clock
                runs out, the minutes land on your record. Nobody else sees
                them.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {FOCUS_MINUTES.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => {
                    recordedRef.current = false;
                    setLeftEarly(false);
                    setRecord(null);
                    const startedAt = Date.now();
                    dispatch({ type: "start", minutes, now: startedAt });
                    setNow(startedAt);
                  }}
                  className={cn(CHOICE, "border-edge-strong bg-surface text-ink-muted hover:bg-sunken hover:text-ink")}
                >
                  {minutes} min
                </button>
              ))}
            </div>
            <Field
              label="What are you working on"
              hint="Optional. Only you see this."
            >
              {(props) => (
                <Input
                  {...props}
                  value={session.label}
                  maxLength={MAX_FOCUS_LABEL}
                  placeholder="Chapter 4 diagrams"
                  onChange={(event) => dispatch({ type: "label", label: event.target.value })}
                />
              )}
            </Field>
            <p className="min-h-4 text-center text-[12px] text-ink-faint" aria-live="polite">
              {leftEarly ? "You left the session early. Nothing was recorded." : ""}
            </p>
          </CardSection>
        </Card>
      </div>
    );
  }

  if (session.phase === "running") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6" data-no-shortcuts>
        <p className="text-[13px] text-ink-muted">{potTitle}</p>
        <p
          role="timer"
          aria-live="off"
          className="text-[72px] font-semibold tabular-nums tracking-tight text-ink"
        >
          {focusClock(remaining)}
        </p>
        {session.label.trim() ? (
          <p className="text-[13px] text-ink-faint">{session.label}</p>
        ) : null}
        <p className="text-[12px] text-ink-faint">
          Nothing is recorded unless the clock runs out.
        </p>
        <Button variant="secondary" size="sm" onClick={leave} disabled={recording}>
          Leave
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-6" data-no-shortcuts>
      {record?.countedNow ? (
        <StillStirring
          open={celebrating}
          days={record.days}
          week={record.week}
          onClose={() => setCelebrating(false)}
        />
      ) : null}
      <Card>
        <CardSection className="space-y-4 py-10 text-center">
          <p className="text-[13px] text-ink-muted">{potTitle}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {session.minutes} minutes, done.
          </h1>
          <p className="mx-auto max-w-md text-sm text-ink-muted">
            That is on your record. Whether you spent it reading, writing or
            thinking, it counts the same.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button href={`/p/${potId}`} variant="secondary">
              <ArrowLeft className="size-4" />
              Back to {potTitle}
            </Button>
            <Button onClick={() => dispatch({ type: "reset" })}>Another session</Button>
          </div>
        </CardSection>
      </Card>
    </div>
  );
}

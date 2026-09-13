"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  MagnifyingGlass,
  Microphone,
  Sparkle,
  SpeakerHigh,
  SpeakerSlash,
  Stop,
} from "@phosphor-icons/react";
import { checkRecord, type RecordCheck } from "@/app/actions/record";
import { StillStirring } from "@/components/streak/still-stirring";
import { EngineCredit } from "@/components/study/blurt-session";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { TextArea } from "@/components/ui/input";
import { Stir } from "@/components/brand/stir";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  isSpeechRecognitionSupported,
  startRecognition,
  type RecognitionHandle,
} from "@/lib/speech/recognition";
import { isVoiceMuted, setVoiceMuted, speak, stopSpeaking, subscribeToVoice } from "@/lib/speech/voice";
import { cn } from "@/lib/cn";

const MAX_TURNS = 8;
const MAX_PICK_ROWS = 30;

type Turn = { question: string; answer: string };
type FeynmanWrap = {
  gaps: { gap: string; noteTitle: string; tryThis: string }[];
  summary: string;
  engine?: string;
};

function coachMessage(error: string | undefined, detail: string | undefined): string {
  if (error === "no_notes_matched") return "That note is not in this Pot any more. Pick another.";
  if (error === "mixing_unavailable") return "Mixing is not set up on this server yet, so the tutor cannot take the session. The note is still yours to explain out loud.";
  if (error === "rate_limited") return "You have run the tutor a lot just now. Wait a little and try again.";
  if (detail) return detail;
  return "The tutor could not continue. Try once more.";
}

/**
 * The Feynman method with a tutor that talks back: explain a note out loud,
 * one probing question at a time, and end with where the explanation came
 * apart. Deliberately not a conversation feed: one question in focus at a
 * time, earlier turns folded away.
 */
export function FeynmanSession({
  potId,
  potTitle,
  notes,
}: {
  potId: string;
  potTitle: string;
  notes: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const voiceAvailable = isSpeechRecognitionSupported();
  const [noteId, setNoteId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<"choosing" | "tutoring" | "done">("choosing");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState<string | null>(null);
  const [maxTurns, setMaxTurns] = useState(MAX_TURNS);
  const [answer, setAnswer] = useState("");
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  // The mute is a stored choice read through the store, the way the theme is,
  // so no effect has to guess it after mount.
  const muted = useSyncExternalStore(subscribeToVoice, isVoiceMuted, () => false);
  const [wrap, setWrap] = useState<FeynmanWrap | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<RecordCheck | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const recognitionRef = useRef<RecognitionHandle | null>(null);
  const recordedRef = useRef(false);

  const note = notes.find((entry) => entry.id === noteId) ?? null;
  const queryLower = query.trim().toLowerCase();
  const matches = notes.filter((entry) => entry.title.toLowerCase().includes(queryLower));
  const visibleNotes = matches.slice(0, MAX_PICK_ROWS);

  useEffect(() => () => stopSpeaking(), []);

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }

  async function call(body: Record<string, unknown>) {
    const response = await fetch("/api/ai/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ potId, mode: "feynman", ...body }),
    });
    const payload = (await response.json().catch(() => null)) as
      | (Record<string, unknown> & { error?: string; detail?: string })
      | null;
    if (!response.ok || !payload || payload.error) {
      throw new Error(payload?.error ?? "generation_failed");
    }
    return payload;
  }

  async function start() {
    if (!noteId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await call({ noteId, step: "ask", turns: [] });
      setTurns([]);
      setQuestion(String(payload.question ?? ""));
      setMaxTurns(Number(payload.maxTurns ?? MAX_TURNS));
      setPhase("tutoring");
      setAnswer("");
      speak(String(payload.question ?? ""));
    } catch (caught) {
      setError(coachMessage(caught instanceof Error ? caught.message : undefined, undefined));
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!question || !answer.trim() || busy) return;
    stopListening();
    const history = [...turns, { question, answer: answer.trim() }];
    setTurns(history);
    setAnswer("");
    setBusy(true);
    setError(null);
    try {
      const payload = await call({ noteId, step: "next", turns: history });
      setQuestion(String(payload.question ?? ""));
      setMaxTurns(Number(payload.maxTurns ?? MAX_TURNS));
      speak(String(payload.question ?? ""));
    } catch (caught) {
      // The turn stands; the tutor just could not ask the next one.
      setQuestion(null);
      setError(coachMessage(caught instanceof Error ? caught.message : undefined, undefined));
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (busy) return;
    stopListening();
    setBusy(true);
    setError(null);
    try {
      const payload = await call({ noteId, step: "finish", turns }) as unknown as FeynmanWrap;
      setWrap(payload);
      setPhase("done");
      stopSpeaking();
      if (!recordedRef.current) {
        recordedRef.current = true;
        await supabaseBrowser().rpc("record_study_run", {
          p_attempt_id: crypto.randomUUID(),
          p_pot_id: potId,
          p_kind: "feynman",
          p_detail: { note: note?.title ?? null, turns: turns.length },
        });
        const check = await checkRecord().catch(() => null);
        if (check?.countedNow) {
          setRecord(check);
          setCelebrating(true);
          router.refresh();
        }
      }
    } catch (caught) {
      setError(coachMessage(caught instanceof Error ? caught.message : undefined, undefined));
    } finally {
      setBusy(false);
    }
  }

  function toggleMute() {
    setVoiceMuted(!muted);
  }

  if (phase === "choosing") {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-6">
        <Button variant="quiet" size="sm" href={`/p/${potId}`}>
          <ArrowLeft className="size-4" /> Back to {potTitle}
        </Button>
        <Card>
          <CardSection className="space-y-6 py-8">
            <div className="space-y-1.5 text-center">
              <Eyebrow>Feynman</Eyebrow>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-muted">
                Pick a note and explain it out loud, in your own words. The
                tutor listens, asks what you skipped, and shows you where the
                explanation came apart.
              </p>
              <p className="text-[12px] text-ink-faint">
                {voiceAvailable
                  ? "Your voice is heard in this browser; typing works too."
                  : "This browser cannot listen, so the session runs on typing."}
              </p>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-[13px] font-medium text-ink">Which note</legend>
              {notes.length > 8 ? (
                <div className="relative">
                  <MagnifyingGlass
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
                    aria-hidden
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search the notes"
                    aria-label="Search the notes"
                    className="h-10 w-full rounded-(--radius-control) border border-edge-strong bg-surface pl-9 pr-3 text-[14px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-focus-ring"
                  />
                </div>
              ) : null}
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-(--radius-control) border border-edge bg-surface p-1.5">
                {visibleNotes.map((entry) => {
                  const on = entry.id === noteId;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setNoteId(entry.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-full px-3.5 py-1.5 text-left text-[13px] transition-colors",
                        on
                          ? "bg-primary-soft font-medium text-primary"
                          : "text-ink-muted hover:bg-sunken hover:text-ink",
                      )}
                    >
                      <span className="truncate">{entry.title}</span>
                      {on ? <Check weight="bold" className="size-3.5 shrink-0" aria-hidden /> : null}
                    </button>
                  );
                })}
                {matches.length === 0 ? (
                  <p className="px-2.5 py-1.5 text-[12px] text-ink-faint">No notes match that.</p>
                ) : null}
              </div>
            </fieldset>

            <div className="flex justify-center">
              <Button onClick={() => void start()} disabled={!noteId || busy}>
                {busy ? (
                  <>
                    <Stir size={16} tone="on-primary" />
                    Getting the first question
                  </>
                ) : (
                  <>
                    <Microphone className="size-4" />
                    Start explaining
                  </>
                )}
              </Button>
            </div>
            {error ? (
              <p role="alert" className="text-center text-[13px] text-danger">
                {error}
              </p>
            ) : null}
          </CardSection>
        </Card>
      </div>
    );
  }

  if (phase === "done" && wrap) {
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
          <CardSection className="space-y-6 py-8">
            <div className="space-y-1.5 text-center">
              <Eyebrow>How it went</Eyebrow>
              <p className="mx-auto max-w-xl text-sm leading-relaxed text-ink">{wrap.summary}</p>
            </div>
            <EngineCredit label="Tutored by" engine={wrap.engine ?? null} />
            <section className="space-y-2">
              <h2 className="text-[13px] font-medium text-ink">
                Where the explanation came apart
              </h2>
              {wrap.gaps.length === 0 ? (
                <p className="text-[13px] text-ink-faint">
                  Nothing came apart. Either you know this note, or the session
                  was too short to tell.
                </p>
              ) : (
                <ul className="space-y-2">
                  {wrap.gaps.map((gap, index) => (
                    <li
                      key={index}
                      className="rounded-(--radius-control) border border-edge bg-surface px-3.5 py-2.5"
                    >
                      <p className="text-[13px] leading-relaxed text-ink">{gap.gap}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                        Try this: {gap.tryThis}
                      </p>
                      <p className="mt-1 text-[11px] text-ink-faint">{gap.noteTitle}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={() => {
                  setPhase("choosing");
                  setNoteId(null);
                  setTurns([]);
                  setQuestion(null);
                  setWrap(null);
                  recordedRef.current = false;
                }}
              >
                Explain another note
              </Button>
            </div>
          </CardSection>
        </Card>
      </div>
    );
  }

  // ----- Tutoring -----------------------------------------------------------

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-6" data-no-shortcuts>
      <div className="flex items-center justify-between gap-3">
        <Button variant="quiet" size="sm" href={`/p/${potId}`} onClick={() => stopSpeaking()}>
          <ArrowLeft className="size-4" /> Leave
        </Button>
        <button
          type="button"
          onClick={toggleMute}
          aria-pressed={muted}
          aria-label={muted ? "Turn the tutor's voice on" : "Turn the tutor's voice off"}
          className="inline-flex size-8 items-center justify-center rounded-(--radius-control) text-ink-faint transition-colors hover:bg-sunken hover:text-ink"
        >
          {muted ? <SpeakerSlash className="size-4" aria-hidden /> : <SpeakerHigh className="size-4" aria-hidden />}
        </button>
      </div>

      {turns.length > 0 ? (
        <details className="rounded-(--radius-card) border border-edge bg-surface px-4 py-3">
          <summary className="cursor-pointer text-[12px] text-ink-faint">
            So far, {turns.length} {turns.length === 1 ? "turn" : "turns"}
          </summary>
          <ul className="mt-2 space-y-2">
            {turns.map((turn, index) => (
              <li key={index} className="text-[13px] leading-relaxed">
                <p className="text-ink-muted">{turn.question}</p>
                <p className="text-ink-faint">{turn.answer}</p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {question ? (
        <div className="space-y-2">
          <p className="text-[12px] text-ink-faint">
            Question {Math.min(turns.length + 1, maxTurns)} of {maxTurns}
            {note ? ` · ${note.title}` : ""}
          </p>
          <Card>
            <CardSection className="py-6">
              <p className="text-lg font-semibold leading-relaxed text-ink">{question}</p>
            </CardSection>
          </Card>
        </div>
      ) : null}

      <div className="space-y-3">
        {voiceAvailable ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={listening ? "danger" : "primary"}
              size="sm"
              onClick={() => {
                if (listening) {
                  stopListening();
                  return;
                }
                setMicError(null);
                const handle = startRecognition({
                  onUpdate: (update) => {
                    // The listener owns the draft while it runs: settled words
                    // plus the interim tail, exactly as heard.
                    setAnswer(update.text);
                  },
                  onError: (code) => {
                    setListening(false);
                    recognitionRef.current = null;
                    if (code === "not-allowed" || code === "service-not-allowed") {
                      setMicError("The microphone is blocked for this page, so type instead.");
                    } else if (code !== "no-speech" && code !== "aborted") {
                      setMicError("The listening stopped. Start it again, or type.");
                    }
                  },
                  onEnd: () => {
                    setListening(false);
                    recognitionRef.current = null;
                  },
                });
                if (handle) {
                  recognitionRef.current = handle;
                  setListening(true);
                } else {
                  setMicError("Listening could not start. Type instead.");
                }
              }}
            >
              {listening ? (
                <>
                  <Stop className="size-4" weight="fill" />
                  Stop listening
                </>
              ) : (
                <>
                  <Microphone className="size-4" />
                  Answer out loud
                </>
              )}
            </Button>
            {listening ? (
              <span className="text-[12px] text-ink-faint">Listening. Speak, then stop.</span>
            ) : null}
            {micError ? <span className="text-[12px] text-danger">{micError}</span> : null}
          </div>
        ) : null}

        <TextArea
          value={answer}
          onChange={(event) => setAnswer(event.target.value.slice(0, 2_000))}
          rows={5}
          aria-label="Your answer"
          placeholder={
            voiceAvailable
              ? "Answer here, or out loud with the button above."
              : "Say it the way you would say it out loud."
          }
          className="text-[15px]"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="quiet"
            size="sm"
            onClick={() => void finish()}
            disabled={busy || turns.length === 0}
          >
            <Sparkle className="size-4" />
            Finish and see the gaps
          </Button>
          <Button onClick={() => void send()} disabled={busy || !question || !answer.trim()}>
            {busy ? (
              <>
                <Stir size={16} tone="on-primary" />
                Thinking
              </>
            ) : (
              "Send the answer"
            )}
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

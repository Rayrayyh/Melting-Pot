"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Users } from "@phosphor-icons/react";
import { checkRecord, type RecordCheck } from "@/app/actions/record";
import { StillStirring } from "@/components/streak/still-stirring";
import { PracticeSession } from "@/components/study/practice-session";
import type { PracticeMarking, PracticeQuestion } from "@/lib/study/practice-session";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/ui/copy-button";
import { Spinner } from "@/components/ui/spinner";
import { createGameTransport, shouldForcePoll, type GameTransport } from "@/lib/game/realtime";
import { measureSkew, parseGameState, viewOf, type GameState } from "@/lib/game/state";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Json } from "@/lib/database.types";
import { cn } from "@/lib/cn";

type HostSet = { id: string; title: string };

const CHOICE =
  "flex w-full items-center justify-between gap-3 rounded-(--radius-card) border px-4 py-3 text-left text-[15px] font-medium transition-colors";

/**
 * A live quiz room. The host runs it from their screen; players answer on
 * theirs; the room's state is the one truth everyone polls. Scores live in
 * the room and nowhere else: at the podium each player's own result is saved
 * to their record, and the room itself is never mentioned again.
 */
export function GameRoom({
  potId,
  potTitle,
  canHost,
  archived,
  hostSets,
  initialCode,
  forcePoll: forcedByQuery,
}: {
  potId: string;
  potTitle: string;
  canHost: boolean;
  archived: boolean;
  hostSets: HostSet[];
  initialCode: string | null;
  forcePoll: boolean;
}) {
  const router = useRouter();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [skew, setSkew] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [userId, setUserId] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState(initialCode ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myChoice, setMyChoice] = useState<number | null>(null);
  const [soloSet, setSoloSet] = useState<{ id: string; questions: PracticeQuestion[] } | null>(null);
  const [record, setRecord] = useState<RecordCheck | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const transportRef = useRef<GameTransport | null>(null);
  const recordedRef = useRef<string | null>(null);
  const revealedRef = useRef<number>(-2);
  const forcePoll = forcedByQuery || shouldForcePoll(window.location.search);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabaseBrowser().auth.getUser();
      setUserId(user?.id ?? null);
    })();
  }, []);

  const fetchState = useCallback(
    async (id: string) => {
      const { data, error: rpcError } = await supabaseBrowser().rpc("game_state", {
        p_room_id: id,
      });
      if (rpcError || !data) return;
      const parsed = parseGameState(data);
      if (parsed) {
        setSkew(measureSkew(parsed, Date.now()));
        setState(parsed);
      }
    },
    [],
  );

  // The room moves; look again. The transport carries only this nudge.
  useEffect(() => {
    if (!roomId) return;
    const first = window.setTimeout(() => void fetchState(roomId), 0);
    transportRef.current?.close();
    transportRef.current = createGameTransport(
      supabaseBrowser() as unknown as Parameters<typeof createGameTransport>[0],
      roomId,
      () => void fetchState(roomId),
      { forcePoll },
    );
    return () => {
      window.clearTimeout(first);
      transportRef.current?.close();
      transportRef.current = null;
    };
  }, [roomId, fetchState, forcePoll]);

  // The countdown between fetches.
  useEffect(() => {
    if (state?.status !== "question") return;
    const tick = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(tick);
  }, [state?.status]);

  const isHost = Boolean(userId && state?.hostId === userId);
  const current = state ? viewOf(state, now, skew) : null;

  // The host's screen opens the reveal when the buzzer goes; the players'
  // screens see it arrive through the room row.
  useEffect(() => {
    if (!state || !isHost || state.status !== "question") return;
    if (current && current.remainingMs === 0 && revealedRef.current !== state.questionIndex) {
      revealedRef.current = state.questionIndex;
      void supabaseBrowser()
        .rpc("reveal_question", { p_room_id: state.roomId })
        .then(() => fetchState(state.roomId));
    }
  }, [state, isHost, current, fetchState]);

  // The podium saves the reader's own result, once per room, from the
  // server's count rather than the browser's.
  useEffect(() => {
    if (!state || state.status !== "ended" || !roomId) return;
    if (recordedRef.current === roomId) return;
    recordedRef.current = roomId;
    void (async () => {
      const { data } = await supabaseBrowser().rpc("my_game_result", { p_room_id: roomId });
      const result = data as { correct?: number; answered?: number; total?: number } | null;
      if (!result || (result.answered ?? 0) === 0) return;
      await supabaseBrowser().rpc("record_study_run", {
        p_attempt_id: crypto.randomUUID(),
        p_pot_id: potId,
        p_kind: "game",
        p_detail: { correct: result.correct ?? 0, total: result.total ?? 0 },
      });
      const check = await checkRecord().catch(() => null);
      if (check?.countedNow) {
        setRecord(check);
        setCelebrating(true);
        router.refresh();
      }
    })();
  }, [state?.status, roomId, potId, router, state]);

  async function host(fn: () => unknown, id: string) {
    setBusy(true);
    setError(null);
    try {
      await Promise.resolve(fn());
      await fetchState(id);
    } catch {
      setError("The room did not move. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function createRoom(setId: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    void (async () => {
      const { data, error: rpcError } = await supabaseBrowser().rpc("create_game_room", {
        p_pot_id: potId,
        p_set_id: setId,
      });
      setBusy(false);
      if (rpcError || !data) {
        const reason = rpcError?.message ?? "";
        if (reason.includes("pot_archived")) setError("This Pot is archived, so nothing can run in it.");
        else if (reason.includes("invalid_set")) setError("Only a saved practice test can run live.");
        else setError("The room could not be opened. Try again.");
        return;
      }
      const created = data as { roomId: string };
      setMyChoice(null);
      setRoomId(created.roomId);
    })();
  }

  function join() {
    if (busy) return;
    setBusy(true);
    setError(null);
    void (async () => {
      const { data, error: rpcError } = await supabaseBrowser().rpc("join_game_room", {
        p_code: codeInput,
      });
      setBusy(false);
      if (rpcError || !data) {
        const reason = rpcError?.message ?? "";
        setError(
          reason.includes("room_not_found")
            ? "No open room carries that code. Check it and try again."
            : reason.includes("not_pot_member")
              ? "That room belongs to a Pot you are not in."
              : "The room could not be joined. Try again.",
        );
        return;
      }
      const joined = data as { roomId: string };
      setMyChoice(null);
      setRoomId(joined.roomId);
    })();
  }

  function answer(choice: number) {
    if (!state || myChoice !== null) return;
    const ms = Math.max(0, state.secondsPerQuestion * 1000 - (current?.remainingMs ?? 0));
    setMyChoice(choice);
    void supabaseBrowser()
      .rpc("submit_game_answer", {
        p_room_id: state.roomId,
        p_question_index: state.questionIndex,
        p_choice: choice,
        p_ms: ms,
      })
      .then(() => fetchState(state.roomId));
  }

  // ----- Solo mode ----------------------------------------------------------

  async function openSolo(setId: string) {
    setBusy(true);
    setError(null);
    const { data } = await supabaseBrowser()
      .from("study_sets")
      .select("payload, secured")
      .eq("id", setId)
      .maybeSingle();
    setBusy(false);
    const payload = (data?.payload ?? null) as { questions?: PracticeQuestion[] } | null;
    if (!data?.secured || !payload?.questions?.length) {
      setError("Only a saved practice test can be played here.");
      return;
    }
    setSoloSet({ id: setId, questions: payload.questions });
  }

  const markSolo = useCallback(
    async (order: number[], answers: Record<number, number>): Promise<PracticeMarking> => {
      if (!soloSet) throw new Error("no_set");
      const { data, error: rpcError } = await supabaseBrowser().rpc("submit_practice_test", {
        p_attempt_id: crypto.randomUUID(),
        p_set_id: soloSet.id,
        p_answers: { order, choices: answers } as unknown as Json,
      });
      if (rpcError || !data) throw new Error("submit_failed");
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
        setRecord(check);
        setCelebrating(true);
        router.refresh();
      }
      return {
        firstPass: returned.firstPass === true,
        correct: returned.correct ?? 0,
        total: returned.total ?? order.length,
        marks,
        countedToday: Boolean(check?.countedNow),
      };
    },
    [soloSet, router],
  );

  // ----- Render -------------------------------------------------------------

  if (soloSet) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-5" data-no-shortcuts>
        {record?.countedNow ? (
          <StillStirring
            open={celebrating}
            days={record.days}
            week={record.week}
            onClose={() => setCelebrating(false)}
          />
        ) : null}
        <PracticeSession
          title="Playing it yourself"
          questions={soloSet.questions}
          onRegenerate={() => setSoloSet(null)}
          regenerating={false}
          mark={markSolo}
          recorded
        />
        <div className="flex justify-center">
          <Button variant="quiet" size="sm" onClick={() => setSoloSet(null)}>
            Back to the room picker
          </Button>
        </div>
      </div>
    );
  }

  if (!roomId) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-6" data-no-shortcuts>
        <Button variant="quiet" size="sm" href={`/p/${potId}`}>
          <ArrowLeft className="size-4" /> Back to {potTitle}
        </Button>
        <Card>
          <CardSection className="space-y-6 py-8">
            <div className="space-y-1.5 text-center">
              <Eyebrow>Class game</Eyebrow>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-muted">
                {canHost
                  ? "Run one of the Pot's saved tests live: everyone answers the same question at once, speed breaks ties."
                  : "Waiting for a room? Ask whoever is running the game for its code."}
              </p>
            </div>

            {canHost && !archived ? (
              <section className="space-y-2">
                <p className="text-[13px] font-medium text-ink">Run a saved test</p>
                {hostSets.length === 0 ? (
                  <p className="text-[13px] text-ink-faint">
                    No saved practice tests yet. Build one on the practice page first.
                  </p>
                ) : (
                  hostSets.map((set) => (
                    <div
                      key={set.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-(--radius-card) border border-edge bg-surface px-4 py-3"
                    >
                      <p className="min-w-0 truncate text-[14px] font-medium text-ink">{set.title}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => void openSolo(set.id)} disabled={busy}>
                          <Play className="size-4" />
                          Play it yourself
                        </Button>
                        <Button size="sm" onClick={() => createRoom(set.id)} disabled={busy}>
                          <Users className="size-4" />
                          Run it live
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </section>
            ) : null}

            <section className="space-y-2 border-t border-edge pt-5">
              <p className="text-[13px] font-medium text-ink">Join a room</p>
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  join();
                }}
              >
                <Input
                  value={codeInput}
                  onChange={(event) => setCodeInput(event.target.value.toUpperCase().slice(0, 6))}
                  placeholder="CODE"
                  aria-label="Room code"
                  className="max-w-40 font-mono tracking-[0.2em] uppercase"
                />
                <Button type="submit" disabled={busy || codeInput.length !== 6}>
                  Join
                </Button>
              </form>
            </section>

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

  if (!state || !current) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-ink-muted">
        <Spinner />
        <p className="text-[13px]">Opening the room.</p>
      </div>
    );
  }

  const joinLink = `${window.location.origin}/p/${potId}/game?room=${state.code}`;

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

      {state.status === "lobby" ? (
        <Card>
          <CardSection className="space-y-5 py-8 text-center">
            <Eyebrow>Lobby</Eyebrow>
            <p className="text-[13px] text-ink-muted">Open this code on everyone else&apos;s screen.</p>
            {isHost ? (
              <>
                <p className="font-mono text-[40px] tracking-[0.24em] text-ink">
                  {state.code}
                </p>
                <div className="flex justify-center">
                  <CopyButton value={joinLink} label="Copy join link" />
                </div>
                <Button onClick={() => void host(() => supabaseBrowser().rpc("start_game", { p_room_id: state.roomId }), state.roomId)} disabled={busy}>
                  {state.players.length < 2
                    ? "Start anyway"
                    : `Start with ${state.players.length} players`}
                </Button>
              </>
            ) : null}
            <div className="space-y-1.5">
              <p className="flex items-center justify-center gap-1.5 text-[13px] text-ink-muted">
                <Users className="size-4" aria-hidden />
                {state.players.length} {state.players.length === 1 ? "player" : "players"}
              </p>
              <ul className="flex flex-wrap justify-center gap-1.5">
                {state.players.map((player) => (
                  <li
                    key={player.name}
                    className="rounded-full bg-sunken px-3 py-1 text-[12px] text-ink-muted"
                  >
                    {player.name}
                  </li>
                ))}
              </ul>
            </div>
          </CardSection>
        </Card>
      ) : null}

      {state.status === "question" && state.question ? (
        <div className="space-y-4">
          <div className="flex items-baseline justify-between text-[13px] text-ink-muted">
            <span className="tabular-nums">
              Question {state.questionIndex + 1} of {state.totalQuestions}
            </span>
            <span className="tabular-nums">{Math.ceil(current.remainingMs / 1000)}s</span>
          </div>
          <Card>
            <CardSection className="py-6">
              <p className="text-lg font-semibold leading-relaxed text-ink">
                {state.question.prompt}
              </p>
            </CardSection>
          </Card>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {state.question.choices.map((choice, index) => (
              <button
                key={index}
                type="button"
                disabled={myChoice !== null || !isPlayer(userId, state)}
                onClick={() => answer(index)}
                className={cn(
                  CHOICE,
                  myChoice === index
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-edge-strong bg-surface text-ink hover:border-primary hover:bg-primary-soft/40",
                  myChoice !== null && myChoice !== index && "opacity-40",
                )}
              >
                <span className="truncate">{choice}</span>
                {myChoice === index ? <span className="text-[12px]">locked in</span> : null}
              </button>
            ))}
          </div>
          {isPlayer(userId, state) ? (
            <p className="text-center text-[12px] text-ink-faint">
              {myChoice !== null ? "Locked in. The reveal comes when the clock runs out." : "One answer, and the clock is running."}
            </p>
          ) : (
            <p className="text-center text-[12px] text-ink-faint">
              You are running this room. Reveal opens on the buzzer.
            </p>
          )}
          {isHost ? (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void host(() => supabaseBrowser().rpc("reveal_question", { p_room_id: state.roomId }), state.roomId)}
                disabled={busy}
              >
                Reveal now
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {state.status === "reveal" && state.question && state.reveal ? (
        <div className="space-y-4">
          <Card>
            <CardSection className="space-y-3 py-6">
              <p className="text-[15px] font-medium text-ink">{state.question.prompt}</p>
              <ul className="space-y-2">
                {state.question.choices.map((choice, index) => {
                  const isAnswer = index === state.reveal?.answerIndex;
                  const mine = myChoice === index || state.reveal?.yourChoice === index;
                  const count = state.reveal?.counts[index] ?? 0;
                  return (
                    <li
                      key={index}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-(--radius-control) border px-3.5 py-2.5 text-[14px]",
                        isAnswer
                          ? "border-success bg-success-soft text-success"
                          : mine
                            ? "border-danger bg-danger-soft text-danger"
                            : "border-edge bg-surface text-ink-muted",
                      )}
                    >
                      <span className="min-w-0 truncate">
                        {choice}
                        {mine ? " · yours" : ""}
                      </span>
                      <span className="tabular-nums text-[12px]">{count}</span>
                    </li>
                  );
                })}
              </ul>
              {isPlayer(userId, state) && state.reveal.yourCorrect !== null ? (
                <p className={cn("text-[13px]", state.reveal.yourCorrect ? "text-success" : "text-danger")}>
                  {state.reveal.yourCorrect ? "You had it." : "You missed it."}
                </p>
              ) : null}
            </CardSection>
          </Card>
          <Leaderboard rows={state.leaderboard ?? []} />
          {isHost ? (
            <div className="flex justify-center">
              <Button onClick={() => void host(() => supabaseBrowser().rpc("next_question", { p_room_id: state.roomId }), state.roomId)} disabled={busy}>
                {state.questionIndex + 1 >= state.totalQuestions ? "Finish the game" : "Next question"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {state.status === "ended" ? (
        <Card>
          <CardSection className="space-y-5 py-8 text-center">
            <Eyebrow>Podium</Eyebrow>
            <Leaderboard rows={state.leaderboard ?? []} centered />
            <p className="text-[12px] text-ink-faint">
              Your result is on your record. The room itself keeps nothing.
            </p>
            <div className="flex justify-center gap-2">
              {isHost ? (
                <Button variant="secondary" onClick={() => { setRoomId(null); setState(null); }}>
                  Run another
                </Button>
              ) : null}
              <Button variant={isHost ? "quiet" : "secondary"} href={`/p/${potId}`}>
                Back to {potTitle}
              </Button>
            </div>
          </CardSection>
        </Card>
      ) : null}

      {error ? (
        <p role="alert" className="text-center text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function isPlayer(userId: string | null, state: GameState): boolean {
  return Boolean(userId) && userId !== state.hostId;
}

function Leaderboard({ rows, centered = false }: { rows: Array<{ name: string; score: number; correct: number }>; centered?: boolean }) {
  if (rows.length === 0) return null;
  const top = Math.max(...rows.map((row) => row.score), 1);
  return (
    <ol className={cn("space-y-1.5", centered && "mx-auto max-w-sm")}>
      {rows.map((row, index) => (
        <li
          key={`${row.name}-${index}`}
          className="flex items-center gap-3 rounded-(--radius-control) bg-surface px-3.5 py-2 text-[13px]"
        >
          <span className="w-5 text-right tabular-nums text-ink-faint">{index + 1}</span>
          <span className="min-w-0 flex-1 truncate text-ink">{row.name}</span>
          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-sunken" aria-hidden>
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${Math.round((row.score / top) * 100)}%` }}
            />
          </span>
          <span className="w-14 text-right tabular-nums text-ink-muted">{row.score}</span>
        </li>
      ))}
    </ol>
  );
}

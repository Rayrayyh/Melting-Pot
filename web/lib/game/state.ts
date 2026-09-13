/**
 * What a game screen knows, folded into one view.
 *
 * The room's truth arrives whole from game_state; the only thing the client
 * adds is the clock, interpolated locally between fetches so the countdown
 * moves every frame instead of stuttering on each poll. The clock is anchored
 * to the server's own timestamps with the measured skew, so a phone that is
 * forty seconds wrong still ends on the server's buzzer.
 */

import type { Json } from "@/lib/database.types";

export type GameState = {
  roomId: string;
  potId: string;
  hostId: string;
  /** The six-character room code, the door everyone inside passes on. */
  code: string;
  format: string;
  status: "lobby" | "question" | "reveal" | "ended";
  version: number;
  questionIndex: number;
  totalQuestions: number;
  secondsPerQuestion: number;
  serverNow: number;
  questionStartedAt: number | null;
  question: { prompt: string; choices: string[] } | null;
  reveal: {
    answerIndex: number;
    counts: number[];
    yourChoice: number | null;
    yourCorrect: boolean | null;
  } | null;
  players: Array<{ name: string }>;
  leaderboard: Array<{ name: string; score: number; correct: number }> | null;
};

export function parseGameState(value: unknown): GameState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, Json>;
  if (typeof row.roomId !== "string") return null;
  const status = row.status;
  return {
    roomId: row.roomId,
    potId: typeof row.potId === "string" ? row.potId : "",
    hostId: typeof row.hostId === "string" ? row.hostId : "",
    code: typeof row.code === "string" ? row.code : "",
    format: typeof row.format === "string" ? row.format : "quiz",
    status: status === "question" || status === "reveal" || status === "ended" ? status : "lobby",
    version: Number(row.version ?? 0),
    questionIndex: Number(row.questionIndex ?? -1),
    totalQuestions: Number(row.totalQuestions ?? 0),
    secondsPerQuestion: Number(row.secondsPerQuestion ?? 20),
    serverNow: Number(row.serverNow ?? 0),
    questionStartedAt: typeof row.questionStartedAt === "number" ? row.questionStartedAt : null,
    question:
      row.question && typeof row.question === "object" && !Array.isArray(row.question)
        ? {
            prompt: String((row.question as Record<string, Json>).prompt ?? ""),
            choices: Array.isArray((row.question as Record<string, Json>).choices)
              ? ((row.question as Record<string, Json>).choices as string[])
              : [],
          }
        : null,
    reveal:
      row.reveal && typeof row.reveal === "object" && !Array.isArray(row.reveal)
        ? {
            answerIndex: Number((row.reveal as Record<string, Json>).answerIndex ?? -1),
            counts: Array.isArray((row.reveal as Record<string, Json>).counts)
              ? ((row.reveal as Record<string, Json>).counts as number[])
              : [0, 0, 0, 0],
            yourChoice:
              typeof (row.reveal as Record<string, Json>).yourChoice === "number"
                ? ((row.reveal as Record<string, Json>).yourChoice as number)
                : null,
            yourCorrect:
              typeof (row.reveal as Record<string, Json>).yourCorrect === "boolean"
                ? ((row.reveal as Record<string, Json>).yourCorrect as boolean)
                : null,
          }
        : null,
    players: Array.isArray(row.players)
      ? (row.players as Array<Record<string, Json>>).map((p) => ({
          name: String(p.name ?? "A classmate"),
        }))
      : [],
    leaderboard: Array.isArray(row.leaderboard)
      ? (row.leaderboard as Array<Record<string, Json>>).map((p) => ({
          name: String(p.name ?? "A classmate"),
          score: Number(p.score ?? 0),
          correct: Number(p.correct ?? 0),
        }))
      : null,
  };
}

export type GameView = {
  state: GameState;
  /** Milliseconds left on the current question, never negative. */
  remainingMs: number;
  /** The clock skew measured at the last fetch: server minus local. */
  skewMs: number;
};

export function viewOf(state: GameState, localNow: number, skewMs = 0): GameView {
  const remainingMs =
    state.status === "question" && state.questionStartedAt !== null
      ? Math.max(
          0,
          state.questionStartedAt + state.secondsPerQuestion * 1000 - (localNow + skewMs),
        )
      : 0;
  return { state, remainingMs, skewMs };
}

/** Skew measured against the server clock at fetch time. */
export function measureSkew(state: GameState, localNow: number): number {
  return state.serverNow - localNow;
}

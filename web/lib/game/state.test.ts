import { describe, expect, it } from "vitest";
import { measureSkew, parseGameState, viewOf } from "./state";

const BASE = {
  roomId: "room-1",
  potId: "pot-1",
  hostId: "host-1",
  format: "quiz",
  status: "question",
  version: 3,
  questionIndex: 1,
  totalQuestions: 5,
  secondsPerQuestion: 20,
  serverNow: 1_000_000,
  questionStartedAt: 990_000,
  question: { prompt: "Which way does water move?", choices: ["a", "b", "c", "d"] },
  reveal: null,
  players: [{ name: "Maya" }],
  leaderboard: null,
};

describe("parseGameState", () => {
  it("reads a full state and clamps an unknown status to lobby", () => {
    expect(parseGameState(BASE)?.status).toBe("question");
    expect(parseGameState({ ...BASE, status: "weird" })?.status).toBe("lobby");
    expect(parseGameState(null)).toBeNull();
    expect(parseGameState("nope")).toBeNull();
  });

  it("reads the reveal with the reader's own result", () => {
    const state = parseGameState({
      ...BASE,
      status: "reveal",
      question: null,
      reveal: { answerIndex: 1, counts: [3, 8, 1, 0], yourChoice: 1, yourCorrect: true },
    });
    expect(state?.reveal?.yourCorrect).toBe(true);
    expect(state?.reveal?.counts).toEqual([3, 8, 1, 0]);
  });
});

describe("viewOf", () => {
  it("counts down from the server's anchor, not from ticks", () => {
    const state = parseGameState(BASE)!;
    const view = viewOf(state, 995_000, 0);
    expect(view.remainingMs).toBe(15_000);
  });

  it("corrects for a skewed clock and never goes negative", () => {
    const state = parseGameState(BASE)!;
    // This phone thinks it is 40 seconds behind the server.
    const behind = viewOf(state, 955_000, 40_000);
    expect(behind.remainingMs).toBe(15_000);
    const late = viewOf(state, 1_100_000, 0);
    expect(late.remainingMs).toBe(0);
  });

  it("returns zero outside a running question", () => {
    const state = parseGameState({ ...BASE, status: "reveal", questionStartedAt: null })!;
    expect(viewOf(state, 995_000, 0).remainingMs).toBe(0);
  });
});

describe("measureSkew", () => {
  it("is server minus local", () => {
    const state = parseGameState(BASE)!;
    expect(measureSkew(state, 994_000)).toBe(6_000);
  });
});

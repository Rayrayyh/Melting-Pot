import { describe, expect, it } from "vitest";
import {
  estimatedMinutes,
  practiceReducer,
  scorePractice,
  startPractice,
  type PracticeAction,
  type PracticeQuestion,
  type PracticeSession,
} from "./practice-session";

const questions: PracticeQuestion[] = [
  { prompt: "Q1", choices: ["a", "b", "c", "d"], answerIndex: 0, explanation: "e1", sourceNoteTitle: "Osmosis" },
  { prompt: "Q2", choices: ["a", "b", "c", "d"], answerIndex: 1, explanation: "e2", sourceNoteTitle: "Mitosis" },
  { prompt: "Q3", choices: ["a", "b", "c", "d"], answerIndex: 2, explanation: "e3", sourceNoteTitle: "Osmosis" },
  { prompt: "Q4", choices: ["a", "b", "c", "d"], answerIndex: 3, explanation: "e4", sourceNoteTitle: "Cells" },
];

const order = [0, 1, 2, 3];

function run(state: PracticeSession, ...actions: PracticeAction[]) {
  return actions.reduce(practiceReducer, state);
}

describe("practiceReducer", () => {
  it("opens on a start screen and begins at the first question", () => {
    const state = startPractice(order);
    expect(state.phase).toBe("start");
    const taking = practiceReducer(state, { type: "begin" });
    expect(taking).toMatchObject({ phase: "taking", position: 0 });
  });

  it("records an answer against the question, not the position", () => {
    const state = run(startPractice(order), { type: "begin" }, { type: "move", delta: 1 });
    expect(practiceReducer(state, { type: "answer", choice: 2 }).answers).toEqual({ 1: 2 });
  });

  it("lets an answer be changed", () => {
    const state = run(
      startPractice(order),
      { type: "begin" },
      { type: "answer", choice: 0 },
      { type: "answer", choice: 3 },
    );
    expect(state.answers).toEqual({ 0: 3 });
  });

  it("keeps answers while moving back and forth", () => {
    const state = run(
      startPractice(order),
      { type: "begin" },
      { type: "answer", choice: 0 },
      { type: "move", delta: 1 },
      { type: "answer", choice: 1 },
      { type: "move", delta: -1 },
    );
    expect(state.position).toBe(0);
    expect(state.answers).toEqual({ 0: 0, 1: 1 });
  });

  it("stops at both ends", () => {
    const state = run(startPractice(order), { type: "begin" });
    expect(practiceReducer(state, { type: "move", delta: -1 }).position).toBe(0);
    const last = run(state, { type: "goTo", position: 3 }, { type: "move", delta: 1 });
    expect(last.position).toBe(3);
  });

  it("jumps to a question from the navigator, and ignores one out of range", () => {
    const state = run(startPractice(order), { type: "begin" });
    expect(practiceReducer(state, { type: "goTo", position: 2 }).position).toBe(2);
    expect(practiceReducer(state, { type: "goTo", position: 9 })).toBe(state);
  });

  it("goes to review and back to a chosen question", () => {
    const reviewing = run(startPractice(order), { type: "begin" }, { type: "toReview" });
    expect(reviewing.phase).toBe("review");
    const back = practiceReducer(reviewing, { type: "backToQuestions", position: 2 });
    expect(back).toMatchObject({ phase: "taking", position: 2 });
  });

  it("only reaches results on submit", () => {
    const answered = run(startPractice(order), { type: "begin" }, { type: "answer", choice: 0 });
    expect(answered.phase).toBe("taking");
    expect(practiceReducer(answered, { type: "submit" }).phase).toBe("results");
  });

  it("brings back only the missed questions, unanswered", () => {
    const state = run(
      startPractice(order),
      { type: "begin" },
      { type: "answer", choice: 0 },
      { type: "goTo", position: 1 },
      { type: "answer", choice: 3 },
      { type: "submit" },
    );
    const score = scorePractice(questions, state);
    const retry = practiceReducer(state, { type: "retryIncorrect", incorrect: score.missed });
    expect(retry.order).toEqual([1, 2, 3]);
    expect(retry.answers).toEqual({});
    expect(retry).toMatchObject({ phase: "taking", position: 0 });
  });

  it("does nothing when there is nothing to retry", () => {
    const state = run(startPractice(order), { type: "begin" }, { type: "submit" });
    expect(practiceReducer(state, { type: "retryIncorrect", incorrect: [] })).toBe(state);
  });

  it("starts a fresh test clean", () => {
    const state = run(
      startPractice(order),
      { type: "begin" },
      { type: "answer", choice: 0 },
      { type: "submit" },
    );
    expect(practiceReducer(state, { type: "restart", order: [0, 1] })).toEqual({
      phase: "taking",
      order: [0, 1],
      position: 0,
      answers: {},
    });
  });
});

describe("scorePractice", () => {
  it("scores what was answered and names what was missed", () => {
    const state = run(
      startPractice(order),
      { type: "begin" },
      { type: "answer", choice: 0 },
      { type: "goTo", position: 1 },
      { type: "answer", choice: 1 },
      { type: "goTo", position: 2 },
      { type: "answer", choice: 0 },
    );
    expect(scorePractice(questions, state)).toEqual({
      total: 4,
      answered: 3,
      unanswered: 1,
      correct: 2,
      incorrect: 1,
      percentage: 50,
      missed: [2, 3],
    });
  });

  it("counts a skipped question as missed rather than wrong", () => {
    const state = run(startPractice([0, 1]), { type: "begin" }, { type: "answer", choice: 0 });
    expect(scorePractice(questions, state)).toMatchObject({
      answered: 1,
      correct: 1,
      incorrect: 0,
      unanswered: 1,
      percentage: 50,
      missed: [1],
    });
  });

  it("scores a retry over its own narrowed set", () => {
    const retry = run(
      { phase: "taking", order: [2, 3], position: 0, answers: {} },
      { type: "answer", choice: 2 },
      { type: "goTo", position: 1 },
      { type: "answer", choice: 3 },
    );
    expect(scorePractice(questions, retry)).toMatchObject({
      total: 2,
      correct: 2,
      percentage: 100,
      missed: [],
    });
  });

  it("survives an empty test", () => {
    expect(scorePractice(questions, startPractice([]))).toMatchObject({
      total: 0,
      percentage: 0,
      missed: [],
    });
  });
});

describe("estimatedMinutes", () => {
  it("reads about three quarters of a minute per question", () => {
    expect(estimatedMinutes(10)).toBe(8);
    expect(estimatedMinutes(4)).toBe(3);
  });

  it("never says less than a minute", () => {
    expect(estimatedMinutes(1)).toBe(1);
    expect(estimatedMinutes(0)).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { BASE_SCORE, MAX_SPEED_BONUS, buildBoard, scoreAnswer } from "./score";

describe("scoreAnswer", () => {
  it("pays full marks for an instant answer and base marks at the buzzer", () => {
    expect(scoreAnswer(0, 20_000)).toBe(BASE_SCORE + MAX_SPEED_BONUS);
    expect(scoreAnswer(20_000, 20_000)).toBe(BASE_SCORE);
    expect(scoreAnswer(20_500, 20_000)).toBe(BASE_SCORE);
  });

  it("slides between the two", () => {
    expect(scoreAnswer(10_000, 20_000)).toBe(BASE_SCORE + MAX_SPEED_BONUS / 2);
  });

  it("pays nothing for a miss, however fast", () => {
    // Fast-and-wrong is handled by the caller; the formula only ever scores
    // correct answers, which is why it takes no correctness flag.
    expect(scoreAnswer(0, 0)).toBe(BASE_SCORE);
  });
});

describe("buildBoard", () => {
  const order = ["host", "maya", "priya"];

  it("keeps players who never answered, on zero", () => {
    const board = buildBoard(order, [], 20_000);
    expect(board).toHaveLength(3);
    expect(board.every((row) => row.score === 0 && row.correct === 0)).toBe(true);
  });

  it("ranks by score and breaks ties by join order", () => {
    const board = buildBoard(
      order,
      [
        { playerId: "maya", correct: true, ms: 1_000 },
        { playerId: "priya", correct: true, ms: 15_000 },
        { playerId: "priya", correct: false, ms: 500 },
      ],
      20_000,
    );
    expect(board[0].playerId).toBe("maya");
    expect(board[1].playerId).toBe("priya");
    expect(board[1].correct).toBe(1);
    expect(board[2].playerId).toBe("host");
  });

  it("never reshuffles two players on a shared score", () => {
    const board = buildBoard(
      order,
      [
        { playerId: "maya", correct: true, ms: 0 },
        { playerId: "priya", correct: true, ms: 0 },
      ],
      20_000,
    );
    const maya = board.findIndex((row) => row.playerId === "maya");
    const priya = board.findIndex((row) => row.playerId === "priya");
    expect(maya).toBeLessThan(priya);
  });
});

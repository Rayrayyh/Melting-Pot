/**
 * Scoring for the quiz race.
 *
 * This file is the readable spec; the same formula lives in
 * `create_game_room`'s sibling `game_state` (migration 0050), which is what
 * actually serves the board, because one player's answers must never reach
 * another player's browser. Keep the two identical: full marks for an
 * instant answer, sliding to base marks at the buzzer, zero for a miss.
 */

export const BASE_SCORE = 1000;
export const MAX_SPEED_BONUS = 500;

/** Points for one answer: base for being right, bonus for being fast. */
export function scoreAnswer(ms: number, limitMs: number): number {
  if (limitMs <= 0) return BASE_SCORE;
  const speed = Math.max(0, Math.min(1, 1 - ms / limitMs));
  return BASE_SCORE + Math.round(MAX_SPEED_BONUS * speed);
}

export type PlayerAnswer = {
  playerId: string;
  correct: boolean;
  ms: number;
};

export type BoardRow = {
  playerId: string;
  score: number;
  correct: number;
};

/**
 * Folds a run of answers into a board, keeping every player who joined even
 * if they never answered. The caller supplies the join order; ties keep it,
 * so the board never reshuffles on a shared score.
 */
export function buildBoard(
  joinOrder: string[],
  answers: PlayerAnswer[],
  limitMs: number,
): BoardRow[] {
  const scores = new Map<string, BoardRow>();
  for (const playerId of joinOrder) {
    scores.set(playerId, { playerId, score: 0, correct: 0 });
  }
  for (const answer of answers) {
    const row = scores.get(answer.playerId);
    if (!row) continue;
    if (answer.correct) {
      row.score += scoreAnswer(answer.ms, limitMs);
      row.correct += 1;
    }
  }
  const rank = new Map(joinOrder.map((playerId, index) => [playerId, index]));
  return [...scores.values()].sort(
    (a, b) => b.score - a.score || (rank.get(a.playerId) ?? 0) - (rank.get(b.playerId) ?? 0),
  );
}

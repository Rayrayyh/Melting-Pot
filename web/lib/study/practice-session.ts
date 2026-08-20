/**
 * Taking a practice test. Answers stay in the page while the test is being
 * taken, nothing is marked until it is submitted, and every answer can be
 * changed right up to that point. Nothing is written down afterwards: a
 * practice test is practice.
 */

export type PracticeQuestion = {
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  sourceNoteTitle: string;
};

export type PracticePhase = "start" | "taking" | "review" | "results";

export type PracticeSession = {
  phase: PracticePhase;
  /** Question indices in play, so a retry can narrow the test to what was missed. */
  order: number[];
  position: number;
  /** Question index to the choice picked, absent while a question is unanswered. */
  answers: Record<number, number>;
};

export type PracticeAction =
  | { type: "begin" }
  | { type: "answer"; choice: number }
  | { type: "move"; delta: -1 | 1 }
  | { type: "goTo"; position: number }
  | { type: "toReview" }
  | { type: "backToQuestions"; position?: number }
  | { type: "submit" }
  | { type: "retryIncorrect"; incorrect: number[] }
  | { type: "restart"; order: number[] };

export function startPractice(order: number[]): PracticeSession {
  return { phase: "start", order, position: 0, answers: {} };
}

export function practiceReducer(
  state: PracticeSession,
  action: PracticeAction,
): PracticeSession {
  switch (action.type) {
    case "begin":
      return { ...state, phase: "taking", position: 0 };

    case "answer": {
      const question = state.order[state.position];
      if (question === undefined) return state;
      // Choosing again replaces the earlier choice; nothing is revealed yet.
      return { ...state, answers: { ...state.answers, [question]: action.choice } };
    }

    case "move": {
      const position = Math.min(
        Math.max(state.position + action.delta, 0),
        Math.max(state.order.length - 1, 0),
      );
      return position === state.position ? state : { ...state, position };
    }

    case "goTo": {
      if (action.position < 0 || action.position >= state.order.length) return state;
      return { ...state, position: action.position, phase: "taking" };
    }

    case "toReview":
      return { ...state, phase: "review" };

    case "backToQuestions":
      return {
        ...state,
        phase: "taking",
        position:
          action.position !== undefined &&
          action.position >= 0 &&
          action.position < state.order.length
            ? action.position
            : state.position,
      };

    case "submit":
      return { ...state, phase: "results" };

    case "retryIncorrect": {
      if (action.incorrect.length === 0) return state;
      // Only the missed questions come back, and they come back unanswered.
      const answers: Record<number, number> = {};
      return { ...state, phase: "taking", order: action.incorrect, position: 0, answers };
    }

    case "restart":
      return { phase: "taking", order: action.order, position: 0, answers: {} };
  }
}

export type PracticeScore = {
  total: number;
  answered: number;
  unanswered: number;
  correct: number;
  incorrect: number;
  /** Share of the whole test answered correctly, rounded to a whole percent. */
  percentage: number;
  /** Question indices answered wrongly or skipped, in the order they were asked. */
  missed: number[];
};

export function scorePractice(
  questions: PracticeQuestion[],
  state: PracticeSession,
): PracticeScore {
  let correct = 0;
  let answered = 0;
  const missed: number[] = [];
  for (const index of state.order) {
    const question = questions[index];
    if (!question) continue;
    const choice = state.answers[index];
    if (choice === undefined) {
      missed.push(index);
      continue;
    }
    answered += 1;
    if (choice === question.answerIndex) correct += 1;
    else missed.push(index);
  }
  const total = state.order.length;
  return {
    total,
    answered,
    unanswered: total - answered,
    correct,
    incorrect: answered - correct,
    percentage: total === 0 ? 0 : Math.round((correct / total) * 100),
    missed,
  };
}

/** Roughly three quarters of a minute per question, never less than a minute. */
export function estimatedMinutes(questionCount: number): number {
  return Math.max(1, Math.round((questionCount * 45) / 60));
}

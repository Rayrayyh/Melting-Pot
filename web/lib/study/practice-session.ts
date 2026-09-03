/**
 * Taking a practice test. Answers stay in the page while the test is being
 * taken, nothing is marked until it is submitted, and every answer can be
 * changed right up to that point. Nothing is written down afterwards: a
 * practice test is practice.
 */

export type PracticeQuestion = {
  prompt: string;
  choices: string[];
  /**
   * Absent on a secured test: the answer lives on the server and arrives only
   * with the marking. Present on sets built before the answer-key boundary,
   * which stay client-marked practice.
   */
  answerIndex?: number;
  explanation?: string;
  sourceNoteTitle: string;
};

/** One question's verdict, as it comes back from whichever marker ran. */
export type PracticeMark = {
  choice: number | null;
  correct: boolean;
  answerIndex: number | null;
  explanation: string | null;
};

/** A handed-in test, marked. The same shape whether the server or the page did it. */
export type PracticeMarking = {
  firstPass: boolean;
  correct: number;
  total: number;
  marks: Record<number, PracticeMark>;
  /** True when handing this test in was the first thing to count today. */
  countedToday?: boolean;
};

/**
 * Marks a legacy test whose answers travel with it. Secured tests are marked
 * by submit_practice_test instead, and nothing here ever sees their keys.
 */
export function markLocally(
  questions: PracticeQuestion[],
  order: number[],
  answers: Record<number, number>,
): PracticeMarking {
  const marks: Record<number, PracticeMark> = {};
  let correct = 0;
  for (const index of order) {
    const question = questions[index];
    if (!question) continue;
    const choice = answers[index] ?? null;
    const right = choice !== null && choice === question.answerIndex;
    if (right) correct += 1;
    marks[index] = {
      choice,
      correct: right,
      answerIndex: question.answerIndex ?? null,
      explanation: question.explanation ?? null,
    };
  }
  return { firstPass: false, correct, total: order.length, marks };
}

/** The results screen's numbers, derived from a marking rather than the keys. */
export function scoreFromMarking(order: number[], marking: PracticeMarking): PracticeScore {
  let answered = 0;
  let correct = 0;
  const missed: number[] = [];
  for (const index of order) {
    const mark = marking.marks[index];
    if (!mark) continue;
    if (mark.choice !== null) answered += 1;
    if (mark.correct) correct += 1;
    else missed.push(index);
  }
  const total = order.length;
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
    if (question.answerIndex !== undefined && choice === question.answerIndex) correct += 1;
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

/**
 * One pass through a deck of cards. Everything here is session local: what a
 * person marks as known or still learning lives for as long as the page is
 * open and is never written down, so nobody accumulates a record they have to
 * keep up. The deck itself is the shared thing; how you are doing today is not.
 */

export type StudyCard = {
  front: string;
  back: string;
  sourceNoteTitle: string;
  tags: string[];
};

export type CardVerdict = "known" | "learning";

export type FlashcardSession = {
  /** Indices into the full deck, in the order they are being shown. */
  order: number[];
  /** Where in `order` the reader is, zero based. */
  position: number;
  showingBack: boolean;
  /**
   * Keyed by deck index rather than by position, so filtering the deck by tag
   * or narrowing to the hard cards keeps every verdict already given.
   */
  verdicts: Record<number, CardVerdict>;
  /** True once the last card of the round has been marked. */
  finished: boolean;
};

export type FlashcardAction =
  | { type: "flip" }
  | { type: "move"; delta: -1 | 1 }
  | { type: "mark"; verdict: CardVerdict }
  | { type: "shuffle"; seed: number }
  | { type: "restart" }
  | { type: "studyLearning" }
  | { type: "review" }
  | { type: "setOrder"; order: number[] };

export function startSession(order: number[]): FlashcardSession {
  return { order, position: 0, showingBack: false, verdicts: {}, finished: false };
}

/**
 * A small deterministic generator, so a shuffle can be tested and a reader who
 * shuffles twice does not get the same deck back by accident.
 */
function shuffled(order: number[], seed: number): number[] {
  let state = (seed >>> 0) || 1;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const result = [...order];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function clearVerdicts(
  verdicts: Record<number, CardVerdict>,
  cleared: number[],
): Record<number, CardVerdict> {
  const kept: Record<number, CardVerdict> = {};
  const drop = new Set(cleared);
  for (const [key, verdict] of Object.entries(verdicts)) {
    if (!drop.has(Number(key))) kept[Number(key)] = verdict;
  }
  return kept;
}

export function flashcardReducer(
  state: FlashcardSession,
  action: FlashcardAction,
): FlashcardSession {
  switch (action.type) {
    case "flip":
      return { ...state, showingBack: !state.showingBack };

    case "move": {
      // No wrapping: the ends of a deck should feel like ends.
      const position = Math.min(
        Math.max(state.position + action.delta, 0),
        Math.max(state.order.length - 1, 0),
      );
      if (position === state.position) return state;
      return { ...state, position, showingBack: false };
    }

    case "mark": {
      const card = state.order[state.position];
      if (card === undefined) return state;
      const verdicts = { ...state.verdicts, [card]: action.verdict };
      const last = state.position >= state.order.length - 1;
      return {
        ...state,
        verdicts,
        showingBack: false,
        position: last ? state.position : state.position + 1,
        finished: last,
      };
    }

    case "shuffle":
      // Verdicts survive a shuffle: reordering is not starting over.
      return {
        ...state,
        order: shuffled(state.order, action.seed),
        position: 0,
        showingBack: false,
        finished: false,
      };

    case "restart":
      return {
        ...state,
        position: 0,
        showingBack: false,
        verdicts: clearVerdicts(state.verdicts, state.order),
        finished: false,
      };

    case "studyLearning": {
      const hard = state.order.filter((card) => state.verdicts[card] !== "known");
      if (hard.length === 0) return state;
      return {
        ...state,
        order: hard,
        position: 0,
        showingBack: false,
        verdicts: clearVerdicts(state.verdicts, hard),
        finished: false,
      };
    }

    case "review":
      // Back into the same round, at the front, with the verdicts intact.
      return { ...state, position: 0, showingBack: false, finished: false };

    case "setOrder": {
      if (action.order.length === 0) {
        return { ...state, order: [], position: 0, showingBack: false, finished: false };
      }
      return {
        ...state,
        order: action.order,
        position: 0,
        showingBack: false,
        finished: false,
      };
    }
  }
}

export type FlashcardProgress = {
  /** One based, for reading out as "4 of 18". */
  position: number;
  total: number;
  known: number;
  learning: number;
  answered: number;
  /** Share of the round marked known, rounded to a whole percent. */
  percentage: number;
};

export function flashcardProgress(state: FlashcardSession): FlashcardProgress {
  const total = state.order.length;
  let known = 0;
  let learning = 0;
  for (const card of state.order) {
    const verdict = state.verdicts[card];
    if (verdict === "known") known += 1;
    else if (verdict === "learning") learning += 1;
  }
  return {
    position: total === 0 ? 0 : state.position + 1,
    total,
    known,
    learning,
    answered: known + learning,
    percentage: total === 0 ? 0 : Math.round((known / total) * 100),
  };
}

/** Every tag in the deck, with how many cards carry it, most used first. */
export function deckTags(cards: StudyCard[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    for (const tag of new Set(card.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.tag.localeCompare(b.tag)));
}

/** Deck indices carrying the chosen tag, or the whole deck when none is chosen. */
export function cardsWithTag(cards: StudyCard[], tag: string | null): number[] {
  return cards
    .map((card, index) => index)
    .filter((index) => tag === null || cards[index].tags.includes(tag));
}

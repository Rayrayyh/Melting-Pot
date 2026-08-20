import { describe, expect, it } from "vitest";
import {
  cardsWithTag,
  deckTags,
  flashcardProgress,
  flashcardReducer,
  startSession,
  type FlashcardSession,
  type StudyCard,
} from "./flashcard-session";

function card(front: string, tags: string[] = []): StudyCard {
  return { front, back: `${front} answer`, sourceNoteTitle: "Osmosis", tags };
}

function run(state: FlashcardSession, ...actions: Parameters<typeof flashcardReducer>[1][]) {
  return actions.reduce(flashcardReducer, state);
}

describe("flashcardReducer", () => {
  it("shows one card at a time and flips it", () => {
    const state = startSession([0, 1, 2]);
    expect(state.position).toBe(0);
    expect(state.showingBack).toBe(false);
    expect(run(state, { type: "flip" }).showingBack).toBe(true);
    expect(run(state, { type: "flip" }, { type: "flip" }).showingBack).toBe(false);
  });

  it("moves forward and back, and stops at both ends", () => {
    const state = startSession([0, 1, 2]);
    expect(run(state, { type: "move", delta: -1 }).position).toBe(0);
    const second = run(state, { type: "move", delta: 1 });
    expect(second.position).toBe(1);
    const end = run(second, { type: "move", delta: 1 }, { type: "move", delta: 1 });
    expect(end.position).toBe(2);
  });

  it("turns the card back to its front when it moves", () => {
    const flipped = run(startSession([0, 1]), { type: "flip" });
    expect(flashcardReducer(flipped, { type: "move", delta: 1 }).showingBack).toBe(false);
  });

  it("advances after marking, and finishes on the last card", () => {
    const state = startSession([0, 1]);
    const first = flashcardReducer(state, { type: "mark", verdict: "known" });
    expect(first.position).toBe(1);
    expect(first.finished).toBe(false);
    const second = flashcardReducer(first, { type: "mark", verdict: "learning" });
    expect(second.finished).toBe(true);
    expect(second.verdicts).toEqual({ 0: "known", 1: "learning" });
  });

  it("counts what is known and still learning", () => {
    const state = run(
      startSession([0, 1, 2, 3]),
      { type: "mark", verdict: "known" },
      { type: "mark", verdict: "known" },
      { type: "mark", verdict: "learning" },
    );
    const progress = flashcardProgress(state);
    expect(progress).toMatchObject({
      position: 4,
      total: 4,
      known: 2,
      learning: 1,
      answered: 3,
      percentage: 50,
    });
  });

  it("reorders on a shuffle without losing verdicts", () => {
    const marked = run(startSession([0, 1, 2, 3, 4, 5]), { type: "mark", verdict: "known" });
    const shuffled = flashcardReducer(marked, { type: "shuffle", seed: 7 });
    expect([...shuffled.order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(shuffled.order).not.toEqual(marked.order);
    expect(shuffled.verdicts).toEqual({ 0: "known" });
    expect(shuffled.position).toBe(0);
  });

  it("shuffles the same way for the same seed", () => {
    const state = startSession([0, 1, 2, 3, 4]);
    const a = flashcardReducer(state, { type: "shuffle", seed: 42 });
    const b = flashcardReducer(state, { type: "shuffle", seed: 42 });
    expect(a.order).toEqual(b.order);
  });

  it("clears the round on a restart", () => {
    const marked = run(
      startSession([0, 1]),
      { type: "mark", verdict: "known" },
      { type: "mark", verdict: "known" },
    );
    const restarted = flashcardReducer(marked, { type: "restart" });
    expect(restarted.verdicts).toEqual({});
    expect(restarted.position).toBe(0);
    expect(restarted.finished).toBe(false);
  });

  it("narrows to the cards still being learned", () => {
    const marked = run(
      startSession([0, 1, 2]),
      { type: "mark", verdict: "known" },
      { type: "mark", verdict: "learning" },
      { type: "mark", verdict: "learning" },
    );
    const hard = flashcardReducer(marked, { type: "studyLearning" });
    expect(hard.order).toEqual([1, 2]);
    // The narrowed round starts unmarked, but the known card stays known.
    expect(hard.verdicts).toEqual({ 0: "known" });
    expect(hard.finished).toBe(false);
  });

  it("leaves a fully known round alone when asked to narrow it", () => {
    const marked = run(
      startSession([0, 1]),
      { type: "mark", verdict: "known" },
      { type: "mark", verdict: "known" },
    );
    expect(flashcardReducer(marked, { type: "studyLearning" })).toBe(marked);
  });

  it("goes back through the same round with its verdicts", () => {
    const marked = run(startSession([0, 1]), { type: "mark", verdict: "learning" });
    const reviewing = flashcardReducer({ ...marked, finished: true }, { type: "review" });
    expect(reviewing.finished).toBe(false);
    expect(reviewing.position).toBe(0);
    expect(reviewing.verdicts).toEqual({ 0: "learning" });
  });

  it("keeps verdicts when the deck is filtered to a tag", () => {
    const marked = run(startSession([0, 1, 2]), { type: "mark", verdict: "known" });
    const filtered = flashcardReducer(marked, { type: "setOrder", order: [1, 2] });
    expect(filtered.order).toEqual([1, 2]);
    expect(filtered.verdicts).toEqual({ 0: "known" });
    expect(flashcardProgress(filtered).known).toBe(0);
  });

  it("survives an empty deck", () => {
    const empty = startSession([]);
    expect(flashcardProgress(empty)).toMatchObject({ position: 0, total: 0, percentage: 0 });
    expect(flashcardReducer(empty, { type: "mark", verdict: "known" })).toBe(empty);
  });
});

describe("deck tags", () => {
  const deck = [
    card("Osmosis", ["transport", "cells"]),
    card("Diffusion", ["transport"]),
    card("Mitosis", ["division"]),
    card("Duplicate tags", ["transport", "transport"]),
  ];

  it("counts each tag once per card, most used first", () => {
    expect(deckTags(deck)).toEqual([
      { tag: "transport", count: 3 },
      { tag: "cells", count: 1 },
      { tag: "division", count: 1 },
    ]);
  });

  it("selects the cards carrying a tag, or the whole deck for none", () => {
    expect(cardsWithTag(deck, "transport")).toEqual([0, 1, 3]);
    expect(cardsWithTag(deck, "division")).toEqual([2]);
    expect(cardsWithTag(deck, null)).toEqual([0, 1, 2, 3]);
    expect(cardsWithTag(deck, "nothing")).toEqual([]);
  });
});

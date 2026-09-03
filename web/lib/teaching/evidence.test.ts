import { describe, expect, it } from "vitest";
import {
  MIN_ANSWERS,
  MIN_STUDENTS,
  hasEnoughEvidence,
  missRate,
  rankTopics,
  type TopicEvidence,
} from "@/lib/teaching/evidence";

function topic(partial: Partial<TopicEvidence> & { topic: string }): TopicEvidence {
  return { asked: 0, missed: 0, students: 0, ...partial };
}

describe("hasEnoughEvidence", () => {
  it("refuses a class that has barely practiced", () => {
    expect(hasEnoughEvidence({ topics: [], answered: 0, students: 0 })).toBe(false);
  });

  it("refuses enough answers from too few people", () => {
    // The case this threshold exists for: one person having a bad afternoon
    // must never be reported to a teacher as what "the class" understands.
    expect(hasEnoughEvidence({
      topics: [],
      answered: MIN_ANSWERS * 5,
      students: MIN_STUDENTS - 1,
    })).toBe(false);
  });

  it("refuses enough people who have barely answered anything", () => {
    expect(hasEnoughEvidence({
      topics: [],
      answered: MIN_ANSWERS - 1,
      students: MIN_STUDENTS * 5,
    })).toBe(false);
  });

  it("accepts the exact boundary", () => {
    expect(hasEnoughEvidence({
      topics: [],
      answered: MIN_ANSWERS,
      students: MIN_STUDENTS,
    })).toBe(true);
  });
});

describe("missRate", () => {
  it("is zero for a topic nobody has been asked about, rather than dividing by zero", () => {
    expect(missRate(topic({ topic: "Osmosis" }))).toBe(0);
  });

  it("is the fraction missed", () => {
    expect(missRate(topic({ topic: "Osmosis", asked: 8, missed: 6 }))).toBe(0.75);
  });
});

describe("rankTopics", () => {
  it("drops topics nobody got wrong, because a list of things that are fine is not a to-do list", () => {
    const ranked = rankTopics([
      topic({ topic: "Mitosis", asked: 10, missed: 0, students: 5 }),
      topic({ topic: "Osmosis", asked: 10, missed: 4, students: 5 }),
    ]);
    expect(ranked.map((entry) => entry.topic)).toEqual(["Osmosis"]);
  });

  it("puts the worst rate first, not the biggest raw count", () => {
    const ranked = rankTopics([
      topic({ topic: "Cell cycle", asked: 100, missed: 20, students: 20 }),
      topic({ topic: "Osmosis", asked: 10, missed: 8, students: 5 }),
    ]);
    expect(ranked.map((entry) => entry.topic)).toEqual(["Osmosis", "Cell cycle"]);
  });

  it("breaks a tied rate on the larger sample", () => {
    const ranked = rankTopics([
      topic({ topic: "Thin", asked: 4, missed: 2, students: 2 }),
      topic({ topic: "Solid", asked: 40, missed: 20, students: 12 }),
    ]);
    expect(ranked.map((entry) => entry.topic)).toEqual(["Solid", "Thin"]);
  });

  it("leaves the input alone", () => {
    const input = [
      topic({ topic: "Cell cycle", asked: 10, missed: 1 }),
      topic({ topic: "Osmosis", asked: 10, missed: 9 }),
    ];
    rankTopics(input);
    expect(input.map((entry) => entry.topic)).toEqual(["Cell cycle", "Osmosis"]);
  });
});

import { describe, expect, it } from "vitest";
import { studyFingerprint } from "./fingerprint";
import {
  DEFAULT_PRACTICE_OPTIONS,
  describeOptions,
  difficultyBrief,
  normalizePracticeOptions,
  practiceOptionsKey,
} from "./practice-options";

describe("normalizePracticeOptions", () => {
  it("falls back to the defaults for nothing", () => {
    expect(normalizePracticeOptions(undefined)).toEqual(DEFAULT_PRACTICE_OPTIONS);
    expect(normalizePracticeOptions("ten")).toEqual(DEFAULT_PRACTICE_OPTIONS);
  });

  it("holds the question count inside its range", () => {
    expect(normalizePracticeOptions({ questionCount: 1 }).questionCount).toBe(5);
    expect(normalizePracticeOptions({ questionCount: 400 }).questionCount).toBe(20);
    expect(normalizePracticeOptions({ questionCount: 15 }).questionCount).toBe(15);
    expect(normalizePracticeOptions({ questionCount: "12" }).questionCount).toBe(12);
    expect(normalizePracticeOptions({ questionCount: NaN }).questionCount).toBe(10);
  });

  it("only accepts a difficulty it knows", () => {
    expect(normalizePracticeOptions({ difficulty: "demanding" }).difficulty).toBe("demanding");
    expect(normalizePracticeOptions({ difficulty: "impossible" }).difficulty).toBe("standard");
  });

  it("tidies the emphasis and caps its length", () => {
    expect(normalizePracticeOptions({ emphasis: "  osmosis   problems \n" }).emphasis).toBe(
      "osmosis problems",
    );
    expect(normalizePracticeOptions({ emphasis: "a".repeat(500) }).emphasis).toHaveLength(200);
    expect(normalizePracticeOptions({ emphasis: 42 }).emphasis).toBe("");
  });

  it("sorts and deduplicates the sections", () => {
    expect(
      normalizePracticeOptions({ sectionIds: ["b", "a", "b", "", 7, null] }).sectionIds,
    ).toEqual(["a", "b"]);
    expect(normalizePracticeOptions({ sectionIds: "a" }).sectionIds).toEqual([]);
  });
});

describe("practiceOptionsKey", () => {
  it("names the same configuration the same way whatever order it was built in", () => {
    const a = normalizePracticeOptions({
      questionCount: 15,
      difficulty: "demanding",
      emphasis: "Osmosis",
      sectionIds: ["s2", "s1"],
    });
    const b = normalizePracticeOptions({
      sectionIds: ["s1", "s2"],
      emphasis: "osmosis",
      difficulty: "demanding",
      questionCount: 15,
    });
    expect(practiceOptionsKey(a)).toBe(practiceOptionsKey(b));
  });

  it("tells two configurations apart on every field", () => {
    const base = DEFAULT_PRACTICE_OPTIONS;
    const keys = new Set([
      practiceOptionsKey(base),
      practiceOptionsKey({ ...base, questionCount: 20 }),
      practiceOptionsKey({ ...base, difficulty: "gentle" }),
      practiceOptionsKey({ ...base, emphasis: "mitosis" }),
      practiceOptionsKey({ ...base, sectionIds: ["s1"] }),
    ]);
    expect(keys.size).toBe(5);
  });
});

describe("studyFingerprint with a variant", () => {
  const notes = [{ id: "n1", currentVersionId: "v1" }];

  it("stores two configurations over the same notes separately", () => {
    const ten = studyFingerprint(notes, practiceOptionsKey(DEFAULT_PRACTICE_OPTIONS));
    const twenty = studyFingerprint(
      notes,
      practiceOptionsKey({ ...DEFAULT_PRACTICE_OPTIONS, questionCount: 20 }),
    );
    expect(ten).not.toBe(twenty);
  });

  it("still changes when the notes change, whatever was asked for", () => {
    const key = practiceOptionsKey(DEFAULT_PRACTICE_OPTIONS);
    expect(studyFingerprint(notes, key)).not.toBe(
      studyFingerprint([{ id: "n1", currentVersionId: "v2" }], key),
    );
  });

  it("leaves a request with no variant alone", () => {
    expect(studyFingerprint(notes, "")).toBe(studyFingerprint(notes));
  });
});

describe("difficultyBrief", () => {
  it("says something different for each level", () => {
    const briefs = new Set([
      difficultyBrief("gentle"),
      difficultyBrief("standard"),
      difficultyBrief("demanding"),
    ]);
    expect(briefs.size).toBe(3);
  });
});

describe("describeOptions", () => {
  it("reads as a sentence, naming only what was chosen", () => {
    expect(describeOptions(DEFAULT_PRACTICE_OPTIONS)).toBe("10 questions, standard");
    expect(
      describeOptions(
        {
          questionCount: 20,
          difficulty: "demanding",
          emphasis: "osmosis",
          sectionIds: ["s1"],
        },
        new Map([["s1", "Week 2: Cell structure"]]),
      ),
    ).toBe("20 questions, demanding, from Week 2: Cell structure, focused on osmosis");
  });

  it("leaves out a section it cannot name", () => {
    expect(
      describeOptions({ ...DEFAULT_PRACTICE_OPTIONS, sectionIds: ["gone"] }),
    ).toBe("10 questions, standard");
  });
});

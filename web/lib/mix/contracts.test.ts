import { describe, expect, it } from "vitest";
import { normalizeAttachmentAnalysis, normalizeOrganizedNote, normalizeStudyResult } from "@/lib/mix/contracts";

describe("mixed response normalization", () => {
  it("drops invalid note blocks and unknown section ids", () => {
    const result = normalizeOrganizedNote({
      title: " Cells ", summary: "A summary",
      blocks: [
        { type: "paragraph", text: "Useful content" },
        { type: "bullets", items: ["one", 2, "two"] },
        { type: "script", text: "not allowed" },
      ],
      takeaways: ["Remember this"], suggestedSectionId: "outside-pot", sectionConfidence: 12,
    }, new Set(["inside-pot"]));
    expect(result.blocks).toHaveLength(2);
    expect(result.suggestedSectionId).toBeNull();
    expect(result.sectionConfidence).toBe(1);
  });

  it("caps vision output and keeps its usefulness flag explicit", () => {
    const result = normalizeAttachmentAnalysis({ caption: "x".repeat(900), extractedText: "words", usefulForNote: false });
    expect(result.caption).toHaveLength(800);
    expect(result.usefulForNote).toBe(false);
  });

  it("rejects malformed practice questions", () => {
    const result = normalizeStudyResult("practice", {
      title: "Quiz",
      questions: [
        { prompt: "Valid?", choices: ["a", "b", "c", "d"], answerIndex: 2, explanation: "Because", sourceNoteTitle: "Note" },
        { prompt: "Invalid?", choices: ["yes", "no"], answerIndex: 0 },
      ],
    }) as { questions: unknown[] };
    expect(result.questions).toHaveLength(1);
  });
});

describe("normalizeOrganizedNote checks", () => {
  const noSections = new Set<string>();

  it("keeps a doubt that names both the claim and the reason", () => {
    const result = normalizeOrganizedNote(
      {
        title: "Cell division",
        summary: "s",
        blocks: [{ type: "paragraph", text: "Mitosis makes four cells." }],
        takeaways: [],
        checks: [{ claim: "Mitosis makes four cells.", concern: "Mitosis makes two; meiosis makes four." }],
        suggestedSectionId: null,
        sectionConfidence: 0,
      },
      noSections,
    );
    expect(result.checks).toEqual([
      { claim: "Mitosis makes four cells.", concern: "Mitosis makes two; meiosis makes four." },
    ]);
  });

  it("drops a half-formed doubt rather than showing a shrug", () => {
    const result = normalizeOrganizedNote(
      {
        title: "t",
        summary: "s",
        blocks: [{ type: "paragraph", text: "p" }],
        takeaways: [],
        checks: [
          { claim: "Something", concern: "" },
          { claim: "", concern: "Something is off" },
          { claim: "Real claim", concern: "Real reason" },
        ],
        suggestedSectionId: null,
        sectionConfidence: 0,
      },
      noSections,
    );
    // A doubt with no reason cannot be judged; a reason with no claim cannot
    // be found in the note. Only the complete one survives.
    expect(result.checks).toEqual([{ claim: "Real claim", concern: "Real reason" }]);
  });

  it("is empty when the mixer raises nothing, and when it sends nothing", () => {
    const base = {
      title: "t",
      summary: "s",
      blocks: [{ type: "paragraph", text: "p" }],
      takeaways: [],
      suggestedSectionId: null,
      sectionConfidence: 0,
    };
    expect(normalizeOrganizedNote({ ...base, checks: [] }, noSections).checks).toEqual([]);
    // Older stored payloads have no checks key at all.
    expect(normalizeOrganizedNote(base, noSections).checks).toEqual([]);
  });

  it("caps a runaway list", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ claim: `c${i}`, concern: `r${i}` }));
    const result = normalizeOrganizedNote(
      {
        title: "t",
        summary: "s",
        blocks: [{ type: "paragraph", text: "p" }],
        takeaways: [],
        checks: many,
        suggestedSectionId: null,
        sectionConfidence: 0,
      },
      noSections,
    );
    expect(result.checks).toHaveLength(6);
  });
});

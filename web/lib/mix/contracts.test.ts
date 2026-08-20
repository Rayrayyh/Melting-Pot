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

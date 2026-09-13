import { describe, expect, it } from "vitest";
import {
  normalizeAttachmentAnalysis,
  normalizeBlurt,
  normalizeFeynmanQuestion,
  normalizeFeynmanWrap,
  normalizeGraph,
  normalizeOrganizedNote,
  normalizeStudyResult,
} from "@/lib/mix/contracts";

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

  it("strips the prompt's own SOURCE NOTE label out of a source title", () => {
    const out = normalizeStudyResult("practice", {
      title: "Biology Practice Test",
      questions: [{
        prompt: "What happens to a cell in a hypertonic solution?",
        choices: ["It shrinks", "It swells", "It stays the same", "It divides"],
        answerIndex: 0,
        explanation: "Water leaves the cell.",
        sourceNoteTitle: "SOURCE NOTE 8: Osmosis and tonicity",
      }],
    }, 5) as { questions: { sourceNoteTitle: string }[] };
    expect(out.questions[0].sourceNoteTitle).toBe("Osmosis and tonicity");
  });

  it("leaves a title that merely mentions a source alone", () => {
    const out = normalizeStudyResult("flashcards", {
      cards: [{ front: "f", back: "b", sourceNoteTitle: "Sources of ATP", tags: [] }],
    }) as { cards: { sourceNoteTitle: string }[] };
    expect(out.cards[0].sourceNoteTitle).toBe("Sources of ATP");
  });
});

describe("normalizeBlurt", () => {
  const titles = ["Osmosis and tonicity", "Mitosis vs meiosis"];

  it("keeps only items with something to say", () => {
    const out = normalizeBlurt(
      {
        covered: [{ point: "water follows solute", noteTitle: "Osmosis and tonicity" }, { point: "", noteTitle: "x" }],
        missed: [{ point: "prophase comes first", noteTitle: "Mitosis vs meiosis", where: "first half" }, { point: "   " }],
        wrong: [{ claim: "mitosis makes four", correction: "Mitosis makes two.", noteTitle: "Mitosis vs meiosis" }, { claim: "", correction: "x" }],
      },
      titles,
    );
    expect(out.covered).toHaveLength(1);
    expect(out.missed).toHaveLength(1);
    expect(out.wrong).toHaveLength(1);
  });

  it("says when an item cannot be traced to a supplied note", () => {
    const out = normalizeBlurt(
      { covered: [{ point: "something", noteTitle: "Notes nobody wrote" }], missed: [], wrong: [] },
      titles,
    );
    expect(out.covered[0].noteTitle).toBe("Not traced to a note");
  });

  it("accepts a title the model wrapped in the prompt's own label", () => {
    const out = normalizeBlurt(
      { covered: [{ point: "water follows solute", noteTitle: "SOURCE NOTE 2: Osmosis and tonicity" }], missed: [], wrong: [] },
      titles,
    );
    expect(out.covered[0].noteTitle).toBe("Osmosis and tonicity");
  });

  it("caps the lists", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ point: `point ${i}`, noteTitle: "Osmosis and tonicity" }));
    const wrongMany = Array.from({ length: 40 }, (_, i) => ({
      claim: `claim ${i}`,
      correction: `correction ${i}`,
      noteTitle: "Osmosis and tonicity",
    }));
    const out = normalizeBlurt({ covered: many, missed: many, wrong: wrongMany }, titles);
    expect(out.covered).toHaveLength(15);
    expect(out.missed).toHaveLength(15);
    expect(out.wrong).toHaveLength(10);
  });
});

describe("normalizeFeynmanQuestion", () => {
  it("keeps one question, trimmed, or nothing", () => {
    expect(normalizeFeynmanQuestion({ question: "  Why does water move?  " }).question).toBe("Why does water move?");
    expect(normalizeFeynmanQuestion({ question: 42 }).question).toBe("");
    expect(normalizeFeynmanQuestion(null).question).toBe("");
  });
});

describe("normalizeFeynmanWrap", () => {
  it("keeps gaps that carry both the gap and the try-this", () => {
    const out = normalizeFeynmanWrap(
      {
        gaps: [
          { gap: "the order of phases", noteTitle: "Mitosis vs meiosis", tryThis: "Say the phases in order once more." },
          { gap: "no try-this", noteTitle: "Mitosis vs meiosis", tryThis: "" },
        ],
        summary: "You held the definitions; the sequence slipped.",
      },
      ["Mitosis vs meiosis"],
    );
    expect(out.gaps).toHaveLength(1);
    expect(out.gaps[0].noteTitle).toBe("Mitosis vs meiosis");
    expect(out.summary).toContain("held the definitions");
  });

  it("marks an untraceable note title honestly", () => {
    const out = normalizeFeynmanWrap(
      { gaps: [{ gap: "g", noteTitle: "Invented note", tryThis: "t" }], summary: "" },
      ["Mitosis vs meiosis"],
    );
    expect(out.gaps[0].noteTitle).toBe("Not traced to a note");
    expect(out.summary).toBe("");
  });
});

describe("normalizeGraph", () => {
  const nodes = [
    { id: "a", label: "Osmosis" },
    { id: "b", label: "Tonicity" },
    { id: "c", label: "Membrane" },
  ];

  it("drops edges that name nodes nobody sent, self edges, and duplicates", () => {
    const out = normalizeGraph({
      title: "Cells",
      nodes,
      edges: [
        { from: "a", to: "b", label: "measured by" },
        { from: "a", to: "ghost", label: "" },
        { from: "a", to: "a", label: "itself" },
        { from: "b", to: "a", label: "measured by" },
      ],
      stillToConfirm: [],
    }) as { edges: unknown[] };
    expect(out.edges).toHaveLength(1);
  });

  it("requires a label, deduplicates node ids, and caps both lists", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ id: `n${i}`, label: `Node ${i}` }));
    const out = normalizeGraph({
      title: "Big",
      nodes: [...many, { id: "n1", label: "Duplicate id" }, { id: "x", label: "" }],
      edges: Array.from({ length: 30 }, (_, i) => ({
        from: "n1", to: "n2", label: `edge ${i}`,
      })),
      stillToConfirm: [],
    }) as { nodes: unknown[]; edges: unknown[] };
    expect(out.nodes).toHaveLength(12);
    expect(out.edges).toHaveLength(1);
  });

  it("names an untitled graph", () => {
    const out = normalizeGraph({ title: "", nodes, edges: [], stillToConfirm: [] }) as { title: string };
    expect(out.title).toBe("Concept map");
  });
});

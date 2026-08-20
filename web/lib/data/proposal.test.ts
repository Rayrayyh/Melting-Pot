import { describe, expect, it } from "vitest";
import { parseProposedNote } from "@/lib/data/proposal";

describe("parseProposedNote", () => {
  it("reads back the organized note a whole-note correction was sent as", () => {
    const note = parseProposedNote({
      title: "Boiling points",
      summary: "When water changes state.",
      blocks: [{ type: "paragraph", text: "Water boils at 100 degrees." }],
      takeaways: ["Pressure changes the boiling point."],
    });
    expect(note).toEqual({
      title: "Boiling points",
      summary: "When water changes state.",
      blocks: [{ type: "paragraph", text: "Water boils at 100 degrees." }],
      takeaways: ["Pressure changes the boiling point."],
    });
  });

  it("returns null for a sentence correction, which carries no organized note", () => {
    expect(parseProposedNote(null)).toBeNull();
  });

  it("returns null rather than a note with no body", () => {
    expect(parseProposedNote({ title: "T", summary: "S", blocks: [], takeaways: [] })).toBeNull();
    expect(parseProposedNote({ title: "T" })).toBeNull();
  });

  it("drops blocks and takeaways that are not the shape they claim", () => {
    const note = parseProposedNote({
      title: 7,
      blocks: [{ type: "paragraph", text: "Kept." }, { type: "nonsense" }, "loose"],
      takeaways: ["Kept.", 12, null],
    });
    expect(note?.title).toBe("");
    expect(note?.summary).toBe("");
    expect(note?.blocks).toEqual([{ type: "paragraph", text: "Kept." }]);
    expect(note?.takeaways).toEqual(["Kept."]);
  });

  it("returns null for a value that is not an object", () => {
    expect(parseProposedNote("a string" as never)).toBeNull();
    expect(parseProposedNote([] as never)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { asSingleLine, blocksToBodyText } from "@/lib/organizer/edit";
import { selectableSentences } from "@/lib/diff";
import type { NoteBlock } from "@/lib/data/pot";

describe("asSingleLine", () => {
  it("collapses a pasted line break so a sentence stays one line", () => {
    expect(asSingleLine("Water boils\nat 100 degrees.")).toBe("Water boils at 100 degrees.");
  });

  it("collapses runs of whitespace and trims the ends", () => {
    expect(asSingleLine("  Water   boils \n\n at 100. ")).toBe("Water boils at 100.");
  });

  it("leaves a sentence that is already one line alone", () => {
    expect(asSingleLine("Water boils at 100 degrees.")).toBe("Water boils at 100 degrees.");
  });

  it("keeps a spliced correction inside one block", () => {
    // The bug this guards: body_text joins blocks with newlines, so a pasted
    // line break in a replacement invents a block boundary that no block has.
    const blocks: NoteBlock[] = [
      { type: "paragraph", text: "Water boils at 90 degrees." },
      { type: "paragraph", text: "Ice melts at zero." },
    ];
    const before = blocksToBodyText(blocks).split("\n").length;
    const replacement = asSingleLine("Water boils\nat 100 degrees.");
    const after = blocksToBodyText([
      { type: "paragraph", text: replacement },
      blocks[1],
    ]).split("\n").length;
    expect(after).toBe(before);
    expect(selectableSentences(replacement)).toHaveLength(1);
  });
});

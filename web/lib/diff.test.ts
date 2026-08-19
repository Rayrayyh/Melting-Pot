import { describe, expect, it } from "vitest";
import { diffWords, replaceInBlocks, selectableSentences, summarizeDiff } from "@/lib/diff";
import type { NoteBlock } from "@/lib/data/pot";

describe("diffWords", () => {
  it("marks unchanged text as same", () => {
    const segments = diffWords("water moves across", "water moves across");
    expect(segments).toEqual([{ type: "same", text: "water moves across" }]);
  });

  it("marks additions and removals at word level", () => {
    const segments = diffWords(
      "the movement of water",
      "the net movement of water",
    );
    expect(segments.some((s) => s.type === "added" && s.text.includes("net"))).toBe(true);
    expect(segments.filter((s) => s.type === "removed")).toHaveLength(0);
  });

  it("handles full replacement", () => {
    const segments = diffWords("old wording here", "completely new phrasing");
    expect(segments.some((s) => s.type === "removed")).toBe(true);
    expect(segments.some((s) => s.type === "added")).toBe(true);
  });
});

describe("summarizeDiff", () => {
  it("counts words honestly", () => {
    expect(summarizeDiff("a b c", "a b c d e")).toBe("This correction adds 2 words.");
    expect(summarizeDiff("a b c", "a c")).toBe("This correction removes 1 word.");
    expect(summarizeDiff("same", "same")).toBe("No wording changes.");
  });
});

describe("replaceInBlocks", () => {
  const blocks: NoteBlock[] = [
    { type: "paragraph", text: "First sentence. The body uses it for growth." },
    { type: "bullets", items: ["Mitosis copies", "Meiosis mixes"] },
    { type: "definition", term: "Osmosis", text: "Water moves toward solute." },
  ];

  it("replaces inside the containing paragraph", () => {
    const next = replaceInBlocks(
      blocks,
      "The body uses it for growth.",
      "The body uses it for growth and repair.",
    );
    expect(next).not.toBeNull();
    expect(next![0]).toMatchObject({
      text: "First sentence. The body uses it for growth and repair.",
    });
    expect(next![1]).toEqual(blocks[1]);
  });

  it("replaces inside a bullet item", () => {
    const next = replaceInBlocks(blocks, "Meiosis mixes", "Meiosis shuffles alleles");
    expect(next).not.toBeNull();
    expect(next![1]).toMatchObject({ items: ["Mitosis copies", "Meiosis shuffles alleles"] });
  });

  it("replaces inside a definition body", () => {
    const next = replaceInBlocks(
      blocks,
      "Water moves toward solute.",
      "Water shows net movement toward solute.",
    );
    expect(next).not.toBeNull();
    expect(next![2]).toMatchObject({
      type: "definition",
      text: "Water shows net movement toward solute.",
    });
  });

  it("returns null when the selection no longer exists (conflict)", () => {
    expect(replaceInBlocks(blocks, "text that is not there", "anything")).toBeNull();
  });
});

describe("selectableSentences", () => {
  it("splits on sentence boundaries", () => {
    expect(selectableSentences("One. Two! Three?")).toEqual(["One.", "Two!", "Three?"]);
  });
});

import { describe, expect, it } from "vitest";
import type { NoteBlock } from "@/lib/data/pot";
import { collectVocabulary, highlightTerms } from "@/lib/vocabulary";

describe("collectVocabulary", () => {
  it("takes every definition term", () => {
    const blocks: NoteBlock[] = [
      { type: "definition", term: "Osmosis", text: "Water moves across a membrane." },
      { type: "definition", term: "Active transport", text: "Movement that costs energy." },
    ];
    expect(collectVocabulary(blocks)).toContain("Osmosis");
    expect(collectVocabulary(blocks)).toContain("Active transport");
  });

  it("takes capitalised multi-word phrases from the body", () => {
    const blocks: NoteBlock[] = [
      { type: "paragraph", text: "The Krebs Cycle runs inside the mitochondria." },
      { type: "paragraph", text: "Golgi Apparatus packages proteins for export." },
    ];
    const terms = collectVocabulary(blocks);
    expect(terms).toContain("Krebs Cycle");
    expect(terms).toContain("Golgi Apparatus");
  });

  it("takes emphasised terms and acronyms", () => {
    const blocks: NoteBlock[] = [
      { type: "paragraph", text: "Energy is carried by ATP around the cell." },
      { type: "bullets", items: ['The *turgor pressure* rises.', 'A "solute potential" falls.'] },
    ];
    const terms = collectVocabulary(blocks);
    expect(terms).toContain("ATP");
    expect(terms).toContain("turgor pressure");
    expect(terms).toContain("solute potential");
  });

  it("returns terms longest first and without duplicates", () => {
    const blocks: NoteBlock[] = [
      { type: "definition", term: "Cell", text: "The Cell Membrane holds it together." },
      { type: "paragraph", text: "The Cell Membrane is selectively permeable." },
    ];
    const terms = collectVocabulary(blocks);
    expect(terms.filter((t) => t === "Cell Membrane")).toHaveLength(1);
    expect(terms[0]).toBe("Cell Membrane");
    for (let i = 1; i < terms.length; i += 1) {
      expect(terms[i - 1].length).toBeGreaterThanOrEqual(terms[i].length);
    }
  });

  it("does not treat a title cased heading as vocabulary", () => {
    const blocks: NoteBlock[] = [{ type: "heading", text: "How Water Moves" }];
    expect(collectVocabulary(blocks)).not.toContain("How Water Moves");
  });

  it("drops a weak word that only opened the sentence", () => {
    const blocks: NoteBlock[] = [
      { type: "paragraph", text: "The Light Reactions need sunlight." },
    ];
    const terms = collectVocabulary(blocks);
    expect(terms).toContain("Light Reactions");
    expect(terms).not.toContain("The Light Reactions");
  });

  it("keeps a comma from gluing two terms together", () => {
    const blocks: NoteBlock[] = [
      { type: "paragraph", text: "Two organelles matter here: Golgi Apparatus, Rough Endoplasmic." },
    ];
    const terms = collectVocabulary(blocks);
    expect(terms).toContain("Golgi Apparatus");
    expect(terms).toContain("Rough Endoplasmic");
    expect(terms).not.toContain("Golgi Apparatus Rough Endoplasmic");
  });

  it("returns nothing for a note with no key terms", () => {
    const blocks: NoteBlock[] = [{ type: "paragraph", text: "it all happens quite slowly." }];
    expect(collectVocabulary(blocks)).toEqual([]);
  });
});

describe("highlightTerms", () => {
  it("returns one plain run when there are no terms", () => {
    expect(highlightTerms("water moves across", [])).toEqual([
      { text: "water moves across", term: false },
    ]);
  });

  it("returns nothing for empty text", () => {
    expect(highlightTerms("", ["osmosis"])).toEqual([]);
  });

  it("marks a term inside a sentence", () => {
    const runs = highlightTerms("Water enters by osmosis today.", ["osmosis"]);
    expect(runs).toEqual([
      { text: "Water enters by ", term: false },
      { text: "osmosis", term: true },
      { text: " today.", term: false },
    ]);
  });

  it("matches without regard to case and keeps the original casing", () => {
    const runs = highlightTerms("OSMOSIS and Osmosis and osmosis", ["osmosis"]);
    expect(runs.filter((run) => run.term).map((run) => run.text)).toEqual([
      "OSMOSIS",
      "Osmosis",
      "osmosis",
    ]);
  });

  it("prefers the longest term where two terms start together", () => {
    const runs = highlightTerms("The cell membrane is thin.", ["cell", "cell membrane"]);
    expect(runs.filter((run) => run.term).map((run) => run.text)).toEqual(["cell membrane"]);
  });

  it("never matches inside another match", () => {
    const runs = highlightTerms("active transport costs energy", [
      "transport",
      "active transport",
    ]);
    expect(runs.filter((run) => run.term).map((run) => run.text)).toEqual(["active transport"]);
  });

  it("matches whole words only", () => {
    const runs = highlightTerms("cellular walls surround the cell", ["cell"]);
    expect(runs.filter((run) => run.term).map((run) => run.text)).toEqual(["cell"]);
    expect(runs[0]).toEqual({ text: "cellular walls surround the ", term: false });
  });

  it("treats regex metacharacters in a term as literal text", () => {
    const runs = highlightTerms("we compared C++ and (a+b)* in class", ["C++", "(a+b)*"]);
    expect(runs.filter((run) => run.term).map((run) => run.text)).toEqual(["C++", "(a+b)*"]);
  });

  it("matches a phrase that wrapped across a line", () => {
    const runs = highlightTerms("the cell\nmembrane holds", ["cell membrane"]);
    expect(runs.filter((run) => run.term).map((run) => run.text)).toEqual(["cell\nmembrane"]);
  });

  it("rebuilds the original text exactly", () => {
    const text = "Osmosis and active transport both move solutes across a membrane.";
    const runs = highlightTerms(text, ["osmosis", "active transport", "membrane"]);
    expect(runs.map((run) => run.text).join("")).toBe(text);
  });

  it("ignores blank and duplicated terms", () => {
    const runs = highlightTerms("osmosis happens", ["  ", "osmosis", "OSMOSIS"]);
    expect(runs.filter((run) => run.term)).toHaveLength(1);
  });

  it("stays fast on a long body with many terms", () => {
    const sentence = "The cell membrane controls what enters, and osmosis moves the water. ";
    const body = sentence.repeat(4000);
    const terms = [
      ...Array.from({ length: 60 }, (_, i) => `Term Number ${i}`),
      "cell membrane",
      "osmosis",
    ];
    const start = Date.now();
    const runs = highlightTerms(body, terms);
    expect(Date.now() - start).toBeLessThan(1000);
    expect(runs.map((run) => run.text).join("")).toBe(body);
    expect(runs.filter((run) => run.term)).toHaveLength(8000);
  });
});

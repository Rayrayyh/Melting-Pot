import { describe, expect, it } from "vitest";
import {
  FORCE_FAILURE_TOKEN,
  deriveTitle,
  deterministicOrganizer,
  splitSentences,
  suggestSection,
} from "@/lib/organizer/deterministic";
import { OrganizeError } from "@/lib/organizer/types";

const SECTIONS = [
  { id: "s1", title: "Week 1: Foundations" },
  { id: "s2", title: "Week 2: Cell structure" },
  { id: "s3", title: "Week 3: Cell division" },
];

function organize(rawText: string, sections = SECTIONS) {
  return deterministicOrganizer.organize({ rawText, sections });
}

describe("deriveTitle", () => {
  it("strips filler openers and clips to eight words", () => {
    expect(deriveTitle("ok so photosynthesis happens in the chloroplast when light hits it")).toBe(
      "Photosynthesis happens in the chloroplast when light hits",
    );
  });

  it("recognizes versus phrases as natural titles", () => {
    expect(deriveTitle("ok so mitosis vs meiosis keeps confusing people.")).toBe(
      "Mitosis vs meiosis",
    );
  });
});

describe("organize", () => {
  it("preserves uncertainty instead of resolving it", async () => {
    const result = await organize(
      "the calvin cycle runs in the stroma and uses ATP. need to double check where water splitting happens",
    );
    const still = result.blocks.find(
      (b) => b.type === "paragraph" && b.text.startsWith("Still to confirm:"),
    );
    expect(still).toBeDefined();
    expect(JSON.stringify(result.blocks)).toContain("water splitting");
  });

  it("turns definition-shaped sentences into definition blocks", async () => {
    const result = await organize(
      "osmosis = water moving across a membrane toward more solute. it matters for cells because they can shrivel or burst.",
    );
    const definition = result.blocks.find((b) => b.type === "definition");
    expect(definition).toMatchObject({ type: "definition", term: "Osmosis" });
  });

  it("turns fact runs into bullet lists", async () => {
    const result = await organize(
      "nucleus holds DNA, mitochondria makes ATP, ribosomes make proteins, golgi packages and ships stuff, lysosomes digest waste",
    );
    const bullets = result.blocks.find((b) => b.type === "bullets");
    expect(bullets).toBeDefined();
    expect(bullets && bullets.type === "bullets" ? bullets.items.length : 0).toBeGreaterThanOrEqual(4);
  });

  it("turns dashed lines into bullet lists", async () => {
    const result = await organize(
      "things the exam covers\n- scientific method vocab\n- organelle functions\n- osmosis problems",
    );
    const bullets = result.blocks.find((b) => b.type === "bullets");
    expect(bullets && bullets.type === "bullets" ? bullets.items : []).toHaveLength(3);
  });

  it("extracts marked sentences as takeaways", async () => {
    const result = await organize(
      "interphase is most of the cell cycle. remember that checkpoints stop damaged cells from dividing. the exam will focus on the phase order.",
    );
    expect(result.takeaways.length).toBeGreaterThanOrEqual(1);
    expect(result.takeaways.join(" ")).toMatch(/checkpoints|exam/i);
  });

  it("suggests the overlapping section", async () => {
    const result = await organize(
      "cell division happens in mitosis and the cycle has checkpoints",
    );
    expect(result.suggestedSectionId).toBe("s3");
  });

  it("suggests nothing when nothing overlaps", () => {
    const suggestion = suggestSection("completely unrelated cooking recipe", SECTIONS);
    expect(suggestion.id).toBeNull();
  });

  it("rejects empty and too-short input with typed errors", async () => {
    await expect(organize("")).rejects.toThrowError(OrganizeError);
    await expect(organize("just this")).rejects.toMatchObject({ reason: "too_short" });
  });

  it("honors the forced-failure token for testing", async () => {
    await expect(
      organize(`real content here about biology ${FORCE_FAILURE_TOKEN}`),
    ).rejects.toMatchObject({ reason: "provider_failed" });
  });

  it("never invents content: every output word traces to the input", async () => {
    const raw =
      "enzymes lower activation energy. they are proteins that catalyze reactions without being consumed.";
    const result = await organize(raw);
    const inputWords = new Set(
      raw.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean),
    );
    const addedVocabulary = ["Still", "to", "confirm"];
    for (const block of result.blocks) {
      const text =
        block.type === "bullets"
          ? block.items.join(" ")
          : block.type === "definition"
            ? `${block.term} ${block.text}`
            : block.text;
      for (const word of text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean)) {
        if (addedVocabulary.map((w) => w.toLowerCase()).includes(word)) continue;
        expect(inputWords, `unexpected word "${word}"`).toContain(word);
      }
    }
  });
});

describe("splitSentences", () => {
  it("splits on terminators and newlines", () => {
    expect(splitSentences("one. two! three?\nfour")).toHaveLength(4);
  });
});

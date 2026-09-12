import { describe, expect, it } from "vitest";
import { countWords } from "./word-count";

describe("countWords", () => {
  it("counts runs of non-whitespace", () => {
    expect(countWords("one two three")).toBe(3);
    expect(countWords("  spaced   out \n words ")).toBe(3);
    expect(countWords("don't stop")).toBe(2);
  });

  it("says nothing for nothing", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n\t ")).toBe(0);
  });
});

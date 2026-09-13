import { describe, expect, it } from "vitest";
import { graphOptionsKey, normalizeTier, tierBrief } from "./graph-options";

describe("normalizeTier", () => {
  it("defaults to the quick drawing and accepts only the two tiers", () => {
    expect(normalizeTier(undefined)).toBe("fast");
    expect(normalizeTier("careful")).toBe("careful");
    expect(normalizeTier("fast")).toBe("fast");
    expect(normalizeTier("deepest")).toBe("fast");
  });
});

describe("graphOptionsKey", () => {
  it("names the two tiers differently, so they store separately", () => {
    expect(graphOptionsKey("fast")).not.toBe(graphOptionsKey("careful"));
    expect(graphOptionsKey("fast")).toBe(graphOptionsKey("fast"));
  });
});

describe("tierBrief", () => {
  it("says something different for each tier", () => {
    expect(tierBrief("fast")).not.toBe(tierBrief("careful"));
  });
});

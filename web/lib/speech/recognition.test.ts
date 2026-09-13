import { describe, expect, it } from "vitest";
import { isSpeechRecognitionSupported, mergeTranscript } from "./recognition";
import { isSpeechSynthesisSupported } from "./voice";

describe("mergeTranscript", () => {
  it("joins the settled words with the interim tail", () => {
    expect(mergeTranscript("water moves", "toward higher")).toBe("water moves toward higher");
    expect(mergeTranscript("", "first words")).toBe("first words");
  });

  it("collapses the gaps both halves leave behind", () => {
    expect(mergeTranscript("trailing ", "  leading")).toBe("trailing leading");
    expect(mergeTranscript("   ", "   ")).toBe("");
  });
});

describe("support probes", () => {
  it("reports no speech APIs in this node environment", () => {
    // This is the fact the typed fallback exists for: the components must
    // behave the same way a Firefox reader's browser does.
    expect(isSpeechRecognitionSupported()).toBe(false);
    expect(isSpeechSynthesisSupported()).toBe(false);
  });
});

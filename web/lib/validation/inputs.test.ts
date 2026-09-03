import { describe, expect, it } from "vitest";
import { classCodeSchema, noteViewSchema, parseOrNull, uuidSchema } from "@/lib/validation/inputs";

const UUID = "9e8111ac-2dd6-4fe3-82b6-41e24ab9c775";

describe("classCodeSchema", () => {
  it("accepts a six character code and normalises it", () => {
    expect(classCodeSchema.parse(" hxu863 ")).toBe("HXU863");
  });

  it("refuses the wrong length, punctuation and empty input", () => {
    for (const bad of ["", "ABC12", "ABC1234", "ABC-12", "ABC 12", "  ", "ABCDEF7"]) {
      expect(classCodeSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("uuidSchema", () => {
  it("accepts a uuid and refuses anything else", () => {
    expect(uuidSchema.safeParse(UUID).success).toBe(true);
    for (const bad of ["", "1", `${UUID}'`, `${UUID} or 1=1`, "../../etc/passwd"]) {
      expect(uuidSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("noteViewSchema", () => {
  it("requires both ids", () => {
    expect(noteViewSchema.safeParse({ potId: UUID, noteId: UUID }).success).toBe(true);
    expect(noteViewSchema.safeParse({ potId: UUID }).success).toBe(false);
    expect(noteViewSchema.safeParse({ potId: "x", noteId: UUID }).success).toBe(false);
  });
});

describe("parseOrNull", () => {
  it("returns the parsed value or null, never throws", () => {
    expect(parseOrNull(classCodeSchema, "hxu863")).toBe("HXU863");
    expect(parseOrNull(classCodeSchema, "nope")).toBeNull();
    expect(parseOrNull(uuidSchema, undefined)).toBeNull();
  });
});

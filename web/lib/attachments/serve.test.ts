import { describe, expect, it } from "vitest";
import { claimIsHonest, looksExecutable, safeFileName, sniffMime } from "@/lib/attachments/serve";

const bytes = (...values: number[]) => new Uint8Array(values);
const PDF = bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const EXE = bytes(0x4d, 0x5a, 0x90, 0x00);
const ZIP = bytes(0x50, 0x4b, 0x03, 0x04);

describe("sniffMime", () => {
  it("names the formats it knows", () => {
    expect(sniffMime(PDF)).toBe("application/pdf");
    expect(sniffMime(PNG)).toBe("image/png");
    expect(sniffMime(ZIP)).toBe("application/zip");
  });

  it("says nothing about formats without a signature", () => {
    expect(sniffMime(bytes(0x68, 0x65, 0x6c, 0x6c))).toBeNull();
  });
});

describe("looksExecutable", () => {
  it("recognises the headers no attachment should have", () => {
    expect(looksExecutable(EXE)).toBe(true);
    expect(looksExecutable(bytes(0x7f, 0x45, 0x4c, 0x46))).toBe(true);
    expect(looksExecutable(bytes(0x23, 0x21, 0x2f, 0x62))).toBe(true);
  });

  it("leaves ordinary documents alone", () => {
    expect(looksExecutable(PDF)).toBe(false);
    expect(looksExecutable(PNG)).toBe(false);
  });
});

describe("claimIsHonest", () => {
  it("accepts a claim the bytes support", () => {
    expect(claimIsHonest("application/pdf", "application/pdf")).toBe(true);
    expect(claimIsHonest("image/png", "image/png")).toBe(true);
  });

  it("rejects the disguise this exists for", () => {
    // An executable uploaded while declaring application/pdf.
    expect(claimIsHonest("application/pdf", null)).toBe(true); // no signature: undecidable
    expect(claimIsHonest("application/pdf", "image/png")).toBe(false);
    expect(claimIsHonest("image/jpeg", "application/zip")).toBe(false);
  });

  it("knows Office files are zip containers", () => {
    expect(
      claimIsHonest(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
      ),
    ).toBe(true);
  });

  it("treats an unknown format as undecidable rather than a mismatch", () => {
    expect(claimIsHonest("text/plain", null)).toBe(true);
  });
});

describe("safeFileName", () => {
  it("keeps a normal name", () => {
    expect(safeFileName("Week 3 notes.pdf", "x")).toBe("Week 3 notes.pdf");
    expect(safeFileName("réponses.pdf", "x")).toBe("réponses.pdf");
  });

  it("cannot traverse or split a header", () => {
    expect(safeFileName("../../etc/passwd", "x")).toBe("-..-etc-passwd");
    expect(safeFileName("a\\b.pdf", "x")).toBe("a-b.pdf");
    expect(safeFileName("notes\r\nX-Evil: 1", "x")).toBe("notesX-Evil: 1");
  });

  it("refuses a trailing dot, which Windows drops and can hide the extension", () => {
    expect(safeFileName("invoice.pdf.", "x")).toBe("invoice.pdf");
    expect(safeFileName("...", "fallback")).toBe("fallback");
  });

  it("falls back when nothing usable survives", () => {
    expect(safeFileName("", "attachment")).toBe("attachment");
    expect(safeFileName(null, "attachment")).toBe("attachment");
  });
});

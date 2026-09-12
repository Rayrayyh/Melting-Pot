import { describe, expect, it } from "vitest";
import {
  chunk,
  foldGuides,
  mirrorRows,
  pageCount,
  perSheet,
  sheetLayout,
} from "./print-layout";

describe("sheetLayout", () => {
  it("knows its layouts and falls back to the nine-up sheet", () => {
    expect(sheetLayout("2x5").cols).toBe(2);
    expect(sheetLayout("nope")).toEqual({ key: "3x3", cols: 3, rows: 3 });
    expect(perSheet(sheetLayout("2x4"))).toBe(8);
  });
});

describe("chunk", () => {
  it("splits into full pages and a remainder", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 4)).toEqual([]);
    expect(pageCount(20, sheetLayout("2x5"))).toBe(2);
    expect(pageCount(0, sheetLayout("3x3"))).toBe(0);
  });
});

describe("mirrorRows", () => {
  it("reverses each row so long-edge duplex lines backs up with fronts", () => {
    // Fronts laid out row by row:      The backs page must read:
    //   A B                               B A
    //   C D                               D C
    //   E                                 E
    expect(mirrorRows(["A", "B", "C", "D", "E"], 2)).toEqual(["B", "A", "D", "C", "E"]);
    expect(mirrorRows(["A", "B", "C"], 3)).toEqual(["C", "B", "A"]);
    expect(mirrorRows([], 3)).toEqual([]);
  });

  it("keeps every card, so no back is ever lost", () => {
    const page = Array.from({ length: 7 }, (_, i) => i);
    const mirrored = mirrorRows(page, 3);
    expect([...mirrored].sort((a, b) => a - b)).toEqual([...page].sort((a, b) => a - b));
  });
});

describe("foldGuides", () => {
  it("sits one guide at each internal row gap, as a percentage", () => {
    expect(foldGuides(3)).toEqual([33.33333333333333, 66.66666666666666]);
    expect(foldGuides(1)).toEqual([]);
  });
});

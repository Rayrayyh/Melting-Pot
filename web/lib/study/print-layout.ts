/**
 * The arithmetic behind printed flashcards.
 *
 * The one non-obvious rule is the mirror: on the backs page, every row is
 * reversed. A printer that flips on the long edge turns the sheet over left
 * to right, so a back printed straight under its front would land upside
 * down and in the wrong column. Mirrored within the row, each back lines up
 * behind its front.
 */

export const SHEET_LAYOUTS = [
  { key: "3x3", cols: 3, rows: 3 },
  { key: "2x4", cols: 2, rows: 4 },
  { key: "2x5", cols: 2, rows: 5 },
] as const;

export type SheetLayout = (typeof SHEET_LAYOUTS)[number];

export type PaperSize = "letter" | "a4";

/** Aspect ratio (width over height) of each paper size, for the preview. */
export const PAPER_ASPECT: Record<PaperSize, string> = {
  letter: "17 / 22",
  a4: "210 / 297",
};

export function sheetLayout(key: string): SheetLayout {
  return SHEET_LAYOUTS.find((layout) => layout.key === key) ?? SHEET_LAYOUTS[0];
}

export function perSheet(layout: SheetLayout): number {
  return layout.cols * layout.rows;
}

export function pageCount(cardCount: number, layout: SheetLayout): number {
  if (cardCount <= 0) return 0;
  return Math.ceil(cardCount / perSheet(layout));
}

/** Row-major pages of at most `size` items. */
export function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    pages.push(items.slice(start, start + size));
  }
  return pages;
}

/**
 * Reverse each row of a row-major page, keeping the page's length. The last
 * row may be partial; it is reversed across the cells that exist, which is
 * what the sheet will actually show.
 */
export function mirrorRows<T>(page: T[], cols: number): T[] {
  const out: T[] = [];
  for (let row = 0; row < page.length; row += cols) {
    const cells = page.slice(row, row + cols);
    out.push(...cells.reverse());
  }
  return out;
}

/** Percentage heights of the fold guides, one at the centre of each row gap. */
export function foldGuides(rows: number): number[] {
  if (rows < 2) return [];
  return Array.from({ length: rows - 1 }, (_, i) => ((i + 1) / rows) * 100);
}

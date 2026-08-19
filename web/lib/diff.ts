import type { NoteBlock } from "@/lib/data/pot";

// Word-level diffing for before/after comparisons. Additions and removals
// are always paired with text labels in the UI; color is never the only
// signal (SPEC + design direction).

export type DiffSegment = { type: "same" | "added" | "removed"; text: string };

function words(text: string): string[] {
  return text.split(/(\s+)/).filter((w) => w.length > 0);
}

/** Longest-common-subsequence word diff. */
export function diffWords(before: string, after: string): DiffSegment[] {
  const a = words(before);
  const b = words(after);
  const m = a.length;
  const n = b.length;

  // DP table of LCS lengths.
  const table: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      table[i][j] =
        a[i] === b[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const segments: DiffSegment[] = [];
  const push = (type: DiffSegment["type"], text: string) => {
    const last = segments[segments.length - 1];
    if (last && last.type === type) last.text += text;
    else segments.push({ type, text });
  };

  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      push("removed", a[i]);
      i++;
    } else {
      push("added", b[j]);
      j++;
    }
  }
  while (i < m) {
    push("removed", a[i]);
    i++;
  }
  while (j < n) {
    push("added", b[j]);
    j++;
  }
  return segments;
}

/** Honest, deterministic description of what a replacement changes. */
export function summarizeDiff(before: string, after: string): string {
  const segments = diffWords(before, after);
  const added = segments
    .filter((s) => s.type === "added")
    .flatMap((s) => s.text.split(/\s+/))
    .filter(Boolean).length;
  const removed = segments
    .filter((s) => s.type === "removed")
    .flatMap((s) => s.text.split(/\s+/))
    .filter(Boolean).length;
  if (added === 0 && removed === 0) return "No wording changes.";
  const parts: string[] = [];
  if (added > 0) parts.push(`adds ${added} ${added === 1 ? "word" : "words"}`);
  if (removed > 0) parts.push(`removes ${removed} ${removed === 1 ? "word" : "words"}`);
  const description = parts.join(" and ");
  return `This correction ${description}.`;
}

/**
 * Applies a sentence-level replacement inside structured blocks. Returns
 * null when the selected text no longer exists (a conflict for the
 * maintainer to see, never silently resolved).
 */
export function replaceInBlocks(
  blocks: NoteBlock[],
  selected: string,
  proposed: string,
): NoteBlock[] | null {
  let replaced = false;
  const next = blocks.map((block): NoteBlock => {
    if (replaced) return block;
    switch (block.type) {
      case "paragraph":
      case "heading":
      case "example": {
        if (block.text.includes(selected)) {
          replaced = true;
          return { ...block, text: block.text.replace(selected, proposed) };
        }
        return block;
      }
      case "definition": {
        if (block.text.includes(selected)) {
          replaced = true;
          return { ...block, text: block.text.replace(selected, proposed) };
        }
        if (`${block.term}: ${block.text}`.includes(selected)) {
          replaced = true;
          const combined = `${block.term}: ${block.text}`.replace(selected, proposed);
          const split = combined.match(/^([^:]{1,60}):\s*(.*)$/s);
          if (split) return { type: "definition", term: split[1], text: split[2] };
          return { type: "paragraph", text: combined };
        }
        return block;
      }
      case "bullets": {
        const index = block.items.findIndex((item) => item.includes(selected));
        if (index >= 0) {
          replaced = true;
          const items = [...block.items];
          items[index] = items[index].replace(selected, proposed);
          return { ...block, items };
        }
        return block;
      }
    }
  });
  return replaced ? next : null;
}

/** Splits body text into selectable sentences for the correction picker. */
export function selectableSentences(bodyText: string): string[] {
  return bodyText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

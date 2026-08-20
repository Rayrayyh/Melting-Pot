import type { NoteBlock } from "@/lib/data/pot";

// Round-trips organized blocks through a plain-text editing surface so the
// contributor can rewrite anything (SPEC: allow complete editing). Blank
// lines separate blocks; "- " lines form bullets; "Term: text" on its own
// block stays a definition; "Example: text" stays an example.

export function blocksToEditableText(blocks: NoteBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "bullets":
          return block.items.map((item) => `- ${item}`).join("\n");
        case "definition":
          return `${block.term}: ${block.text}`;
        case "example":
          return `Example: ${block.text}`;
        case "heading":
          return `# ${block.text}`;
        default:
          return block.text;
      }
    })
    .join("\n\n");
}

export function editableTextToBlocks(text: string): NoteBlock[] {
  const chunks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter(Boolean);

  const blocks: NoteBlock[] = [];
  for (const chunk of chunks) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.every((l) => l.startsWith("- ")) && lines.length > 0) {
      blocks.push({ type: "bullets", items: lines.map((l) => l.slice(2).trim()) });
      continue;
    }
    if (lines.length === 1) {
      const line = lines[0];
      if (line.startsWith("# ")) {
        blocks.push({ type: "heading", text: line.slice(2).trim() });
        continue;
      }
      const exampleMatch = line.match(/^Example:\s+(.+)$/i);
      if (exampleMatch) {
        blocks.push({ type: "example", text: exampleMatch[1] });
        continue;
      }
      const definitionMatch = line.match(/^([A-Za-z][A-Za-z0-9 ()-]{1,40}?):\s+(.+)$/);
      if (definitionMatch && definitionMatch[1].split(" ").length <= 4) {
        blocks.push({
          type: "definition",
          term: definitionMatch[1],
          text: definitionMatch[2],
        });
        continue;
      }
    }
    blocks.push({ type: "paragraph", text: lines.join(" ") });
  }
  return blocks;
}

// Blocks and bullet items join with newlines so a sentence boundary can
// never sit inside a block. selectableSentences splits on those newlines,
// which guarantees every selectable sentence lives inside a single block
// and replaceInBlocks can always find it.
export function blocksToBodyText(blocks: NoteBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "bullets":
          return block.items.join("\n");
        case "definition":
          return `${block.term}: ${block.text}`;
        default:
          return block.text;
      }
    })
    .join("\n");
}

/**
 * A sentence correction is spliced into the one block that holds the sentence,
 * and blocks are joined with newlines, so a line break pasted into the
 * replacement would invent a block boundary that no block actually has: the
 * note would render one paragraph as two and every later sentence offset would
 * be wrong. Collapsing the whitespace keeps the replacement on the single line
 * it replaces. Whole-note corrections do not come through here, because there
 * the line breaks are the structure.
 */
export function asSingleLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

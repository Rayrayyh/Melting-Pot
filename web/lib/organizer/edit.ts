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

export function blocksToBodyText(blocks: NoteBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "bullets":
          return block.items.join(" ");
        case "definition":
          return `${block.term}: ${block.text}`;
        default:
          return block.text;
      }
    })
    .join(" ");
}

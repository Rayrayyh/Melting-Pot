import type { NoteBlock } from "@/lib/data/pot";

export type AttachmentAnalysis = {
  id: string;
  caption: string;
  extractedText: string;
  usefulForNote: boolean;
};

export type StudyKind = "summary" | "flashcards" | "practice";

export const attachmentAnalysisSchema = {
  type: "object",
  properties: {
    caption: { type: "string" },
    extractedText: { type: "string" },
    usefulForNote: { type: "boolean" },
  },
  required: ["caption", "extractedText", "usefulForNote"],
  additionalProperties: false,
} as const;

const noteBlockSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["paragraph", "heading", "bullets", "definition", "example"] },
    text: { type: "string" },
    items: { type: "array", items: { type: "string" } },
    term: { type: "string" },
  },
  required: ["type"],
  additionalProperties: false,
} as const;

/**
 * Something in the note that looks wrong, said out loud rather than tidied
 * away. The claim is quoted from the writing; the concern says why it is
 * doubtful. Never a rewrite: the body stays what the person wrote, and a
 * person decides what to do about the doubt.
 */
const noteCheckSchema = {
  type: "object",
  properties: {
    claim: { type: "string" },
    concern: { type: "string" },
  },
  required: ["claim", "concern"],
  additionalProperties: false,
} as const;

export const organizedNoteSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    blocks: { type: "array", items: noteBlockSchema },
    takeaways: { type: "array", items: { type: "string" } },
    checks: { type: "array", items: noteCheckSchema },
    suggestedSectionId: { type: ["string", "null"] },
    sectionConfidence: { type: "number" },
  },
  required: ["title", "summary", "blocks", "takeaways", "checks", "suggestedSectionId", "sectionConfidence"],
  additionalProperties: false,
} as const;

export type NoteCheck = { claim: string; concern: string };

export const studySchemas = {
  summary: {
    type: "object",
    properties: {
      overview: { type: "string" },
      keyTopics: {
        type: "array",
        items: {
          type: "object",
          properties: { title: { type: "string" }, explanation: { type: "string" } },
          required: ["title", "explanation"],
          additionalProperties: false,
        },
      },
      stillToConfirm: { type: "array", items: { type: "string" } },
    },
    required: ["overview", "keyTopics", "stillToConfirm"],
    additionalProperties: false,
  },
  flashcards: {
    type: "object",
    properties: {
      cards: {
        type: "array",
        items: {
          type: "object",
          properties: {
            front: { type: "string" }, back: { type: "string" }, sourceNoteTitle: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
          },
          required: ["front", "back", "sourceNoteTitle", "tags"],
          additionalProperties: false,
        },
      },
    },
    required: ["cards"],
    additionalProperties: false,
  },
  practice: {
    type: "object",
    properties: {
      title: { type: "string" },
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            prompt: { type: "string" },
            choices: { type: "array", items: { type: "string" } },
            answerIndex: { type: "integer" },
            explanation: { type: "string" },
            sourceNoteTitle: { type: "string" },
          },
          required: ["prompt", "choices", "answerIndex", "explanation", "sourceNoteTitle"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "questions"],
    additionalProperties: false,
  },
} as const;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function textList(value: unknown, maxItems: number, maxLength: number): string[] {
  return Array.isArray(value)
    ? value.map((item) => text(item, maxLength)).filter(Boolean).slice(0, maxItems)
    : [];
}

export function normalizeAttachmentAnalysis(value: unknown): Omit<AttachmentAnalysis, "id"> {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    caption: text(item.caption, 800),
    extractedText: text(item.extractedText, 6000),
    usefulForNote: item.usefulForNote === true,
  };
}

export function normalizeOrganizedNote(value: unknown, validSectionIds: Set<string>) {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const blocks: NoteBlock[] = [];
  for (const candidate of Array.isArray(item.blocks) ? item.blocks.slice(0, 40) : []) {
    if (!candidate || typeof candidate !== "object") continue;
    const block = candidate as Record<string, unknown>;
    const type = block.type;
    if (type === "bullets") {
      const items = textList(block.items, 20, 500);
      if (items.length) blocks.push({ type, items });
    } else if (type === "definition") {
      const term = text(block.term, 120);
      const body = text(block.text, 1200);
      if (term && body) blocks.push({ type, term, text: body });
    } else if (type === "paragraph" || type === "heading" || type === "example") {
      const body = text(block.text, 1600);
      if (body) blocks.push({ type, text: body });
    }
  }
  const suggested = typeof item.suggestedSectionId === "string" && validSectionIds.has(item.suggestedSectionId)
    ? item.suggestedSectionId
    : null;
  const checks: NoteCheck[] = [];
  for (const candidate of Array.isArray(item.checks) ? item.checks.slice(0, 6) : []) {
    if (!candidate || typeof candidate !== "object") continue;
    const row = candidate as Record<string, unknown>;
    const claim = text(row.claim, 300);
    const concern = text(row.concern, 400);
    // Both halves or neither: a doubt with no reason is just a shrug, and a
    // reason with nothing attached cannot be checked against the note.
    if (claim && concern) checks.push({ claim, concern });
  }
  return {
    title: text(item.title, 160) || "Untitled note",
    summary: text(item.summary, 500),
    blocks,
    takeaways: textList(item.takeaways, 8, 400),
    checks,
    suggestedSectionId: suggested,
    sectionConfidence: Math.min(1, Math.max(0, Number(item.sectionConfidence) || 0)),
  };
}

/**
 * The source notes are numbered "SOURCE NOTE 1: <title>" in the prompt so a
 * question can point at one. A model may copy that whole label back into
 * sourceNoteTitle, and a reader would then see "From SOURCE NOTE 2: Osmosis
 * and tonicity" under their answer. The label is ours, not the note's, so it
 * is stripped here rather than hoped away in the prompt.
 */
function sourceTitle(value: unknown): string {
  return text(value, 160).replace(/^\s*SOURCE\s+NOTE\s*\d*\s*[:.\-]\s*/i, "").trim();
}

export function normalizeStudyResult(
  kind: StudyKind,
  value: unknown,
  /** How many questions were asked for; a practice test is trimmed to it. */
  maxQuestions = 15,
): unknown {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (kind === "summary") {
    const topics = Array.isArray(item.keyTopics) ? item.keyTopics : [];
    return {
      overview: text(item.overview, 2400),
      keyTopics: topics.slice(0, 12).map((topic) => {
        const row = topic && typeof topic === "object" ? topic as Record<string, unknown> : {};
        return { title: text(row.title, 160), explanation: text(row.explanation, 1200) };
      }).filter((topic) => topic.title && topic.explanation),
      stillToConfirm: textList(item.stillToConfirm, 10, 500),
    };
  }
  if (kind === "flashcards") {
    const cards = Array.isArray(item.cards) ? item.cards : [];
    return { cards: cards.slice(0, 24).map((card) => {
      const row = card && typeof card === "object" ? card as Record<string, unknown> : {};
      return {
        front: text(row.front, 500),
        back: text(row.back, 900),
        sourceNoteTitle: sourceTitle(row.sourceNoteTitle),
        // Lower cased and deduplicated so a filter chip matches every card
        // that means the same thing, however the model capitalised it.
        tags: [...new Set(textList(row.tags, 6, 40).map((tag) => tag.toLowerCase()))],
      };
    }).filter((card) => card.front && card.back) };
  }
  const questions = Array.isArray(item.questions) ? item.questions : [];
  return {
    title: text(item.title, 160) || "Practice test",
    questions: questions.slice(0, Math.max(1, maxQuestions)).map((question) => {
      const row = question && typeof question === "object" ? question as Record<string, unknown> : {};
      const choices = textList(row.choices, 4, 400);
      const answerIndex = Math.trunc(Number(row.answerIndex));
      return {
        prompt: text(row.prompt, 900), choices,
        answerIndex: answerIndex >= 0 && answerIndex < choices.length ? answerIndex : 0,
        explanation: text(row.explanation, 900), sourceNoteTitle: sourceTitle(row.sourceNoteTitle),
      };
    }).filter((question) => question.prompt && question.choices.length === 4),
  };
}

/**
 * What a teaching readout is allowed to say back.
 *
 * `holding` comes first on purpose. A readout that opens on failures reads as
 * a report card for a class, which is the thing this product has refused to
 * build from the start; opening on what has landed makes the gaps read as work
 * to do rather than a verdict.
 */
export const teachingReadoutSchema = {
  type: "object",
  properties: {
    holding: { type: "array", items: { type: "string" } },
    revisit: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          reading: { type: "string" },
          tryThis: { type: "string" },
        },
        required: ["topic", "reading", "tryThis"],
        additionalProperties: false,
      },
    },
  },
  required: ["holding", "revisit"],
  additionalProperties: false,
} as const;

export type TeachingReadout = {
  holding: string[];
  revisit: { topic: string; reading: string; tryThis: string }[];
};

/**
 * Trims a readout to what the page will render. The model is asked for two to
 * four items and given the topic titles verbatim, but nothing downstream
 * depends on it having obeyed either instruction.
 */
export function normalizeTeachingReadout(value: unknown): TeachingReadout {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const revisit = Array.isArray(item.revisit) ? item.revisit : [];
  return {
    holding: textList(item.holding, 3, 200),
    revisit: revisit.slice(0, 4).map((entry) => {
      const row = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
      return {
        topic: text(row.topic, 160),
        reading: text(row.reading, 400),
        tryThis: text(row.tryThis, 400),
      };
    }).filter((entry) => entry.topic && entry.reading),
  };
}

import type { NoteBlock } from "@/lib/data/pot";
import { blocksToBodyText } from "@/lib/organizer/edit";
import {
  OrganizeError,
  type OrganizedResult,
  type OrganizerInput,
  type OrganizerProvider,
} from "@/lib/organizer/types";

// An honest, rule-based organizer. It restructures what the student wrote:
// it never invents content, never resolves contradictions, and keeps
// uncertainty visible (SPEC "AI Behavior"). The Claude provider can replace
// it behind the same interface without touching any UI.

const FILLER_OPENERS =
  /^(ok(ay)?\s+so\s+|so\s+|basically\s+|um\s+|note(s)?\s*(from|on|:)\s*|quick\s+|my\s+|todays?\s+|today's\s+)/i;

const UNCERTAINTY_MARKERS =
  /\b(not sure|need to (double[- ])?check|i think|maybe|might be|no idea|unsure|\?\?)\b/i;

const TAKEAWAY_MARKERS =
  /\b(remember|important|key|must|always|never|exam|test|focus|careful|crucial|main point)\b/i;

/** Used by tests and the e2e suite to exercise the failure path honestly. */
export const FORCE_FAILURE_TOKEN = "[[fail-organize]]";

function normalize(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function capitalize(sentence: string): string {
  if (!sentence) return sentence;
  return sentence[0].toUpperCase() + sentence.slice(1);
}

function ensurePeriod(sentence: string): string {
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function cleanSentence(sentence: string): string {
  const stripped = sentence.replace(FILLER_OPENERS, "").replace(/\s+/g, " ").trim();
  return ensurePeriod(capitalize(stripped || sentence.trim()));
}

const STOP_WORDS = new Set(
  "a an and are as at be but by for from has have i in is it its of on or so that the their there these they this to was we what which with you your".split(
    " ",
  ),
);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

/** "mitosis vs meiosis", "x vs. y" get recognized as natural titles. */
function findVersusPhrase(text: string): string | null {
  const stripped = text.replace(FILLER_OPENERS, "");
  const match = stripped.match(/([a-z0-9][\w-]*(?:\s[\w-]+){0,2})\s+vs\.?\s+([\w-]{2,30})/i);
  if (!match) return null;
  return `${capitalize(match[1].trim())} vs ${match[2].trim()}`;
}

export function deriveTitle(rawText: string): string {
  const text = normalize(rawText);
  const versus = findVersusPhrase(text);
  if (versus) return versus;

  const first = splitSentences(text)[0] ?? text;
  const cleaned = first
    .replace(FILLER_OPENERS, "")
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ");
  const clipped = words.slice(0, 8).join(" ");
  const title = capitalize(clipped);
  return words.length > 8 ? `${title}` : title;
}

/** Detects "Term: description" or "Term = description" definition shapes. */
function parseDefinition(sentence: string): { term: string; text: string } | null {
  const match = sentence.match(/^([\p{L}][\p{L}\p{N} ()-]{1,40}?)\s*(?:=|:)\s+(.{10,})$/u);
  if (!match) return null;
  const term = match[1].trim();
  if (tokens(term).length === 0 || term.split(" ").length > 4) return null;
  return { term: capitalize(term), text: cleanSentence(match[2]) };
}

/** A run of comma-separated "X: y" fragments becomes a bullet list. */
function parseFactRun(paragraph: string): string[] | null {
  const parts = paragraph
    .split(/,(?![^(]*\))\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const factLike = parts.filter(
    (p) =>
      /^[A-Za-z][\w\s()-]{1,40}\s+(is|are|has|have|makes?|holds?|does|do|produces?|stores?|contains?|controls?|digests?|builds?|packages?|ships?)\b/i.test(
        p,
      ) || /^[A-Za-z][\w\s()-]{1,30}:\s+/.test(p),
  );
  if (parts.length >= 4 && factLike.length >= Math.ceil(parts.length / 2)) {
    return parts.map((p) => ensurePeriod(capitalize(p.replace(/^[-*]\s*/, ""))));
  }
  return null;
}

const BULLET_LINE = /^([-*•]|\d+[.)])\s+/;

function explicitBullets(paragraph: string): string[] | null {
  const lines = paragraph
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const bulletLines = lines.filter((l) => BULLET_LINE.test(l));
  if (bulletLines.length >= 2) {
    return bulletLines.map((l) =>
      ensurePeriod(capitalize(l.replace(BULLET_LINE, ""))),
    );
  }
  return null;
}

/**
 * Splits a blank-line paragraph into consecutive runs of bullet lines and
 * non-bullet lines, so a lead-in line above a list is never dropped: it
 * flows through the sentence pipeline while the bullets become a list.
 */
function segmentByBulletRuns(paragraph: string): string[] {
  const lines = paragraph
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const runs: string[] = [];
  let current: string[] = [];
  let currentIsBullet: boolean | null = null;
  for (const line of lines) {
    const isBullet = BULLET_LINE.test(line);
    if (currentIsBullet !== null && isBullet !== currentIsBullet) {
      runs.push(current.join("\n"));
      current = [];
    }
    current.push(line);
    currentIsBullet = isBullet;
  }
  if (current.length > 0) runs.push(current.join("\n"));
  return runs;
}

export function suggestSection(
  rawText: string,
  sections: OrganizerInput["sections"],
): { id: string | null; confidence: number } {
  const textTokens = new Set(tokens(rawText));
  let best: { id: string | null; score: number } = { id: null, score: 0 };
  for (const section of sections) {
    let score = 0;
    for (const token of tokens(section.title)) {
      if (textTokens.has(token)) score += 1;
      // Light stemming so "division" matches "dividing", "divide".
      else {
        const stem = token.slice(0, Math.max(4, token.length - 3));
        for (const t of textTokens) {
          if (t.startsWith(stem)) {
            score += 0.5;
            break;
          }
        }
      }
    }
    if (score > best.score) best = { id: section.id, score };
  }
  return {
    id: best.score > 0 ? best.id : null,
    confidence: Math.min(1, best.score / 2),
  };
}

export const deterministicOrganizer: OrganizerProvider = {
  name: "deterministic",

  async organize(input: OrganizerInput): Promise<OrganizedResult> {
    const text = normalize(input.rawText);
    if (text.includes(FORCE_FAILURE_TOKEN)) {
      throw new OrganizeError("Forced failure for testing", "provider_failed");
    }
    if (text.length === 0) {
      throw new OrganizeError("Nothing to organize", "empty");
    }
    // Token count alone would reject unspaced scripts (Chinese, Japanese...)
    // as one giant "word", so genuinely long text always passes.
    if (tokens(text).length < 5 && text.replace(/\s+/g, "").length < 30) {
      throw new OrganizeError("Too short to organize", "too_short");
    }

    const paragraphs = text
      .split(/\n{2,}/)
      .flatMap(segmentByBulletRuns)
      .flatMap((p) => (explicitBullets(p) ? [p] : p.split(/\n/)))
      .map((p) => p.trim())
      .filter(Boolean);

    const blocks: NoteBlock[] = [];
    const uncertain: string[] = [];
    let definitionUsed = false;

    for (const paragraph of paragraphs) {
      const bullets = explicitBullets(paragraph) ?? parseFactRun(paragraph);
      if (bullets) {
        blocks.push({ type: "bullets", items: bullets });
        continue;
      }

      const sentences = splitSentences(paragraph);
      const kept: string[] = [];
      for (const sentence of sentences) {
        if (UNCERTAINTY_MARKERS.test(sentence)) {
          uncertain.push(cleanSentence(sentence));
          continue;
        }
        if (!definitionUsed) {
          const definition = parseDefinition(sentence);
          if (definition) {
            if (kept.length > 0) {
              blocks.push({ type: "paragraph", text: kept.splice(0).join(" ") });
            }
            blocks.push({ type: "definition", ...definition });
            definitionUsed = true;
            continue;
          }
        }
        kept.push(cleanSentence(sentence));
      }
      if (kept.length > 0) {
        blocks.push({ type: "paragraph", text: kept.join(" ") });
      }
    }

    // Caveats stay visible instead of being silently resolved.
    if (uncertain.length > 0) {
      blocks.push({
        type: "paragraph",
        text: `Still to confirm: ${uncertain.join(" ")}`,
      });
    }

    if (blocks.length === 0) {
      throw new OrganizeError("Nothing to organize", "too_short");
    }

    const allSentences = splitSentences(text).map(cleanSentence);
    // Prefer certain sentences, but an all-uncertain note still gets a
    // summary rather than a blank line in the feed.
    const certainSentences = allSentences.filter((s) => !UNCERTAINTY_MARKERS.test(s));
    const summarySource = (certainSentences.length > 0 ? certainSentences : allSentences)
      .slice(0, 2)
      .join(" ");
    const summary =
      summarySource.length > 220
        ? `${summarySource.slice(0, 217).replace(/\s+\S*$/, "")}...`
        : summarySource;

    const takeaways = allSentences
      .filter((s) => TAKEAWAY_MARKERS.test(s) && !UNCERTAINTY_MARKERS.test(s))
      .slice(0, 3);

    const bodyText = blocksToBodyText(blocks);

    const section = suggestSection(text, input.sections);

    return {
      title: deriveTitle(text),
      summary,
      blocks,
      bodyText,
      takeaways,
      suggestedSectionId: section.id,
      sectionConfidence: section.confidence,
    };
  },
};

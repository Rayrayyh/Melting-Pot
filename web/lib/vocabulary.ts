import type { NoteBlock } from "@/lib/data/pot";

/**
 * Vocabulary for a note comes out of the note itself: the terms its author
 * defined, shouted, or wrote as a proper phrase. Nothing here asks a model, so
 * the same note always highlights the same words and the highlighting can be
 * built on the server or in the browser without a round trip.
 */

export type HighlightRun = { text: string; term: boolean };

const MAX_TERMS = 120;
const MAX_PATTERN_TERMS = 200;
const MAX_PHRASE_WORDS = 5;
const MIN_TERM_LENGTH = 2;
const MAX_TERM_LENGTH = 80;

/**
 * Words that only look like terms because a sentence opened with them, or
 * because they glue a phrase together. A phrase made of nothing else is not
 * vocabulary.
 */
const WEAK_WORDS = new Set(
  ("a an and are as at be because before but by during each every for from has have how if in into is it its "
    + "of on or so some such that the their then there these they this to was we what when where which while "
    + "who why with you your").split(" "),
);

/** Emphasis that survives an unformatted note: asterisks, underscores, quotes. */
const WRAPPED_EMPHASIS: RegExp[] = [
  /\*([^*\n]{2,60})\*/gu,
  /_([^_\n]{2,60})_/gu,
  /"([^"\n]{2,60})"/gu,
  /“([^”\n]{2,60})”/gu,
];

/** Acronyms and shouted terms: ATP, DNA, RNA POLYMERASE. */
const SHOUTED =
  /(?<![\p{L}\p{N}])\p{Lu}[\p{Lu}\p{N}]+(?:[ -]\p{Lu}[\p{Lu}\p{N}]+){0,3}(?![\p{L}\p{N}])/gu;

const SENTENCE_BREAK = /(?<=[.!?])\s+|\n+/;

/** A comma or a colon ends a phrase, so "Golgi, Lysosome" stays two terms. */
const PHRASE_BREAK_AFTER = /[,;:)\]]$/;

function tidy(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/[^\p{L}\p{N}+#]+$/u, "");
}

function isUsableTerm(term: string): boolean {
  if (term.length < MIN_TERM_LENGTH || term.length > MAX_TERM_LENGTH) return false;
  if (!/\p{L}/u.test(term)) return false;
  return term.split(" ").some((word) => !WEAK_WORDS.has(word.toLowerCase()));
}

function isCapitalised(word: string): boolean {
  return /^\p{Lu}/u.test(word);
}

function collectEmphasis(text: string, add: (term: string) => void): void {
  for (const pattern of WRAPPED_EMPHASIS) {
    for (const match of text.matchAll(pattern)) add(match[1]);
  }
  for (const match of text.matchAll(SHOUTED)) add(match[0]);
}

/**
 * Runs of two or more capitalised words. A run that opens a sentence loses its
 * first word only when that word is weak, so "The Krebs Cycle" yields "Krebs
 * Cycle" while "Krebs Cycle happens" keeps both words.
 */
function collectCapitalisedPhrases(text: string, add: (term: string) => void): void {
  for (const sentence of text.split(SENTENCE_BREAK)) {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    let run: string[] = [];
    let runStart = -1;

    const flush = () => {
      if (run.length >= 2) {
        const openedSentence = runStart === 0;
        const phrase =
          openedSentence && WEAK_WORDS.has(run[0].toLowerCase()) ? run.slice(1) : run;
        if (phrase.length >= 2 && phrase.length <= MAX_PHRASE_WORDS) add(phrase.join(" "));
      }
      run = [];
      runStart = -1;
    };

    for (let i = 0; i < words.length; i += 1) {
      const word = words[i];
      const stripped = tidy(word);
      if (!stripped || !isCapitalised(stripped)) {
        flush();
        continue;
      }
      if (run.length === 0) runStart = i;
      run.push(stripped);
      if (PHRASE_BREAK_AFTER.test(word)) flush();
    }
    flush();
  }
}

/**
 * Key terms for one note, deduplicated case insensitively and longest first so
 * a phrase is always offered to the matcher ahead of its own substrings.
 */
export function collectVocabulary(blocks: NoteBlock[]): string[] {
  const found = new Map<string, string>();

  const add = (candidate: string) => {
    const term = tidy(candidate);
    if (!isUsableTerm(term)) return;
    const key = term.toLowerCase();
    if (!found.has(key)) found.set(key, term);
  };

  for (const block of blocks) {
    if (block.type === "definition") {
      add(block.term);
      collectEmphasis(block.text, add);
      collectCapitalisedPhrases(block.text, add);
      continue;
    }
    if (block.type === "bullets") {
      for (const item of block.items) {
        collectEmphasis(item, add);
        collectCapitalisedPhrases(item, add);
      }
      continue;
    }
    collectEmphasis(block.text, add);
    // Headings are skipped for phrases: title case there is formatting, and
    // reading it as vocabulary turns a note's own section labels into terms.
    if (block.type !== "heading") collectCapitalisedPhrases(block.text, add);
  }

  return [...found.values()].sort(longestFirst).slice(0, MAX_TERMS);
}

function longestFirst(a: string, b: string): number {
  if (a.length !== b.length) return b.length - a.length;
  return a < b ? -1 : a > b ? 1 : 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * One alternation for every term, longest first so the regex engine prefers
 * the longer phrase wherever two terms start together. The lookarounds do the
 * work of \b without breaking on terms that end in punctuation, such as "C++".
 */
function buildPattern(terms: string[]): RegExp | null {
  const seen = new Set<string>();
  const usable: string[] = [];
  for (const term of terms) {
    const trimmed = term.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    usable.push(trimmed);
    if (usable.length >= MAX_PATTERN_TERMS) break;
  }
  if (usable.length === 0) return null;

  const alternation = usable
    .sort(longestFirst)
    // A term written on one line still matches where the note wrapped it.
    .map((term) => escapeRegExp(term).replace(/\s+/g, "\\s+"))
    .join("|");
  return new RegExp(
    `(?<![\\p{L}\\p{N}_])(?:${alternation})(?![\\p{L}\\p{N}_])`,
    "giu",
  );
}

/**
 * Splits text into runs, marking the ones that are vocabulary. Matching is
 * whole word and case insensitive, and a single left-to-right scan means a
 * term can never be found inside another term's match.
 */
export function highlightTerms(text: string, terms: string[]): HighlightRun[] {
  if (!text) return [];
  const pattern = buildPattern(terms);
  if (!pattern) return [{ text, term: false }];

  const runs: HighlightRun[] = [];
  let cursor = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match[0].length === 0) {
      pattern.lastIndex += 1;
      continue;
    }
    if (match.index > cursor) runs.push({ text: text.slice(cursor, match.index), term: false });
    runs.push({ text: match[0], term: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) runs.push({ text: text.slice(cursor), term: false });
  return runs;
}

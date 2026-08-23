/**
 * What a person can decide about a practice test before it is written: how
 * long it is, how hard it should push, and what it should concentrate on. The
 * emphasis is the student's own words, so it is carried as subject matter and
 * never as an instruction to the model.
 */

export type PracticeDifficulty = "gentle" | "standard" | "demanding";

export type PracticeOptions = {
  questionCount: number;
  difficulty: PracticeDifficulty;
  /** Free text naming what to concentrate on. Empty means no preference. */
  emphasis: string;
  /** Sections to draw from. Empty means the whole Pot. */
  sectionIds: string[];
};

export const QUESTION_COUNTS = [5, 10, 15, 20] as const;
export const MIN_QUESTIONS = 5;
export const MAX_QUESTIONS = 20;
export const MAX_EMPHASIS = 200;

export const DIFFICULTIES: ReadonlyArray<{
  key: PracticeDifficulty;
  label: string;
  hint: string;
}> = [
  { key: "gentle", label: "Gentle", hint: "Recall and definitions, one idea per question." },
  { key: "standard", label: "Standard", hint: "A mix of recall and applying what the notes say." },
  { key: "demanding", label: "Demanding", hint: "Multi-step reasoning and close distractors." },
];

export const MAX_SECTIONS = 20;

export const DEFAULT_PRACTICE_OPTIONS: PracticeOptions = {
  questionCount: 10,
  difficulty: "standard",
  emphasis: "",
  sectionIds: [],
};

function isDifficulty(value: unknown): value is PracticeDifficulty {
  return value === "gentle" || value === "standard" || value === "demanding";
}

/** Whatever arrives over the wire, reduced to something the model can be asked. */
export function normalizePracticeOptions(value: unknown): PracticeOptions {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const requested = Math.trunc(Number(raw.questionCount));
  return {
    questionCount: Number.isFinite(requested)
      ? Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, requested))
      : DEFAULT_PRACTICE_OPTIONS.questionCount,
    difficulty: isDifficulty(raw.difficulty) ? raw.difficulty : DEFAULT_PRACTICE_OPTIONS.difficulty,
    emphasis:
      typeof raw.emphasis === "string"
        ? raw.emphasis.replace(/\s+/g, " ").trim().slice(0, MAX_EMPHASIS)
        : "",
    // Sorted and deduplicated so the same choice always names the same set,
    // whatever order the boxes were ticked in.
    sectionIds: Array.isArray(raw.sectionIds)
      ? [
          ...new Set(
            raw.sectionIds.filter((id): id is string => typeof id === "string" && id.length > 0),
          ),
        ]
          .sort()
          .slice(0, MAX_SECTIONS)
      : [],
  };
}

/**
 * A stable name for one configuration. It joins the fingerprint of the notes,
 * so a ten question test and a twenty question test are two stored sets rather
 * than one overwriting the other.
 */
export function practiceOptionsKey(options: PracticeOptions): string {
  const emphasis = options.emphasis.toLowerCase();
  const sections = options.sectionIds.join(",");
  return `q${options.questionCount}:${options.difficulty}:${emphasis}:${sections}`;
}

/** How the chosen difficulty is described to the model. */
export function difficultyBrief(difficulty: PracticeDifficulty): string {
  if (difficulty === "gentle") {
    return "Keep the questions straightforward: recall and definitions, one idea per question, with clearly wrong distractors.";
  }
  if (difficulty === "demanding") {
    return "Make the questions hard: multi-step reasoning, questions that combine two notes, and distractors that are plausible to someone who half remembers the material.";
  }
  return "Mix straight recall with questions that apply what the notes say to a new case.";
}

/** The chosen configuration, in a sentence, for the line above a built test. */
export function describeOptions(
  options: PracticeOptions,
  sectionTitles: Map<string, string> = new Map(),
  kind: "practice" | "summary" | "flashcards" = "practice",
): string {
  const difficulty = DIFFICULTIES.find((entry) => entry.key === options.difficulty);
  const sections = options.sectionIds
    .map((id) => sectionTitles.get(id))
    .filter((title): title is string => Boolean(title));
  // Only a test has a length and a difficulty to report; saying "10
  // questions, standard" above a study guide or a deck would be untrue.
  return (
    kind !== "practice"
      ? [
          sections.length > 0 ? `From ${sections.join(", ")}` : "From the whole Pot",
          options.emphasis ? `focused on ${options.emphasis}` : null,
        ]
      : [
          `${options.questionCount} questions`,
          difficulty ? difficulty.label.toLowerCase() : options.difficulty,
          sections.length > 0 ? `from ${sections.join(", ")}` : null,
          options.emphasis ? `focused on ${options.emphasis}` : null,
        ]
  )
    .filter(Boolean)
    .join(", ");
}

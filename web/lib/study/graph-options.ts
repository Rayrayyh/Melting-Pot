/**
 * What a reader can decide about a drawn graph: how carefully it is drawn.
 *
 * Two tiers, named for what they cost the reader rather than for anything
 * about the machinery: a quick drawing lands in seconds, a careful one may
 * not land at all inside the server's limit. Kept out of PracticeOptions so
 * no set stored before graphs existed changes its fingerprint.
 */

export type GraphTier = "fast" | "careful";

export const GRAPH_TIERS: ReadonlyArray<{ key: GraphTier; label: string; hint: string }> = [
  {
    key: "fast",
    label: "Drawn quickly",
    hint: "A sketch of the Pot in a few seconds.",
  },
  {
    key: "careful",
    label: "Drawn carefully",
    hint: "A slower, denser map. May not finish inside the server's limit.",
  },
];

export function normalizeTier(value: unknown): GraphTier {
  return value === "careful" ? "careful" : "fast";
}

/** The variant the fingerprint folds in, so the two tiers store separately. */
export function graphOptionsKey(tier: GraphTier): string {
  return `graph:${tier}`;
}

/** How the chosen tier is described to the model. */
export function tierBrief(tier: GraphTier): string {
  if (tier === "careful") {
    return "Take the space you need: use most of the note set, connect related ideas across notes, and label each edge with the relationship it names.";
  }
  return "Keep it to the clearest eight or so ideas and the fewest edges that still make the structure obvious.";
}

import { createHash } from "node:crypto";

/**
 * Identifies the exact set of notes a study set was built from.
 *
 * This is what makes caching generated material safe. A stored set is reused
 * only while the Pot's notes are unchanged; the moment anyone shares a note,
 * accepts a correction (which creates a new version), or a maintainer removes
 * one, the fingerprint changes and the next request regenerates. Nothing is
 * ever served from a Pot that has moved on.
 */
export function studyFingerprint(
  notes: Array<{ id: string; currentVersionId: string | null }>,
  /**
   * Anything that changes what was asked for rather than what it was built
   * from, such as the length and difficulty of a practice test. Two different
   * requests over the same notes are two stored sets, not one overwriting the
   * other.
   */
  variant = "",
): string {
  const canonical = notes
    .map((note) => `${note.id}:${note.currentVersionId ?? "none"}`)
    .sort()
    .join("|");
  const material = variant ? `${canonical}#${variant}` : canonical;
  return createHash("sha256").update(material).digest("hex").slice(0, 64);
}

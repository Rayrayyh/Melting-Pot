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
): string {
  const canonical = notes
    .map((note) => `${note.id}:${note.currentVersionId ?? "none"}`)
    .sort()
    .join("|");
  return createHash("sha256").update(canonical).digest("hex").slice(0, 64);
}

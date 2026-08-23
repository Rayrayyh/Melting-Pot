import type { FeedNote } from "@/lib/data/pot";

export type ContributorActivity = {
  name: string;
  noteCount: number;
  lastSharedAt: string;
};

/**
 * Who has actually put something into the Pot, most recent first. Derived
 * from the feed the page already loaded rather than a second query, so it
 * stays exactly in step with the notes shown below it.
 */
export function contributorActivity(notes: FeedNote[]): ContributorActivity[] {
  const byName = new Map<string, ContributorActivity>();
  for (const note of notes) {
    const existing = byName.get(note.contributorName);
    if (existing) {
      existing.noteCount += 1;
      if (note.sharedAt > existing.lastSharedAt) existing.lastSharedAt = note.sharedAt;
      continue;
    }
    byName.set(note.contributorName, {
      name: note.contributorName,
      noteCount: 1,
      lastSharedAt: note.sharedAt,
    });
  }
  return [...byName.values()].sort((a, b) =>
    a.lastSharedAt === b.lastSharedAt
      ? a.name.localeCompare(b.name)
      : a.lastSharedAt < b.lastSharedAt
        ? 1
        : -1,
  );
}

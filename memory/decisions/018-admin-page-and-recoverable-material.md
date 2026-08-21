# The maintainer's page is the Pot's record, not just its queue

`/p/[potId]/admin`, four tabs: Review, Contributions, History, Removed.
`/p/[potId]/review` redirects to it; `/review/[proposalId]` is unchanged.

## Why it moved

The tab was called Review and held exactly one thing: open corrections. Every
other question a maintainer has about their own Pot had no page at all. What has
the class written? Open notes one at a time. What changed, and who changed it?
Open each note's history separately. What did I take out last week? Nowhere, and
for study sets, nowhere ever, because removal destroyed them.

The decision surface stayed at `/review/[proposalId]`. Links a maintainer has
already sent still open the correction they were sent for, and the redirect
means an old bookmark lands somewhere sensible rather than on a 404.

## What each tab can actually show

Contributions is **shared contributions plus the reader's own drafts**, and that
is a limit, not an oversight. `contributions_select` lets a member read their own
work and everybody's shared work, and a maintainer is a member. Widening it so
maintainers could read unshared drafts would break the rule the whole product is
built on: nothing leaves your hands until you say so. The copy on the Everyone
tab says this out loud rather than leaving a half-empty list to be puzzled over.

History is every `note_versions` row in the Pot. The join to `shared_notes` is
**inner** on purpose: PostgREST applies a filter on an embedded table to the
embed, not to the parent, so without `!inner` the limit counts versions from
every Pot in the database and this list can come back empty. The first version
of this query had that bug.

## Removal is now reversible everywhere

Notes already were, since 0022. Study sets and cards were not: `delete_study_set`
ran a DELETE and `note_flashcards` carried delete policies. Both soft-remove now
and both are on the Removed tab with a way back. The two delete policies were
dropped rather than left beside the new path, because two ways to remove one
card, one of them unrecoverable, means the unrecoverable one wins every race.

`save_study_set` clears `removed_at` on conflict. The unique key is the
fingerprint, so a removed set is the row a rebuild lands on, and leaving it
removed would put the rebuild somewhere nobody can see.

## What a Pot can be told

`join_open` closes the door without changing the code. Regenerating already
existed and does something different: it invalidates every invite already handed
out. A class that has finished enrolling wants the door shut, not the locks
changed. Someone already inside is never refused, so a member re-entering their
own code is not locked out by a setting meant for strangers.

`study_generation` limits building new material to maintainers, for a Pot on a
shared quota. Reading what already exists is never restricted, which is the
whole point of storing sets in the first place.

Both are enforced in Postgres, in `join_pot_with_code` and in the study route.
The settings form writes them; it does not police them.

## The second factor

Gated on `ownsAnyPot`, which asked the wrong question. A maintainer accepts
corrections, removes notes and promotes members, so their account is worth as
much to an attacker as the owner's. `runsAnyPot` covers both.

## A test that was passing for the wrong reason

`dashboard.spec.ts` asserted a member sees no nav link named exactly "Admin".
The link carries a waiting count, so its accessible name is "Admin 1" and the
exact match could never have failed, present or absent. The count is now
`aria-hidden` with a real sentence beside it, and both specs match loosely.

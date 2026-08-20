# Generated study material is stored per Pot; removal is not deletion

Two decisions taken together on 2026-08-20, both about what a Pot keeps.

## Generated sets are stored, keyed by what they were built from

The owner asked for caching of flashcards and everywhere in the app, and in the
same breath for no caching of generated content. Both are right, and they are
about different things.

Generation is slow and metered. A class of thirty should not each spend a
generation to read the same deck. So a generated set is written to
`study_sets` with a fingerprint of the notes that went into it: every note id
paired with its current version id, sorted and hashed. A request that matches
an existing fingerprint is served from the store.

That fingerprint is the whole safety argument. Share a note, accept a
correction (which writes a new version), or have a maintainer remove one, and
the fingerprint changes, no stored set matches, and the next request
regenerates. Nothing is ever served from a Pot that has moved on. For a
practice test the fingerprint also carries what was asked for, so a ten
question warm up and a twenty question rehearsal are two stored sets rather
than one overwriting the other.

The routes themselves send `no-store`. Nothing generated goes into an HTTP
cache, a CDN, or a browser: the database is the only cache, and it is one a
maintainer can look at and delete.

Opening a study page peeks at the store rather than generating. That is why
arriving costs nothing and why a missing Gemini key still shows a class the
deck it already has.

## Removal hides a note; it never deletes one

The owner asked for maintainers to be able to delete notes. The product
promises that an original is never deleted or overwritten. Both hold if
removal is a state rather than a delete.

`set_shared_note_removed` stamps `removed_at`, `removed_by`, and a required
reason. The note leaves the feed, search, the dashboard counts, and the
material any study set is built from. Its own page stays reachable and says
who removed it and why. Every version, every correction, and everyone
credited is untouched, and Pot settings lists what is out with a way back.

The same rule shapes the rest of it. A maintainer can delete a generated set,
because a set is derived and anyone can build another. A maintainer or the
person who wrote a card can delete that card. Nobody can delete a
contribution, a version, or the attribution on one. Deleting or archiving the
Pot stays with the owner.

## What this rules out

- Serving a stored set after the notes changed. The fingerprint makes it
  impossible rather than unlikely.
- A generated set living anywhere a maintainer cannot reach, which is what an
  HTTP cache would have been.
- A maintainer being able to make a contribution disappear from the record.

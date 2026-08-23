# Re-emitting a function body discards everything you did not look at

plpgsql cannot amend one statement, so changing a function means writing the
whole body again. Every guard the previous version added has to be carried
across by hand, and anything not carried is deleted without a word. Postgres
accepts the new body happily; nothing warns that it is shorter than the last.

0031 added an answer-key parameter to `save_study_set` and, in re-typing the
body, dropped two things 0030 had put there:

- the per-kind payload shape checks (a deck has `cards`, a test has
  `questions`, a summary has `overview`), and
- the block stopping a member from reviving a study set a maintainer had
  removed.

The second is the instructive one. 0030's comment described that exact
behaviour as the bug it existed to fix, and 0031 reintroduced it while
carrying a comment of its own reasoning cheerfully about why clearing
`removed_at` on collision was correct. Maintainer moderation of study
material became undoable by the people it moderates, and the migration that
did it read as though it had thought about the problem.

The habit that catches it: when replacing a function, diff the two bodies
rather than the two migrations. `pg_get_functiondef` on the live function
before applying, against the new text, shows every line about to disappear.
A migration diff shows only what you typed, which is exactly the thing you
already believe is right.

Related: 0030d, where changing an argument list created an overload instead of
a replacement, and the old body stayed live on the path callers took. Same
family of mistake, opposite direction: there the old body survived when it
should have gone, here it vanished when it should have stayed.

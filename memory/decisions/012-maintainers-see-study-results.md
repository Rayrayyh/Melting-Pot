# Maintainers see study results, by owner decision

The owner directed on 2026-08-22 that Pot owners and maintainers can view each
member's practice-test scores and flashcard practice, using the existing
maintainer check rather than a separate verified-educator role. A larger
teacher-analytics spec the owner received advises against exposing progress on
the maintainer check alone; the owner's call supersedes it for this product,
and this note records that the divergence was chosen, not overlooked.

What was kept from that spec because it costs nothing and matches this
product's own rules: no ranking, no leaderboard, no single overall score per
student, first passes only (retries recorded separately as recovery), "too few
to read into" below two first passes, and alphabetical ordering on the
maintainer page. Students are told plainly, on the study pages themselves,
that maintainers can see practice results.

The boundary that makes the numbers worth showing at all: practice-test
answers moved server-side (0031), marking happens in `submit_practice_test`,
and attempts are append-only rows the browser cannot write. Sets from before
the boundary carry their answers in the payload, stay client-marked, are
labelled practice, and are never recorded.

Not built, deliberately: learning objectives, teacher-approved assessments, a
separate educator capability, instructional action loops, exports. Those wait
on an educator-verification reality this product does not have.

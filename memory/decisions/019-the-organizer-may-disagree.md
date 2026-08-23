# The organizer may disagree with the note, but never edit it

Reported as: "the AI will assume whatever information is given is true. It
doesn't change, question, or correct anything."

That was accurate, and it was the instruction's doing. The prompt said
"organize student notes without adding outside facts" and "preserve
uncertainty", which together describe a transcriber: keep what is there, tidy
the shape, add nothing. There was also nowhere to put a doubt. The organized
note carried a title, a summary, blocks, takeaways and a section guess, and not
one field meant "this looks wrong".

So a student who wrote that mitosis makes four cells got a clean, well-headed,
confident-looking note saying mitosis makes four cells, and the class revised
from it.

## What changed

`checks` on the organized note: a short list of `{ claim, concern }`, the claim
quoted from the writing and the concern saying why it is doubtful. The prompt
now says the organizer is not a transcriber, that a claim which looks wrong,
out of date, or far more confident than the note supports belongs in checks,
and to say what is actually the case where it is confident of it.

## The line it must not cross

**Checks never touch the body.** The prompt forbids rewriting a claim to what
the model thinks it should say, and forbids deleting one. The blocks stay the
student's words; the doubts sit beside them.

That line is not fussiness. Every other change in this app goes through a
person: a contribution is not shared until its author says so, a correction is
not published until a maintainer accepts it. An organizer that quietly fixed
facts would be the one thing in the product that edits somebody's work without
asking, and it would do it invisibly, because the reader would see only the
tidy version.

Nothing is blocked either. The panel appears at review, the writer can share
anyway, and the correction loop is there for whoever reads it next.

## Empty means nothing was raised

The deterministic organizer always returns an empty list. It rearranges
sentences and knows nothing about the world, so an empty `checks` is "nothing
was raised", never "this has been checked and is correct". The type comment
says so, because the difference matters the moment anyone builds a badge on it.

The normalizer drops a check missing either half. A doubt with no reason is a
shrug, and a reason with no claim cannot be found in the note. Six is the cap:
padding the list with vague hedges is how the real ones get missed, and the
prompt says that too.

## Not done

Carrying checks onto the shared note, so readers see them and not just the
writer. It needs a column on `note_versions` and a decision about whose voice
those doubts speak in once a person has read them and shared anyway. Worth
doing; deliberately not smuggled in here.

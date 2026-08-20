# A correction is organized before it is sent, not when it is accepted

Whole-note corrections run through the organizer on the proposer's Continue,
and the organized note travels with the proposal. Sentence corrections are
never organized, and are collapsed to one line instead.

## What was wrong

The first version of whole-note corrections called `/api/ai/organize` from the
maintainer's accept handler. Three things followed from that, and all three
were bad:

- The proposer never saw what their words would become. They wrote, they sent,
  and the structure appeared later without them.
- The maintainer reviewed raw typing and approved it, but what got published
  was a generation that ran after the click. Nobody had read the thing that
  became the note. That is not review.
- A failure at accept time had nowhere to go. The decision had been made and
  the organizer was the only thing left standing between it and the note.

Sentence corrections had a quieter problem. They were spliced into a block
verbatim, and `body_text` joins blocks with newlines (see
`007-body-text-joins-blocks.md`). A line break pasted into a sentence
replacement therefore invented a block boundary that no block had: the note
rendered one paragraph as two, and every sentence offset after it was wrong.

## What happens now

`revision_proposals.proposed_organized` (migration 0024) holds the organized
note for a whole-note correction: title, summary, blocks, takeaways. The
proposer's Continue fills it and shows them the result before the send button
exists. The maintainer's review page renders that same note under "What gets
published". Accepting writes it through unchanged.

Sentence corrections pass through `asSingleLine`, which collapses whitespace.
They store null, because there is nothing to restructure: one sentence goes
into one block and the note's shape is untouched.

Revising re-organizes. `resubmit_proposal` gained a `p_proposed_organized`
parameter (migration 0025) and the six-argument signature was dropped rather
than kept alongside. Leaving both would have let a stale caller rewrite
`proposed_text` while the stored organized note kept describing the words the
proposer had already replaced, and the maintainer would then have published
text nobody wrote.

## What this costs

One organizer call per whole-note correction, and another per revision, both
counted against `consume_ai_generation`. That is the price of a person seeing
their own work before they send it. Sentence corrections, which are the common
case, still cost nothing.

## What was left alone

Proposals written before 0024 carry no organized note, so accepting one still
organizes on the maintainer's click, exactly as before. The fallback stays for
as long as those rows do.

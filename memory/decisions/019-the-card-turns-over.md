# A flashcard is one card with two faces, not two cards crossfading

The card turns on its horizontal axis, in perspective, the way a physical card
does when you flip it towards yourself.

## What was wrong

The old "flip" was `AnimatePresence mode="wait"` swapping two separate elements,
each fading through `rotateX: 8deg` over 180ms. Eight degrees is not a flip; it
is a tilt. And `mode="wait"` runs the exit to completion before the enter
starts, so the two halves never met and the card blinked out and back rather
than turning.

## What it does now

One button, `transform-style: preserve-3d`, animated `rotateX` from 0 to 180.
Two faces stacked absolutely inside it, each `backface-visibility: hidden`, the
back one pre-rotated 180 degrees so it reads the right way up once the card has
gone half way round. The perspective sits on the frame around the card rather
than on the card, which is what makes the far edge actually recede instead of
the whole thing flattening into a wipe. 440ms, which is what the reference
measures at.

Keying the button on the card index means moving to the next card remounts it
face up rather than animating the old card back over, which would read as a
second flip nobody asked for. The new card slides in from the right, as the
reference does.

## The cost, accepted

Both faces are in the DOM at all times. That is inherent to the technique and
the reference does the same, but it means the answer is present before the card
is turned: find-in-page will hit it, and select-all will copy it. The face that
is turned away carries `aria-hidden`, so a screen reader is not read both sides
at once, and `data-face` makes which side is live assertable from a test. The
end-to-end suite used to assert the answer was absent from the DOM; it now
asserts on which face is in the accessibility tree, which is the thing that
actually describes what a reader can reach.

# The loading mark is the pot, stirring

`components/brand/stir.tsx`. A paddle of liquid goes round inside the pot at
the same low angle the hero is drawn at. It replaces the generic notch that
spun in the stage checklist and the bare word that sat in every busy button.

## The angle is the point

The paddle travels a circle in three dimensions. The ellipse it appears to
follow is that circle projected, and two things fall out of the projection
rather than being animated on top of it:

- It moves fastest across the front and slowest across the back. The keyframes
  step the angle evenly and let the projection produce the varying screen
  speed. **Do not add easing.** Easing fights the projection and the result
  reads as a wobble.
- It is smaller at the back. One scale channel, in the same keyframes.

Nothing animates the depth ordering. The body is painted before the paddle and
the front lip after it, so the paddle is sandwiched and simply disappears
across the front. This is the same trick the hero uses to clip the ribbon into
the pot, and it costs nothing at runtime.

The rim is flatter than a spinner would want, `ry/rx` of 0.19 against a rounder
0.35 that would give more travel. The hero's own rim is 0.08. Matching the
brand's angle mattered more than the extra few pixels of motion, and 0.19 is
the compromise: near the hero, still legible at 24px.

## Why the trail is six copies rather than a drawn tail

A drawn comma would have to rotate to stay tangent to an ellipse, which is a
second animated channel and a worse result at small sizes. Six paddles on one
animation with negative delays give the same read for one channel.

## What it does at each size

- **64 and up**: the whole pot, handles and the m knocked out.
- **34 to 63**: the pot without the m. Below about 64 the m's counters fill in
  and it turns into a blob.
- **Under 34**: no vessel at all, and the paddle drawn fat. At 16px a rim
  stroke and a paddle are both about a pixel and they smear into one grey
  ellipse. What survives is something going round on an ellipse rather than a
  circle, and that still reads.

## Reduced motion

The file's global reduced-motion rule flattens every animation to nothing,
which would leave six paddles stacked on one spot. So the moving group is
removed outright and a still liquid surface takes its place. Nothing travels
and nothing pulses. The word beside the mark carries the meaning, which is why
every call site keeps its label.

## Not built

A determinate variant. None of the four callers has a fraction to report:
organizing has stage states, generating has nothing. Building the prop before
something needs it would have been guessing at its shape.

## The keyframes are generated

36 stops, from the ellipse and the scale ramp. Regenerate rather than
hand-editing; the block in `globals.css` says so too.

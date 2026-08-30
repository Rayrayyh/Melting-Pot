# 025 The landing scrolls natively; the Lenis wheel hijack is gone

Owner testing found scrolling jittery on the deployed landing (2026-08-29); tracing localized it and the fix was removal, not tuning.

## What was found

The jitter was not main-thread jank: a production trace during a scripted
scroll showed the main thread under 12 percent busy with zero long tasks.
Two structural facts remained. First, Lenis re-animates every wheel input on
the main thread, so any raster or main-thread contention stutters the scroll
position itself, and the hijacked feel varies by device. Second, the melt
pin's position fixed flip forced multi-frame full-document re-rasters at
both pin boundaries (seven consecutive full-page paints traced at the unpin
scroll position), which a main-thread scroller turns into a visible hitch.

## The decision

Remove the wheel hijack entirely rather than tune it. Native scrolling stays
on the compositor thread, so a raster hiccup no longer stalls the scroll.
The melt keeps its own smoothing (scrub 0.3) and pins correctly under native
scroll; anchor links glide via html scroll-behavior smooth, gated behind
prefers-reduced-motion no-preference; the reveal animations are unchanged.
smooth-scroll.tsx is deleted, the landing spec now asserts the lenis class
is absent so a scroll takeover cannot return silently, and the lenis package
stays in package.json unimported (removing it is lockfile churn for another
day).

A layer-promotion attempt on the pinned section (will-change transform) was
tried first and measured worse, so it was reverted; the paint counts in the
trace record are in the session history, not here.

## Round two, same day: the raster load itself

Removing Lenis fixed the scroll architecture but the owner still saw jitter
in the hero and the melt. Filming a uniform 14px-per-frame programmatic
scroll and measuring per-frame displacement in the video showed the truth:
155 rendering stalls of three or more frames across the page, the worst 31
seconds long under software raster, all concentrated from the hero through
the melt. Two causes, two fixes. The hero shadow was five stacked
drop-shadow passes, each a full gaussian blur of the card at raster time;
it is now two (contact plus one soft falloff). The melt's ScrollTrigger pin
flipped the section between in-flow and position fixed, forcing whole
document re-rasters at both boundaries; the section now owns its scroll
span in layout (height 100dvh plus the 1700px scrub range, md and
motion-safe only) with the inner viewport position sticky, and the timeline
keeps scrub 0.3 with no pin. Same instrument after: 13 stalls, worst 1.3
seconds, median step at full rate. The remaining flat stretch in the
measurement is the sticky hold itself, which is the melt working as
designed.

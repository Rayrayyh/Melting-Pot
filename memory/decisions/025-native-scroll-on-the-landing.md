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

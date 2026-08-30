# Two interactions borrowed from other sites, translated rather than copied

The owner pointed at two live sites on 2026-08-30 and asked for versions of their signature touches. Both were reverse engineered from their shipped code first, then rebuilt in this product's language instead of imitated.

## The loader (from cuvelocity.netlify.app)

Theirs is a copper ring with a spinning comet arc and a breathing logo that only becomes visible if the page takes more than 120ms, plus a 4 second canvas curtain that pins scrolling. What we actually lacked was route feedback: there were no loading.tsx boundaries at all, so entering a Pot showed a blank pane. The translation is web/components/ui/route-loader.tsx behind seven loading.tsx files: the pot mark inside a thin ring, one orange arc on the rim, caption "Warming the pot", invisible for its first 150ms via a pure CSS delayed animation so fast navigations never flash it. The curtain and the scroll pin were left behind on purpose; they fight the restraint rule and the melt already owns the landing's big moment. This makes three loading tiers: Spinner inline, RouteLoader between routes, the StirPot screen for long AI work.

## The cursor lock (from agentify.trade)

Theirs hides the OS cursor and draws full-viewport crosshair hairlines, then four corner brackets lerp out and clamp around any hovered control, turning green. Hiding the cursor in a study app is hostile and the hairlines read trading terminal, so only the good piece survived: web/components/landing/cursor-lock.tsx, landing page only. Four rounded orange corners glide out (lerp 0.28, their constant) to frame the hovered link or button, pulse once, and fold back into the pointer. Native cursor stays. Guards copied exactly from their implementation: fine pointer only, never under reduced motion, rAF loop parks itself when the lerp settles, data-cursor-nolock opts the wordmark out.

## What was considered and dropped

Their scroll reveal stagger and header elevation on scroll were candidates too. The landing already has its own Reveal component doing the first job, and the header is not sticky so the second has nothing to elevate. Neither was built.

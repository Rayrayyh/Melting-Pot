# An identity transform still captures position: fixed

A full-screen overlay rendered in place is not full screen. `position: fixed`
resolves against the nearest ancestor with a transform, filter, perspective,
`contain`, or `will-change`, not against the viewport, and the value does not
have to do anything: `transform: matrix(1, 0, 0, 1, 0, 0)` captures it exactly
as hard as a real translation does.

`<main>` carries `mp-enter`, the page entrance animation. The animation finishes
in a few hundred milliseconds, but the transform property stays on the element
forever, so every `fixed` descendant of `<main>` is positioned against `<main>`
for the life of the page.

What that looked like: `LoadingScreen` with `fixed inset-0` measured 1040x4150
at y=-744 rather than 1280x860 at 0,0. It covered the content column but not
the nav, and it put the pot 1177px down the page, which on an 860px viewport is
a blank cream screen. The component was correct; only its containing block was
wrong. Nothing in the markup hints at this, because the culprit is an ancestor
several levels up whose transform is the identity.

The fix is a portal to `document.body`, not hunting the transform down. Removing
`mp-enter`'s transform would have worked today and broken again the first time
anything above the overlay animated, and transformed ancestors are ordinary:
entrance animations, sticky headers, anything Framer Motion touches.

So: an overlay that means the viewport renders through a portal. Assert it, too.
A screenshot catches this instantly and a unit test never will, because the
geometry only exists once the real page is around it.

Guard the cover as well as place it. A stuck button is an annoyance; a stuck
full-screen cover is a trap with no way out, so every flag that raises one
clears in a `finally`, never on the happy path alone. `fetch` rejects outright
when the network drops, which is exactly when the reader most needs the screen
back.

# Light is the default theme, and the landing carries a one tap switch

Chosen 2026-08-23 by the owner.

Before this, no stored choice meant "follow the system", so a visitor whose
machine was in dark mode met MeltingPot in charcoal. The product is drawn on
cream paper; that is what a first look should be. Nothing stored now means
light, stamped on the document before first paint by the inline script in
`app/layout.tsx` rather than left to a media query, so there is no flash of a
theme nobody picked.

Three stored states, and the difference matters:

- absent: light, the default
- `"light"` / `"dark"`: an explicit choice
- `"system"`: also an explicit choice, stored so it can be told apart from
  never having chosen. Only this one leaves `data-theme` off the root and lets
  `prefers-color-scheme` decide.

`lib/theme.ts` is the single place that knows any of this. The settings picker
and the new landing toggle both read and write through it, so they cannot
disagree.

The toggle itself is an icon button in the public header, because the public
pages have no settings screen to send anyone to. It flips between light and
dark only, and it shows where a tap leads rather than where you already are: a
moon on a light page, a sun on a dark one. Three way choice stays in settings,
where a radio group can name the states.

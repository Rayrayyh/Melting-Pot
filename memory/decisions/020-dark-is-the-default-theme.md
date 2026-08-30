# Dark is the default theme, and one stored choice covers every surface

Dark default chosen 2026-08-30 by the owner, superseding the light default
this note recorded on 2026-08-23 (which itself replaced follow-the-system).

Nothing stored now means dark, stamped on the document before first paint by
the inline script in `app/layout.tsx` rather than left to a media query, so
there is no flash of a theme nobody picked. The cream paper light theme is
one tap away in the landing header.

Three stored states, and the difference matters:

- absent: dark, the default
- `"light"` / `"dark"`: an explicit choice
- `"system"`: also an explicit choice, stored so it can be told apart from
  never having chosen. Only this one leaves `data-theme` off the root and lets
  `prefers-color-scheme` decide.

`lib/theme.ts` is the single place that knows any of this. The settings
picker and the landing toggle both read and write the same stored choice
through it, which is why a preference set on the landing page carries into
the dashboard without being configured twice. The owner asked for exactly
that carry-over on 2026-08-30; it already held by construction and was
verified live rather than rebuilt.

The toggle itself is an icon button in the public header, because the public
pages have no settings screen to send anyone to. It flips between light and
dark only, and it shows where a tap leads rather than where you already are:
a sun on a dark page, a moon on a light one. Three way choice stays in
settings, where a radio group can name the states.

One deliberate exception: the 404 page uses fixed light colors by design
(documented in `app/not-found.tsx`) and stays light in both themes.

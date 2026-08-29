# 024 The landing hero shows the product, not the pot

The owner replaced the illustration hero with a cropped, tilted Pot page mock on 2026-08-29, after a side by side comparison.

## The change

The landing's first section is now a centred stack: headline, subhead, the two calls to
action, then a wide product shot of a Pot page (Human Biology) built from the shipped
components (MetricCard, SectionPill, StatusPill, Avatar, and the main-nav My Pots
disclosure drawn open). The pot illustration and the two column hero it lived in are gone
from the hero; the illustration remains in the repo at web/public/pot-hero.png.

## Why

Under a headline that promises "brings them together", the card shows the claim as
evidence: contributor and shared note counts, six named contributors, an open corrections
count, and a real note with an author and a version pill. The old hero asserted the claim
and showed the brand.

## How it is built, and the rules it encodes

- The card is decorative: aria-hidden, pointer-events-none, select-none. Every string in
  it is fabricated demo content and must never reach assistive tech or the tab order.
- The tilt is a 2D shear, skewY(1.5deg) skewX(-7deg), origin 50% 50%, translateX(-4px).
  Research across 14 product companies (2026-08-29) found none ship a CSS-angled hero;
  the one angled hero (Neon) is a pre-rendered JPEG. -7deg is the legibility ceiling we
  chose; steeper broke row pairing in testing.
- The crop is owned by a fixed-height container (h-[586px] + overflow-hidden), not the
  section, so the cut line stays on the same swept row of the card at every viewport
  width. The fold was swept to land in the gap after the first note card, crossing no
  text. If the card's content changes height, the cut must be re-swept.
- Elevation is the --shadow-hero token, defined per theme in globals.css: warm
  rgba(62,45,45) in light (measured off railway.com), true black in dark, because the
  warm tint composites lighter than the dark ground and reads as a halo.
- The hero ground is bg-sunken with the header wrapped in the same ground, so the card's
  bg-surface has a real value step under it.
- Below md the card is hidden and the hero is copy only: a 1240px dashboard has no honest
  scale on a phone.

## Verified

Lint, typecheck, production build, 201 unit tests. The e2e suite could not run: dev_seed
is absent on the shared database and reseeding was blocked by the session's permission
layer. The landing spec's assertions (headline text, CTA targets) are unchanged by this
work.

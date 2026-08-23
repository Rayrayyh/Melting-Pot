# The light-mode brand orange had to darken to be readable

Decided 2026-08-20, after measuring rather than guessing.

## What was wrong

`--primary` was `#e0761a` in light mode. Measured against the tokens it is
actually used with:

- as text on `--paper` (#faf4e6): **2.83:1**
- as text on `--surface` (#fffdf6): **3.05:1**
- behind `--on-primary` (#fff8ee), which is every filled primary button:
  **2.94:1**

WCAG AA wants 4.5:1 for normal text and 3:1 for large text. So every primary
button label in the app, and every orange link, was below the floor, and the
filled button was below even the large-text floor. Dark mode measured 8.22:1
and was never a problem.

This was not a small miss on one screen. `bg-primary text-on-primary` is the
Button component's primary variant, so it was every call to action in the
product, including the one on the landing page.

## What changed

The same hue and the same saturation, taken down in lightness until all three
roles clear 4.5:1:

| Token | Was | Now |
|---|---|---|
| `--primary` | `#e0761a` | `#ab5a14` |
| `--primary-hover` | `#cd6812` | `#964f11` |
| `--primary-active` | `#ba5b0d` | `#84460f` |

Measured after: text on paper 4.55, text on surface 4.91, on-primary on it 4.74.
Dark mode is untouched.

## What it costs, honestly

The new orange is visibly deeper and browner. The pot mark in the hero keeps the
original brighter orange, because that gradient lives inside the SVG and is the
one sanctioned gradient in the product, so the button beside it no longer matches
it exactly. That mismatch is real and was accepted: the mark is decorative art
and the button is a control carrying text, and only one of those has to be
readable.

## Alternatives rejected

- **Dark ink on the brand orange** (5.06:1, and it passes). Rejected because
  near-black text on orange is a different product's look, and it would have
  changed every button in both themes rather than one ramp in one theme.
- **A separate `--primary-strong` used only behind text**, leaving `--primary`
  bright for accents. Rejected because `text-primary` on paper was failing too,
  at 2.83:1, so the bright value had no remaining safe use and the second token
  would only have hidden that.
- **Leaving it and calling the buttons large text.** They are 13 to 15px. They
  are not large text, and at 2.94 they failed that bar anyway.

## How to undo it

Three values in `web/app/globals.css`, in one commit. If the brand orange
matters more than the contrast floor, revert that commit and the product looks
exactly as it did; nothing else depends on the new values.

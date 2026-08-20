# 011 Account surface and two-step sign in

Identity moved to the foot of the left nav, theme moved into a new `/me/settings`, and Pot owners can turn on an authenticator-app second step that the login flow actually enforces.

## What changed and why

**The account control left the top bar.** It sat top right next to a theme
toggle, which put two unrelated controls in the one strip that should belong
to whatever the person is reading. The profile now sits at the foot of the
left nav, under the person's own Pots and links, showing name, email, and a
generic avatar. The top bar keeps the mark and search. The owner asked for
this placement directly, marking the empty space at the bottom of the nav.

**Theme moved into settings.** A one-tap toggle cannot express "follow my
device", which was the actual default: the toggle only ever flipped between
light and dark and could not hand control back. `/me/settings` now offers
System, Light, and Dark as three visible states. `ThemeToggle` was deleted
rather than left orphaned. The storage key (`mp-theme`) and the pre-paint
script in `layout.tsx` are unchanged; System simply removes the key.

**There was no account-level settings page at all before this.** Pot settings
existed; nothing covered the person. `/me/settings` is that surface, and it
is where theme and security live.

**Avatars are a person icon in one of six tints, not initials.** Initials
were drawn from four tints that were mostly functional colors, so a green
avatar sat next to a green success pill and a red one next to an error. The
six new `--avatar-N` / `--avatar-N-soft` pairs are decorative only and live
apart from the functional set. The tint is hashed from the display name, so
the same person keeps the same color everywhere. `AvatarInitial` became
`Avatar`.

**Two-step sign in is real, not decorative.** Supabase Auth carries TOTP
factors, but enrolling one changes nothing on its own: a password-only
session is `aal1` and the app would have kept letting it through. Enrolment
in settings is therefore paired with a challenge in `auth-form.tsx`, which
checks the assurance level after a successful password and stops for a
six-digit code when the account has a verified factor. Without that second
half the feature would have been a claim rather than a protection.

Offered to Pot owners only (`ownsAnyPot()`), because their account holds a
whole class's work. Members can be added later; the panel is not
role-specific in any deeper way.

The enrolled factor is read on the server in the page and passed in, so the
panel opens in the right state instead of resolving it after paint. Any
unverified factor left by an abandoned attempt is cleared before a new
enrolment, since Supabase rejects a repeated friendly name.

## The landing is open to signed-in people

`/` used to redirect anyone with a session straight to `/home`, so there was
no way back to the marketing page without signing out. It now renders for
everyone; only a failed invite link still redirects, because `/home` shows
that error usefully next to its join field. When a visitor is signed in,
"Sign in" and "Get started" collapse into "Go to dashboard", and the account
menu carries "About MeltingPot" as the way in.

## Brand mark has no tile

The mark painted its mouth and its m in the page background color and the
favicon sat on a cream rounded rect. Both are now real holes punched with
SVG masks, so the mark carries nothing behind it and sits on any surface.
`scripts/build-icons.mjs` rasterizes `app/icon.svg` into `favicon.ico` and
`apple-icon.png` with transparency; run it after editing the SVG.

## Hero sizing

The hero headline is fluid (`clamp(2.5rem, 4.6vw, 4.625rem)`) rather than
stepped. At 1280 the stepped size pushed the three forced lines to four,
which grew the left column past the viewport and shoved the pot below the
fold. The art's box was also extended past the pot's base (viewBox height
872 for a base at y 861) and capped with a max height, so the whole pot is
visible on first paint at every viewport tested: 1024x768, 1280x720,
1440x900, 1920x1080.

## Hackathon credit

The footer names the Pixel Forge AI Hackathon and carries its mark, linked
to the Devpost page. The logo is the hackathon's own artwork at its own
colors, trimmed of transparent padding, kept small enough to read as a
credit rather than a design element.

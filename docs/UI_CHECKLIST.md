# Checklist: all 60 rules against the landing and the dashboard

Audited 2026-08-24 against `docs/UI_RULES.md`. Every row was checked by reading
the code or the rendered page, not assumed. Seven failed. All seven are fixed;
each says what changed and where.

**This is a dated measurement, not a current claim.** Everything recorded in
`memory/decisions/024` through `032` landed after this audit: the hero product
shot, native scroll on the landing, the three doors in section two, the folding
sidebar, the app's own select and scrollbar, the record card, the class
standing and the stir. None of it has been run against the sixty rules. Treat
the score below as what was true on 2026-08-24.

Legend: **Pass** already held. **Fixed** failed the audit and was corrected in
this pass. **N/A** does not apply to this product.

## A. Hierarchy and intent

| # | Rule | Landing | Dashboard | Evidence |
|---|---|---|---|---|
| R1 | Design for user intent | Pass | Pass | Landing opens on the class problem; dashboard opens on what is waiting for you |
| R2 | Respect layout convention | Pass | Pass | Nav top on public pages, left sidebar in the app |
| R3 | Size, position, colour only | Pass | Pass | One display face, one accent, no third signal |
| R4 | One obvious primary action | Pass | Pass | "Join a class" on the hero; "Create a Pot" or the join card on the dashboard |
| R5 | Sequence, do not hide | Pass | Pass | Contribute is a four-stage flow; the practice test hides questions behind a cover |
| R6 | Five second test | Pass | N/A | Hero states what it is in one sentence |
| R7 | Every section has one job | Pass | Pass | Six landing sections, no two doing the same job |
| R8 | Never show a metric twice | Pass | Pass | Pot counts appear on the Pot card only |

## B. Layout and spacing

| # | Rule | Status | Evidence |
|---|---|---|---|
| R9 | Let it breathe | Pass | `py-20 sm:py-28` on landing sections, `space-y-10` on the dashboard |
| R10 | Dashboards obey the grid | Pass | `grid lg:grid-cols-[1fr_300px]`, one column set |
| R11 | Sidebar is the spine | Pass | `components/shell/app-shell.tsx` |
| R12 | Settings at the bottom of the nav | **Fixed** | Settings was only inside the account popover. Added as the last nav item, pushed down with `mt-auto` (`left-nav.tsx`) |
| R13 | One separation method per list | Pass | `divide-y divide-edge`, no borders plus shading |
| R14 | Cards get real internal margin | Pass | `CardSection` owns the padding |
| R15 | Landing generous, dashboard dense | Pass | Different spacing scales, deliberately |
| R16 | Nothing scrolls sideways but tables | Pass | The counts table sits in `overflow-x-auto` |

## C. Typography

| # | Rule | Status | Evidence |
|---|---|---|---|
| R17 | One sans is enough | Pass | Inter for UI. Fraunces and Baloo are display and wordmark, Source Serif is note bodies, each with one job |
| R18 | Tighten display headings | Pass | `tracking-tight` on every display heading |
| R19 | Fewer sizes in the dashboard | Pass | Dashboard tops out at `text-2xl` |
| R20 | Readable line length | Pass | `max-w-md` on the hero paragraph, `max-w-2xl` on section copy |
| R21 | Numbers tabular and right-aligned | **Fixed** | The counts table was `text-left` with `tabular-nums`. Now right-aligned in both head and body (`teaching-readout.tsx`) |
| R22 | Truncate rather than break layout | Pass | `truncate` on nav labels, `line-clamp-2` on activity titles |

## D. Colour

| # | Rule | Status | Evidence |
|---|---|---|---|
| R23 | Colour comes from meaning | Pass | Orange is action; green, amber and red are success, warning, danger |
| R24 | Not everything gets a colour | Pass | One accent |
| R25 | Icons usually uncoloured | Pass | Nav and body icons inherit ink; colour only marks the active item |
| R26 | Never pure black on white | Pass | `--ink: #24222c` on `--paper: #faf4e6` |
| R27 | Dark mode is its own palette | Pass | Separate block in `globals.css`, not an inversion |
| R28 | Brand bends to contrast | Pass | Orange darkened to `#ab5a14`; the comment records all three ratios |
| R29 | Semantic colours mean what is expected | Pass | Danger red on destructive confirms |
| R30 | Neutrals in layers | Pass | paper, surface, surface-raised, sunken; edge and edge-strong; ink, ink-muted, ink-faint |
| R31 | Accent is a scale | Pass | primary, hover, active, soft, on-primary |

## E. Icons and imagery

| # | Rule | Status | Evidence |
|---|---|---|---|
| R32 | Icons, never emoji | Pass | Swept the whole `app`, `components` and `lib` tree for emoji codepoints: zero |
| R33 | One library, one weight | Pass | Phosphor throughout |
| R34 | Icon size matches line height | Pass | `size-4` beside `text-sm`, `size-[18px]` in the nav |
| R35 | Icon-only controls are named | Pass | Theme toggle, drawer close and search all carry `aria-label`; the theme toggle also has a `title` |
| R36 | Avatars beat names for scanning | Pass | `Avatar` on activity rows and the study record |
| R37 | Decorative images hidden | Pass | Hero pot has `alt=""`, icons carry `aria-hidden` |

## F. Components and states

| # | Rule | Status | Evidence |
|---|---|---|---|
| R38 | Four states on every button | **Fixed** | `danger` and `clay` had no pressed state, and `secondary` had a pressed state identical to its hover, so a click gave no feedback. All four variants now differ across default, hover, pressed and disabled (`button.tsx`) |
| R39 | Inputs have focus, error, disabled | Pass | `input.tsx` plus `role="alert"` messages |
| R40 | Signifiers everywhere | Pass | Hover on every link, `aria-current` on nav |
| R41 | Current page marked | Pass | `aria-current="page"` plus a soft background |
| R42 | Shadows barely there | Pass | One `--shadow-card` token, low opacity |
| R43 | One radius scale | Pass | `--radius-card` and `--radius-control` |
| R44 | Every list has an empty state | **Fixed** | `ActivityList` returned `null` when empty, leaving an unexplained hole in the sidebar. It now says nothing has been shared yet (`activity-list.tsx`) |
| R45 | Every async action has a loading state | Pass | `LoadingScreen` on organize, `Stir` on every busy button |
| R46 | Scrollable tables get search or sort | Pass | Admin tabs sort; the counts table is short by construction |
| R47 | Secondary actions tuck away | Pass | Removal sits behind a confirm dialog, not a row of buttons |
| R48 | Components reused, not restyled | Pass | One `Button`, one `Card`, one `EmptyState` |

## G. Motion

| # | Rule | Status | Evidence |
|---|---|---|---|
| R49 | Motion serves clarity | Pass | Entrance lift and the scroll stopper; nothing decorative |
| R50 | Direction carries meaning | Pass | Content lifts on entry |
| R51 | Scroll jacking sparing | Pass | One scroll sequence, on the landing, that a reader can scroll straight past |
| R52 | Load more beats infinite scroll | Pass | No infinite scroll anywhere; the footer is always reachable |
| R53 | Respect reduced motion | Pass | Global `prefers-reduced-motion` block in `globals.css` |

## H. Content and copy

| # | Rule | Status | Evidence |
|---|---|---|---|
| R54 | Friendly, natural language | Pass | "Write it rough", "Have a class code?" |
| R55 | Errors say what to do next | Pass | "Wait a moment and try again", "Reload to pick up where you left off" |
| R56 | The 404 has a personality | Pass | `app/not-found.tsx` |

## I. Fundamentals that win awards

| # | Rule | Status | Evidence |
|---|---|---|---|
| R57 | Semantics first | **Fixed** | The landing had no `main` landmark at all, so its whole body was orphaned. Wrapped it, with `id="main"` (`brand-landing.tsx`). One `h1` per page was already true |
| R58 | Keyboard reachable, focus ring, skip link | **Fixed** | Global `:focus-visible` ring existed; there was no skip link anywhere. Added to both shells, first in the tab order, visible only on focus (`app-shell.tsx`, `site-header.tsx`) |
| R59 | Fast on a real device | Pass | Static landing, streamed dashboard, no blocking third party script |

## J. The rule that outranks the rest

| # | Rule | Status | Evidence |
|---|---|---|---|
| R60 | Never imply something untrue | **Fixed earlier this session** | Two organizers existed and nothing said which one wrote your note, and the two code paths did not even agree on how to report it. Both now report `provider`, and `OrganizedBy` names the model or says plainly that it could not be reached. The teaching readout says which numbers are the database's and which reading is the model's |

---

## Score

| | Count |
|---|---|
| Rules checked | 60 |
| Passed as built | 53 |
| Failed and fixed | 7 |
| Still failing | 0 |

Counted on 2026-08-24, against the build of that date. Screens added since have
not been checked against the list.

The seven: R12 settings placement, R21 number alignment, R38 button states,
R44 empty state, R57 missing landmark, R58 missing skip link, R60 the honesty
gap fixed earlier in this session.

Four of the seven were accessibility or feedback rather than looks, which is
the useful part of running a list like this: the things that were wrong were
not the things that would have caught the eye.

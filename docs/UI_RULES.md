# The rules this interface is held to

Sixty rules. Every one is checkable by looking at the screen or the code, and
every one has a source.

## Where these come from, honestly

Most of them are Kole Jain's, a Canadian product designer who teaches UI/UX on
[YouTube](https://www.youtube.com/@KoleJain). **I could not watch the videos.**
What I read were the published transcripts at
[sozai.app](https://sozai.app/transcripts/channel/kole-jain/), which carry his
words but not what he points at on screen, so anything that lived in a
demonstration rather than a sentence is missing here. Where a rule is his, the
video it comes from is named. Quotes are from those transcripts.

One correction worth recording: a search summary attributed a "Skeleton
Principle" and an "Escape Hatch" framework to him. Neither appears in any
transcript I read, so neither is in this list. Rules here are ones I could
actually source.

The rest come from two places. A handful are from what judges say separates
[Awwwards](https://www.awwwards.com/websites/) winners from merely pretty
sites, which is mostly fundamentals: performance on real devices, semantics,
responsive behaviour, restraint. The last group is this product's own, and
those are the ones that would still matter if nobody was grading.

Rules are numbered R1 to R60 and referenced by number in `UI_CHECKLIST.md`.

---

## A. Hierarchy and intent

**R1. Design for user intent, not for other designers.**
"Focus on user intent over aesthetics." A screen is right when the person who
opened it gets what they came for. (Kole, *Think Like a Genius UI/UX Designer*)

**R2. Respect thirty years of layout convention.**
Content flows top to bottom and left to right; navigation lives at the top or
the left. People have been trained by every other site they use. (Kole, same)

**R3. Size, position and colour are the only three hierarchy tools.**
"We have size, position, and color to use to our advantage." If something needs
to be noticed, change one of those three, not all of them. (Kole, *Every UI/UX
Concept Explained*)

**R4. One primary action per screen, and it is visually obvious.**
Everything else is secondary or quiet. (Kole, *3 Dashboard UI Flaws*)

**R5. Sequence, do not hide.**
"You're not hiding functionality, you're sequencing it so that the user is
never overwhelmed." Progressive disclosure is about order, not concealment.
(Kole, *3 Dashboard UI Flaws*)

**R6. Five second test.**
A visitor scrolling for five seconds should be able to say what this is.
(Kole, *The Formula Behind Truly Captivating UI Sections*)

**R7. Every section has one job you can name in a sentence.**
If two sections have the same job, one of them goes.

**R8. Never show the same metric twice on one screen.**
"These four KPIs at the top show up not once, not twice, but three times."
(Kole, *5 SaaS UI/UX Mistakes That Scream You Vibe Code*)

---

## B. Layout and spacing

**R9. Let it breathe.**
"Most beginner UIs are packed way too tight." When in doubt, add space.
(Kole, *7 UI/UX Mistakes*)

**R10. Dashboards obey the grid more strictly than landing pages.**
You are using most of the screen, so alignment errors have nowhere to hide.
(Kole, *Everything You Need to Build a Dashboard UI*)

**R11. The sidebar is the spine of the product.**
(Kole, same)

**R12. Group navigation by relevance, and put settings at the bottom.**
(Kole, same)

**R13. Separate lists with space, a divider, or colour. Pick one, not all three.**
(Kole, same)

**R14. Cards get real internal margin.**
"Keep the margins well spaced so content isn't too tightly packed." (Kole, same)

**R15. Landing sections are generous; dashboard sections are dense.**
The same spacing scale does not serve both.

**R16. Nothing scrolls horizontally except things that are meant to.**
A table may scroll inside its own container. The page body may not.

---

## C. Typography

**R17. One sans-serif is enough for UI.**
"You'll never need more than one." (Kole, *Every UI/UX Concept Explained*)

**R18. Tighten display headings by two to three percent.**
Negative letter spacing on large text. (Kole, same)

**R19. Landing pages may use up to six sizes; dashboards use fewer and rarely
exceed 24px.** (Kole, same)

**R20. Line length stays readable.**
Long-form body text gets a max width, not the full container.

**R21. Numbers are tabular and right-aligned.**
"Right-align the numbers so the digits align by place value." (Kole,
*3 Dashboard UI Flaws*)

**R22. Truncate long text rather than letting it break a layout.**
"Truncating long text to give more breathing room to the other columns."
(Kole, same)

---

## D. Colour

**R23. Colour comes from meaning, not decoration.**
"Dashboard colors shouldn't just be sprinkled in to look nice. It should come
from the data itself." (Kole, *3 Dashboard UI Flaws*)

**R24. Not everything gets its own colour.** (Kole, *7 Color Mistakes*)

**R25. Icons are usually not coloured.**
"For the most part, icons need no color." Colour on an icon means status.
(Kole, same)

**R26. Never pure black on pure white.**
Use near-black and warm off-white so hierarchy has somewhere to go. (Kole, same)

**R27. Dark mode is not inverted light mode.**
"Dark mode is not just the inverse of light mode." Separate palette, dimmed
saturation, lighter surfaces for depth. (Kole, same)

**R28. Brand colour bends to contrast, not the other way round.**
If the brand orange fails 4.5:1, the orange changes. (Kole, same)

**R29. Semantic colours mean what everyone expects.**
Red destructive, green success, yellow warning. (Kole, *Every UI/UX Concept*)

**R30. Neutrals come in layers, not one grey.**
Several background levels, one or two stroke levels, three or more text levels.
(Kole, *Why the 60-30-10 Rule is Ruining Your UI*)

**R31. An accent is a scale, not a single hex.**
"A scale, from the lightest version of it to the darkest," so hover and pressed
states have somewhere to come from. (Kole, same)

---

## E. Icons and imagery

**R32. Icons, never emoji.**
"Get rid of the emojis." Use one professional icon set. (Kole, *5 SaaS UI/UX
Mistakes*)

**R33. One icon library, one weight.**
Mixing sets shows up immediately in "fill, line width, and style." (Kole,
*7 UI/UX Mistakes*)

**R34. Icon size matches the line height of the text beside it.**
(Kole, *Every UI/UX Concept*)

**R35. Any icon-only control has an accessible name and a tooltip.**
"We have to assume that the user won't understand all of our icons." (Kole,
*3 Dashboard UI Flaws*)

**R36. Avatars exist because faces are faster to scan than names.**
"Your eye can associate who did what way faster than reading a name."
(Kole, same)

**R37. Decorative images are hidden from screen readers.**
An empty alt, or `aria-hidden`.

---

## F. Components and states

**R38. Every button has four states.**
"At least four states: default, hovered, active or pressed, and disabled."
(Kole, *Every UI/UX Concept*)

**R39. Every input has focus, error and disabled states.** (Kole, same)

**R40. Signifiers everywhere.**
"Button press state, highlights on active nav items, hover states, or even
tool tips." If it does something, it looks like it does something. (Kole, same)

**R41. The current page is marked in the navigation.**
(Kole, *Everything You Need to Build a Dashboard UI*)

**R42. Shadows are barely there.**
"If the shadow is the first thing you notice on a design, you're not using it
right." (Kole, *Every UI/UX Concept*)

**R43. One corner radius scale, applied consistently.**
(Kole, *7 UI/UX Mistakes*)

**R44. Every list, table and panel has an empty state.**
"There's a thoughtful empty state" rather than a blank screen. (Kole, *Stop
Making Pretty UIs*)

**R45. Every async action has a loading state.** (Kole, same)

**R46. Tables that hold enough rows to scroll get search, filter or sort.**
(Kole, *Everything You Need to Build a Dashboard UI*)

**R47. Secondary actions tuck into a menu rather than crowding the card.**
"Collapse these buttons into a triple dot menu." (Kole, *5 SaaS UI/UX Mistakes*)

**R48. Components are reused, never re-styled per page.**
"The buttons, spacing, text styles are all exactly the same, even when used in
wildly different contexts." (Kole, *Stop Making Pretty UIs*)

---

## G. Motion

**R49. Motion serves clarity.**
"Motion should support clarity, not distract from it." (Kole, *The Formula
Behind Truly Captivating UI Sections*)

**R50. Direction carries meaning.**
Up for temporary, sideways for progress. (Kole, same)

**R51. Scroll jacking is used sparingly, if ever.** (Kole, *Think Like a Genius*)

**R52. Load more beats infinite scroll.**
It "gives the user more control and crucially, it lets them actually reach the
footer." (Kole, same)

**R53. Every animation respects `prefers-reduced-motion`.**
(Award-site fundamentals, and plain decency)

---

## H. Content and copy

**R54. Friendly, natural language. No corporate voice.**
(Kole, *4 UI Design Hacks to Kill Boring Designs*)

**R55. Error messages say what happened and what to do next.**

**R56. The 404 page is allowed to have a personality.**
"These are the ultimate time to be quirky and fun." (Kole, same)

---

## I. Fundamentals that win awards

**R57. Semantics first.**
One `h1` per page, real landmarks, headings in order. Judges "benchmark
execution" rather than react to a screenshot. (Awwwards judging)

**R58. Keyboard reachable, with a visible focus ring and a skip link.**

**R59. Fast on a real device.**
An animated site is still a fast site.

---

## J. This product's own rule, which outranks the rest

**R60. Never let the interface imply something untrue.**
If a rule-based fallback wrote the note, the page says so. If the model read
the numbers but did not count them, the page says which is which. A beautiful
screen that overstates what happened underneath is a worse screen than a plain
one that does not.

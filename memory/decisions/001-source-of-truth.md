# 001 Source of truth precedence

Summary: `docs/SPEC.md` (the master prompt) beats every other document; the repo PDFs are historical vision docs and must not drive MVP scope or styling.

## Precedence order

1. `docs/SPEC.md` - the written master prompt. Always wins conflicts.
2. `docs/reference/REFERENCE_CAPTIONS.md` - per-image instructions on what to use and ignore.
3. `docs/reference/*.png` - the 16 reference screens. They communicate UX structure, hierarchy, sequence, and interaction boundaries only. Never their colors, mobile dimensions, or excluded features.
4. The Figma file (Study-Dashboard-Sketch, key `uh9kk22iVMQ4y8NSSRfhxg`) - same content as the reference pack plus explicitly excluded mockups.

## Why it mattered

The four PDFs in the repo root (PRD, condensed MVP, frontend design, MVP scope v2) describe earlier iterations with a much broader scope: LMS imports, Course/Module/Lesson hierarchy, forks and branches, comments, streaks, ranks, contribution graphs, flashcards and quizzes as core, and a tomato/cream/sage/gold palette with a playful melting identity. The master prompt explicitly excludes or defers all of that and replaces the palette with off-white paper, white surfaces, charcoal text, deep forest green primary, and small clay accents. Building from the PDFs would produce the wrong product.

## Figma findings (checked 2026-08-19)

- Section marked "Do NOT use this section for inspiration, these are merely mockups": the purple DVC login screen and the "Onboarding / Nickname" frame near it.
- Second "Do NOT use" marker: the Contributions heatmap/journey section (contribution stream, year heatmap, journey). Consistent with SPEC's exclusion of contribution graphs and streaks.
- A third "Do NOT use this entire section" note sits beside the mobile flow rows. Those same ten mobile screens are the curated reference images 04 to 13 with "Use this image for..." captions, so the reading is: use their UX structure per the captions, never their visual design.
- Marked "Flow to replicate": the kahoot.it-style join code entry (big code field, code like D2Z7GG, no account required to start).
- The desktop frames (Dashboard user/pot, Raw Notes, Summary, Version History, Contributors, Settings) match reference images 02, 03, 14, 15, 16. The Streak Stats, Flashcards, and Practice Tests frames are excluded features.

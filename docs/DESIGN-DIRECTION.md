# Design direction

How the Anthropic frontend-design skill (github.com/anthropics/skills, `skills/frontend-design`) applies to MeltingPot. SPEC.md pins the palette and feel; this file records the deliberate choices made inside those constraints, and the design notes from each iteration pass. Per the skill: the brief's own words win on every pinned axis, and freedom is spent only where the brief leaves an axis open.

## Subject, audience, job

The subject is a shared class vault: students pour rough knowledge in, the class reads organized knowledge out. The audience is students mid-semester, tired, between classes. Each screen's single job: dashboard = "what needs me, where did we leave off"; feed = "what does my class know now"; composer = "get the thought out of my head with zero friction"; review surfaces = "decide with confidence".

## Pinned by SPEC (not negotiable)

Warm off-white paper, white surfaces, charcoal ink, deep forest green primary, small clay accents, functional color only with text labels, Inter UI type, Source Serif 4 for long-form note bodies, flat cards, subtle borders, restrained shadows, rounded corners, no gradients, no purple AI branding, no glowing effects, no chatbot UI, sentence case, no emojis, no em dashes. The skill flags warm-cream-plus-serif as a common AI default; here it is the brief's explicit direction, so it stays, and distinctiveness is earned elsewhere.

## Where the distinctiveness lives

1. **Type as structure.** Inter carries the interface at a tight scale (11px eyebrows with wide tracking, 13px meta, 14px body, semibold titles). Source Serif 4 appears ONLY inside shared-note reading surfaces, so the moment of reading organized class knowledge feels physically different from operating the tool. The contrast between the two faces is the visual signal for "this is the vault itself".
2. **The class code as a brand object.** Six monospaced characters with wide letterspacing in a large bordered field, identical everywhere the code appears (landing hero, create-pot success, settings, vitals row). It is the product's key, treated like one.
3. **Original-beside-organized as the signature layout.** Every trust-critical surface (review before sharing, before/after, maintainer workspace, history comparison) uses the same two-column grammar: verbatim raw text on paper tint at left, organized structure on white at right. The repetition teaches the product's core promise without copy.
4. **Status is always worded.** Pills carry text labels with functional tints, never color alone. Structural devices (eyebrows, dividers, numbered stages) appear only where the content is genuinely sequential or labeled, per the skill's structure-is-information rule.
5. **Dashboard as a study desk.** The priority surface leads with what needs the person (reviews waiting, revisions requested, drafts), not vanity numbers. Role decides the lead module.

## Motion

One orchestrated moment per flow, honoring prefers-reduced-motion: the organizing stage checklist (honest, stepped), the shared-success settle, and later the landing scroll stopper (raw note reorganizing into a clean card). Everything else is 150ms color/opacity transitions. No ambient animation.

## Copy voice

Calm, specific, active, from the student's side of the screen. Verbs name outcomes ("Share with class", "Send to maintainer"). Reassurance lines state guarantees ("Your original is saved. Nothing has been shared yet."). Errors say what happened and what to do next, without apology or vagueness. No AI-speak, no hype, no "generate".

## Design notes (append per iteration pass)

- 2026-08-19 pass 1 (styleguide screenshots, light + dark): tokens hold up in both themes; dark keeps the warm undertone rather than going neutral gray, which preserves the paper identity. Neutral "Draft" pill sits quiet in dark, acceptable. Watch: sticky action bar contrast over long content, class-code tracking at small sizes.

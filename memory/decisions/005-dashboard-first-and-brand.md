# 005 Dashboard-first, landing secondary, and brand directives

Summary: Owner directives from plan review (2026-08-19): role-based dashboard is a priority surface, the brand landing with scroll stopper is secondary and built late, Phosphor icons everywhere, light AND dark themes, clean production, exactly one Netlify deploy.

## The decisions

- Dashboard (`/home`) is role-based: members lead with their study desk (drafts, revision-requested proposals, then Pots and activity); maintainers/owners additionally get a cross-Pot review module listing pending proposals from every Pot they maintain. All modules permission-scoped server-side. Pot cards carry stats (members, notes, open corrections, last activity) plus a Continue deep link.
- The brand landing page is secondary: build order puts it after the core loops. It keeps the class-code entry as the hero, uses catchy human copy (no AI-sounding language), a unique editorial layout, and one scroll stopper: a pinned GSAP ScrollTrigger section where scrolling reorganizes a messy raw note into a clean shared-note card, original preserved beside it; iterate until it works cleanly; reduced-motion gets a static before/after.
- Icons: Phosphor everywhere (`@phosphor-icons/react`), superseding SPEC's "Lucide-style" line. Regular weight in-product, duotone/fill for brand moments. Server components import from `@phosphor-icons/react/dist/ssr`.
- Themes: light AND dark. Light is the warm paper palette; dark is a derived warm charcoal variant. System-following by default with a quiet persisted toggle (`data-theme` attribute, `mp-theme` localStorage key, pre-paint inline script in `web/app/layout.tsx`).
- Production ships clean: no seed data on the live site; the seed script is dev/test only. The post-deploy smoke test creates a temporary account and Pot and deletes them afterward.
- Exactly ONE Netlify deploy, at the end, to meltingpot.netlify.app or the nearest available name. The earlier pre-flight deploy idea is dropped.
- Process rules: never make changes while in plan mode; when information is sufficient, act without re-asking; run a consistent bug pass and fix what it finds.

## Why it mattered

These came as explicit owner corrections during plan review, so they override anything contrary in earlier notes. The reference zip is committed at `docs/reference/` as permanent memory per the same review.

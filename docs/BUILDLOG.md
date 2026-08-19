# Build log

Running record of deductions, actions, and verification evidence, newest entries appended at the bottom of each step. Durable conclusions get distilled into `memory/`; this file is the working trace.

## Step 0: Planning (2026-08-19)

- Read all four repo PDFs (needed poppler; pypdf is broken here, lesson 001), hackathon rules, 16 reference screens + captions, and the Figma canvas. Deduced the PDFs are prior iterations; SPEC.md wins (decision 001).
- Fan-out analysis of all 16 screens produced docs/UX-BRIEF.md (19 routes, 37 components, copy bank, state machines).
- Owner fixed the stack (Next.js + Supabase RLS + Netlify + Framer Motion/GSAP), deterministic organizer, Netlify deploy, then during review: dashboard-first and role-based, landing secondary with scroll stopper, Phosphor icons everywhere, light + dark, clean production, exactly one deploy (decisions 002 to 006).

## Step 1: Scaffold and design system (2026-08-19)

- Next 16.3.1 scaffolded in web/; discovered proxy.ts replaces middleware.ts and params are async (lesson 002).
- Full token system (light + dark), 16 base components, two-mode shell, /dev/styleguide.
- Playwright needed launchOptions.executablePath pinned to /opt/pw-browsers/chromium (lesson 002).
- Verified: lint, typecheck, build green; 3 e2e tests passed; styleguide screenshots reviewed in both themes. Pushed 2f2456b.

## Step 2: Supabase data layer (2026-08-19)

- Created project evcfmwxzxwmeiczfupsw (org confirmed, $0/month, cost flow completed).
- Applied migrations: 0001 schema (10 tables, enums, triggers, FTS index), 0002 RLS (helpers + policies on every table), 0003 RPCs (lookup/join/create/regenerate/share/decide/resubmit/roster), 0004 storage bucket + policies, 0005 register_student, 0006 dev_seed(), 0007 function grant tightening.
- Deduction: GoTrue signup is unusable here: confirmations on by default, no MCP path to change auth config, and the built-in mailer rejected the SECOND signup with "email rate limit exceeded". Registration therefore goes through the register_student RPC (decision 004 revised, lesson 003). Verified the full loop: RPC returns a user id, password grant returns a session carrying the display name.
- Deduction: Supabase default privileges grant EXECUTE on new functions to anon and authenticated; the security advisor caught helper functions being anon-callable; fixed in 0007 and re-learned to always run advisors after DDL (lesson 003).
- Seeded Biology 101 (code BIO101): 4 users, 4 sections, 6 shared notes, one note with an accepted correction (v2, dual credit + reviewing maintainer), one pending proposal, one draft. Reseeding is one cheap call to dev_seed().
- Recorded RLS evidence: anon gets zero rows from every table but the code lookup works case-insensitively; a member sees the Pot and only their own contributions; a maintainer sees both proposals; an outsider account sees nothing and only their own profile; anon is denied on join/create/dev_seed RPCs; duplicate registration fails with email_taken.
- Advisors after fixes: remaining warnings are the intentionally anon-callable lookup/register RPCs and the leaked-password-protection auth toggle (needs dashboard; noted for the owner in the README later).

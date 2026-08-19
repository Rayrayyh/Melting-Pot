# MeltingPot MVP Execution Plan

Approved plan (2026-08-19, revised during owner review): dashboard-first and role-based, brand landing secondary and built late, Phosphor icons everywhere, light and dark themes, clean production, exactly one Netlify deploy at the end. Each step is independently verifiable so failures isolate to one step. Every step ends with lint, typecheck, and build green, a commit, a push to `claude/meltingpot-mvp-build-57aw4u` (PR #2), and a step-scoped bug check. Keep the Status lines current; log decisions and lessons in `memory/` as they happen.

Sources: `docs/SPEC.md` (authoritative), `docs/UX-BRIEF.md` (routes, shell, components, copy, state machines), `memory/decisions/001-005`.

Legend: [pending] [in progress] [done] [blocked]

---

## Step 0: Planning and knowledge base

Status: [done] 2026-08-19

SPEC captured, 16 reference screens committed to `docs/reference/` and analyzed into `docs/UX-BRIEF.md`, memory system initialized, stack + directives confirmed with the owner, Supabase org verified ($0 project), Figma exclusions documented.

## Step 1: Scaffold and design system

Status: [done] 2026-08-19

`web/` scaffolded (Next 16.3.1 App Router, TS, Tailwind v4, pnpm). Installed `@phosphor-icons/react`, framer-motion, gsap, `@supabase/supabase-js`, `@supabase/ssr`, Playwright, vitest. Light + dark token system in `web/app/globals.css` (system-following, `data-theme` override persisted as `mp-theme`, pre-paint init script). Inter + Source Serif 4 via next/font. Base components in `web/components/ui/` (Button, Card/Eyebrow, Input/TextArea/Field, StatusPill/RolePill/SectionPill, AvatarInitial/AttributionRow, EmptyState, NoticeBanner, Breadcrumb, StickyActionBar, MetricCard, FlowProgress/StageChecklist, ClassCodeInput, ConfirmDialog, ThemeToggle). Shell in `web/components/shell/` (TopBar, UserNav, PotNav, AppShell with drawer collapse). `/dev/styleguide` renders everything. Landing placeholder with code-entry hero at `/`.

Verified: `pnpm lint`, `pnpm typecheck`, `pnpm build` all green; 3 Playwright tests pass (styleguide light + dark with screenshots, landing code hero normalizes to uppercase and gates the Join button). Playwright uses the container Chromium via launchOptions (see `memory/lessons/002`).

## Step 2: Supabase project, schema, RLS, RPCs, dev seed

Status: [done] 2026-08-19. Project evcfmwxzxwmeiczfupsw; migrations 0001-0007 applied and mirrored in `supabase/migrations/`; registration is the `register_student` RPC (decision 004 revised, lesson 003); dev seed installed as `dev_seed()`; RLS evidence and advisor results recorded in `docs/BUILDLOG.md`.

Create project (org "Rayyan's projects", $0 confirmed). Migrations: profiles, pots (unique uppercase 6-char `class_code`, duplicable titles, archived flag), memberships (member | maintainer | owner), sections, contributions (raw_text always kept; draft | organizing | ready_to_review | shared | failed; organized payload jsonb), shared_notes (current version pointer), note_versions (immutable snapshots with contributor, correction contributor, reviewing maintainer), revision_proposals (pending | accepted | revision_requested | declined; selected excerpt, proposed text, explanation, source), proposal_events, attachments. RLS on every table via security-definer helpers `is_pot_member` / `is_pot_maintainer`; contributions author-only until shared; proposals visible to proposer + maintainers. RPCs: `lookup_pot_by_code` (safe fields only), `join_pot_with_code` (idempotent), `create_pot` (code collision retry), `regenerate_class_code` (owner), `share_contribution`, `decide_proposal` (atomic accept). Storage bucket for attachments, member-scoped. Auth email confirmation off. Dev-only seed "Biology 101"; never applied to production.

Verify: anon key gets zero rows from direct selects but `lookup_pot_by_code` works; member sessions scoped to their Pots; security advisors clean. Record outputs here.

## Step 3: Join flow, auth, create Pot

Status: [done] 2026-08-19. All 8 e2e tests green. Browser Supabase traffic rides a same-origin rewrite in dev (lesson 004); RLS-vs-filter bug fixed (lesson 005).

Wire the landing code hero to the lookup; `/join/[code]` Pot preview with the four account-status branches; `/login` + `/signup` (display name, email, password) preserving the pending join and finalizing it server-side; `/pots/new` creating a Pot and showing the code with copy + invite link; proxy.ts session handling.

Verify: Playwright `join.spec` (valid code -> preview -> signup -> inside the Pot; idempotent re-join; invalid code keeps input with exact SPEC copy) and `create-pot.spec`.

## Step 4: Pot feed and shared-note detail

Status: [done] 2026-08-19. Migration 0008 (shared contributions member-readable). 11/11 e2e green; feed and note detail screenshots reviewed.

Pot-level shell wired to real data; `/p/[potId]` feed (intro banner, vitals, shared-note cards, section filters, empty states); `/p/[potId]/s/[sectionId]`; `/p/[potId]/n/[noteId]` (organized default in Source Serif, key takeaways, attribution, attachments, Original toggle, History link, Suggest correction).

Verify: Playwright `feed.spec` against the dev seed.

## Step 5: Role-based dashboard (priority)

Status: [done] 2026-08-19. 15/15 e2e green; member and maintainer screenshots reviewed; Continue powered by last_seen_note_id.

`/home` per decision 005: member study desk (drafts, revision-requested proposals), maintainer cross-Pot review module with deep links, Pot cards with stats + Continue, recent activity across Pots, inline join + create. Server-side permission scoping for every module.

Verify: Playwright `dashboard.spec` with two contexts (member sees no review module and cannot fetch maintainer data directly; maintainer sees cross-Pot pending reviews; Continue deep links work).

## Step 6: Contribution loop

Status: [done] 2026-08-19. 13 unit + 19 e2e green; composer screenshots reviewed; suggestion never auto-applies after "Not sure".

Organizer provider + `DeterministicOrganizer` in `web/lib/organizer/` with unit tests; `ClaudeOrganizer` stub behind env. `/p/[potId]/contribute`: Write anything (SPEC copy verbatim, autosave, uploads + links), optional section step, in-place organizing state with honest stages + failure path (Try again / Edit manually / Save draft), review step (two columns, tabs under 900px, full editing), Share with class -> success -> feed immediately. `/me/contributions` (Shared / Drafts / Proposals).

Verify: vitest organizer tests; Playwright `contribute.spec` (full loop, draft persists reload, failure path, section skip, attachment carried through).

## Step 7: Correction loop

Status: [done] 2026-08-19. 22 unit + 21 e2e green; guarded dev_reseed in globalSetup (migration 0009); workspace screenshot reviewed.

Word-level diff util + tests. Note detail sentence selection -> correction panel (reason chips, plain text, explanation, source) -> before/after with labeled additions/removals + provider difference summary -> Send to maintainer -> `/p/[potId]/proposals/[id]` status page (pending / accepted / revision requested with edit-and-resubmit-same-proposal / declined with reason). `/p/[potId]/review` queue + `/review/[id]` workspace (comparison, explanation, sources, provider assistance, "AI cannot publish this change. A maintainer must decide.", Accept / Request revision / Decline). Atomic accept RPC creates the credited new version.

Verify: Playwright `correction.spec` with two browser contexts covering all three outcomes.

## Step 8: Version history

Status: [done] 2026-08-19. 22/22 e2e green; timeline + comparison with full attribution trail.

`/p/[potId]/n/[noteId]/history`: timeline left, comparison right in its own scroll container, per-version attribution and sources, previous versions readable.

Verify: Playwright `history.spec` shows v1 + v2 with correct credits after the step 7 accept run.

## Step 9: Search, settings, members, frameworks, error states

Status: [done] 2026-08-19. 25/25 e2e green; lookup rate limiting documented as accepted MVP risk instead of shipping a fake limiter.

`/search` (global and Pot-scoped) over titles, summaries, content, sections, contributors, attachment names with excerpts; `/p/[potId]/settings` (rename, description, code copy/regenerate with confirm, archive/delete); `/p/[potId]/members` (roles, maintainer add/remove, member removal, leave); quiet disabled Integrations block (Google Classroom / Canvas hooks, settings only); 404/error boundaries; remaining empty states; lookup rate limiting.

Verify: Playwright `settings.spec` (search hit, regenerated code invalidates old, role gating, RLS re-checks).

## Step 10: Brand landing page with scroll stopper

Status: [done] 2026-08-19. 28/28 e2e; pinned melt sequence gated to desktop + full motion; static story otherwise; screenshots reviewed at four depths.

Expand `/` into the full landing (secondary by design, built after the core loops): code entry stays the hero; catchy human copy, no AI-sounding language; unique editorial layout; how-it-works, trust principles, create-a-Pot CTA, footer; the scroll stopper (pinned GSAP ScrollTrigger, messy raw note reorganizes into a clean shared-note card, original preserved beside it) with an explicit iteration loop: test at multiple scroll speeds, 1440/1024/860, trackpad + keyboard, reduced-motion static fallback; fix and repeat until clean.

Verify: Playwright `landing.spec` (hero join still works, pin/scrub/release correct, fallback correct).

## Step 11: Polish pass

Status: [pending]

Breakpoints 1200/1000/900 with tabbed comparisons on narrow screens; Framer Motion transitions + GSAP organizing timeline gated by prefers-reduced-motion; a11y (focus, labels, contrast in BOTH themes, keyboard through both loops); banned-copy grep (em dashes, emojis, git terms, school words, AI-speak).

Verify: screenshot sweep at 1440/1024/860 in light and dark; clean grep; reduced-motion run.

## Step 12: Consistent bug pass

Status: [pending]

Full e2e suite + manual pass of every SPEC final-standard flow + adversarial review of the whole diff. Log every issue, fix, re-run; repeat until a completely clean pass. Keep lessons in `memory/lessons/`.

## Step 13: Single Netlify deploy and deliverables

Status: [pending]

ONE production deploy to meltingpot.netlify.app or nearest available. Env: Supabase URL + anon key public, service role server-only secret. Production stays clean: live smoke test creates a temporary account + Pot, runs join/contribute/correction, then deletes the Pot. README for judges (live URL, screenshots, local setup, architecture, MIT). Record the live URL in memory. Decision point for the owner: flip organizer provider to Claude API for the demo or keep deterministic.

---

## Risks and mitigations

- RLS policy recursion: security-definer helper functions from the start (step 2).
- Email confirmation may need a dashboard toggle if the management API path fails: fall back to asking the owner; never ship silently broken signup.
- Netlify x Next 16 runtime: verify the official runtime supports 16 before the single deploy; if not, pin the app down to the supported Next major in a dedicated commit.
- Deterministic organizer must never look fake: honest progress states, real failure path.
- Hackathon requires meaningful AI: provider seam + review assist make the Claude upgrade a config change (step 13 decision point).

# MeltingPot MVP Execution Plan

Step-by-step build plan. Each step is independently verifiable so that when something breaks, the fault is isolated to one step. Every step ends with lint, typecheck, and build green, a commit, and a push to `claude/meltingpot-mvp-build-57aw4u`. Update the Status line of each step as work lands, and log new decisions and lessons in `memory/` as they happen.

Sources: `docs/SPEC.md` (authoritative), `docs/UX-BRIEF.md` (routes, shell, components, copy, state machines), `memory/decisions/` (stack, AI, auth choices).

Legend: [pending] [in progress] [done] [blocked]

---

## Step 0: Planning and knowledge base

Status: [done] 2026-08-19

Captured the master prompt as `docs/SPEC.md`, committed the 16 reference screens and captions to `docs/reference/`, analyzed all 16 screens and synthesized `docs/UX-BRIEF.md` (19 routes, 37 components, copy bank, state machines), initialized `CLAUDE.md` and the `memory/` knowledge base, confirmed the stack with the user, verified Supabase org access and that a new project costs $0/month, and confirmed the Figma exclusions.

---

## Step 1: App scaffold and design system

Status: [pending]

Objective: a running Next.js app with the full visual language and shell, before any data exists.

Tasks:
1. Scaffold Next.js (App Router, TypeScript, ESLint) with Tailwind in `web/`. Package manager: pnpm.
2. Install: `@supabase/supabase-js`, `@supabase/ssr`, `framer-motion`, `gsap`, `lucide-react`. Fonts via `next/font`: Inter (UI) and Source Serif 4 (long-form note bodies).
3. Design tokens in Tailwind theme per SPEC: paper background, white surface, charcoal ink, deep forest green primary, clay accent, functional success/warning/error/addition/removal/pending colors, border and radius scale.
4. Base components (specs in UX-BRIEF component inventory): Button, Card, Input, TextArea, StatusPill, RolePill, SectionPill, AvatarInitial, EmptyState, ConfirmDialog, Breadcrumb, StickyActionBar, Toast, ClassCodeInput, MetricCard, ProgressSteps.
5. App shell: TopBar (wordmark, global search, avatar menu) and LeftNav in both modes (user level and Pot level) with responsive collapse per UX-BRIEF shell spec. No-shell centered-card layout for landing/join/auth.
6. Hidden `/dev/styleguide` route rendering every component and both shell modes for visual verification.

Verification:
- `pnpm lint && pnpm typecheck && pnpm build` green.
- Playwright loads `/dev/styleguide` and screenshots it at 1440px and 900px; visually confirm tokens (no purple, no gradients).

Debug notes if broken: token issues live in one theme file; component issues are isolated to `web/components/ui/`; shell issues to `web/components/shell/`.

---

## Step 2: Supabase project, schema, and RLS

Status: [pending]

Objective: the full data layer with security enforced at the database, verified before any UI touches it.

Tasks:
1. Create Supabase project (org "Rayyan's projects", cost $0 confirmed). Record project ref in `memory/decisions/002-stack-and-hosting.md`. Wire `web/.env.local` (gitignored) and commit `web/.env.example`.
2. Migration 1 (schema): `profiles` (mirrors auth.users, display name), `pots` (unique 6-char `class_code` stored uppercase, title NOT unique, description, archived flag), `memberships` (user x pot, role: member | maintainer | owner), `sections`, `contributions` (raw_text always kept; status: draft | organizing | ready_to_review | shared | failed; organized payload as jsonb), `shared_notes` (current version pointer), `note_versions` (immutable, full content snapshot, contributor + correction contributor + reviewing maintainer attribution), `revision_proposals` (references shared_note; status: pending | accepted | revision_requested | declined; selected excerpt, proposed text, explanation, source), `proposal_events` (discussion and decision history), `attachments` (polymorphic link to contribution/version, name, kind, url). All IDs are generated UUIDs; titles are never identifiers.
3. Migration 2 (security): enable RLS on every table; `security definer` helper functions `is_pot_member(pot_id)` / `is_pot_maintainer(pot_id)` to avoid policy recursion; policies scoping every read and write to membership and role; contributions visible only to their author until shared; proposals visible to proposer and maintainers.
4. Migration 3 (RPCs, security definer, all validating `auth.uid()` where required): `lookup_pot_by_code(code)` returning only safe display fields (title, description, owner display name, member count, note count) for the pre-auth preview; `join_pot_with_code(code)` idempotent; `create_pot(title, description)` generating a unique code with retry on collision; `regenerate_class_code(pot_id)` owner-only; `share_contribution(...)`; `decide_proposal(...)` maintainer-only, accepted path creates the new version atomically.
5. Auth config: email + password, email confirmation disabled for MVP (revisit before real classroom use; noted in decision 004).
6. Storage bucket `attachments` with member-scoped policies.
7. Seed script (idempotent, in `web/scripts/seed.ts`): demo Pot "Biology 101" with sections (Week 1, Week 2, Week 3, Exam review), an owner/maintainer, three members, six shared notes with versions, one note with an accepted correction in history, one pending proposal, drafts for one user.

Verification (record actual outputs):
- As anon key with no session: `lookup_pot_by_code` works; direct `select` on pots/memberships/contributions returns zero rows.
- As seeded member session: sees own pot rows only; cannot read another pot's rows; cannot write outside role.
- Supabase advisors (security lint) report no RLS gaps on public tables.

Debug notes: every schema change is a numbered migration mirrored in `supabase/migrations/`; never edit a shipped migration, add a new one.

---

## Step 3: Auth, join flow, dashboard, create Pot

Status: [pending]

Objective: SPEC's "Joining a Pot" standard met end to end: code before Pot, Pot before account, membership preserved through auth.

Tasks:
1. Supabase SSR client setup (cookie sessions, middleware protecting `/home`, `/p/*`, `/me/*`).
2. `/` landing: hero class-code entry (6-char, auto-uppercase, case-insensitive). Invalid code shows SPEC error copy and keeps the input. Signed-in users redirect to `/home`.
3. `/join/[code]/confirm`: Pot preview from `lookup_pot_by_code` (title, description, owner, member count, activity), then the four account-status branches from UX-BRIEF: signed in + new -> join and open; signed in + member -> open; signed out -> `/login` or `/signup` with the pending code carried in the URL and sessionStorage.
4. `/login` and `/signup` (display name, email, password only), both finalizing the pending join server-side after auth and landing inside the Pot.
5. `/home` returning-user dashboard: Pot cards, recent shared notes, recent contributions, join-by-code field, Create a Pot.
6. `/pots/new`: title + optional description only; creates Pot, shows class code with copy action and invite link, opens the empty Pot.

Verification:
- Playwright e2e `join.spec`: seeded code -> Pot preview -> signup -> lands in Pot feed; membership exists; re-entering the same code just opens the Pot; invalid code keeps input and shows exact SPEC copy.
- Playwright e2e `create-pot.spec`: create -> code visible -> copy action -> empty Pot with empty states.
- Pre-flight deploy: push the scaffold to Netlify (step 10 config, minimal) to surface platform issues early; record any in `memory/lessons/`.

---

## Step 4: Pot feed and shared notes

Status: [pending]

Objective: the Pot reads as an active shared knowledge feed with seeded content.

Tasks:
1. Pot-level shell: left nav with sections, Feed, Members, Settings, maintainer-only Review with open-count badge, prominent Add contribution button.
2. `/p/[potId]` feed: intro banner, vitals row (contributors, shared notes, open corrections, class code), shared-note cards (generated title, summary, contributor, section, time, attachment count, open + suggest correction actions), section filter pills, sort, empty states.
3. `/p/[potId]/s/[sectionId]` filtered feed.
4. `/p/[potId]/n/[noteId]` note detail: organized version default with Source Serif body, key takeaways, attribution, section, attachments, Original toggle (always accessible), History link, Suggest correction action.

Verification: Playwright `feed.spec`: seeded feed renders all card fields; section filter works; note detail shows organized content and the verbatim original behind the toggle.

---

## Step 5: Contribution loop (write -> organize -> review -> share)

Status: [pending]

Objective: SPEC's core promise working end to end with the deterministic organizer.

Tasks:
1. Organizer provider interface + `DeterministicOrganizer` in `web/lib/organizer/` per `memory/decisions/003-ai-organizer.md`, with unit tests (title derivation, summary, bullets, definitions, key takeaways, keyword-based section suggestion, uncertainty preservation). `ClaudeOrganizer` stub selected by env var, not implemented.
2. `/p/[potId]/contribute`: Write anything step (SPEC heading, placeholder, and preserved-original reassurance verbatim; autosaved draft from first keystroke; optional attachments: file/image/PDF upload to storage plus link attachments).
3. Optional section step: recommended section, other sections, search, "Not sure where it belongs", skippable.
4. Organizing state: in-place staged progress (Original preserved -> Structuring the idea -> Creating a summary -> Suggesting placement) with honest timing, cancel back to draft, and the SPEC failure state (Try again / Edit manually / Save draft) reachable via a test hook.
5. Review step: two-column Organized vs Original (tabs below 900px), inline editing of title/summary/body, change section, organize again, save draft, cancel; "Only you can approve what gets shared."; Share with class.
6. Share: creates shared note + version 1, success state with credit, section, preview, timestamp, link; note appears in feed immediately. `/me/contributions` with Shared / Drafts / Proposals tabs.

Verification:
- Organizer unit tests green (vitest).
- Playwright `contribute.spec`: full loop from feed to shared note visible in feed with attribution; draft persists across reload; failure path shows SPEC copy and preserves the draft; skipping section works.

---

## Step 6: Correction loop (suggest -> before/after -> maintainer decision)

Status: [pending]

Objective: corrections never publish directly; maintainer decisions create attributed versions.

Tasks:
1. Word-level diff utility with tests (additions/removals with text labels, never color alone).
2. Note detail: sentence selection -> `/p/[potId]/n/[noteId]/correct`: existing note context, selected content, reason chips, plain-text correction field, optional explanation and supporting source.
3. Before/after screen: current vs suggested side by side, highlighted additions/removals, reason, source, provider-generated summary of the difference; Send to maintainer.
4. `/p/[potId]/proposals/[proposalId]` contributor status page: pending (reviewer, timeline), accepted, revision requested (feedback, edit and resubmit the same proposal), declined (reason, preserved history).
5. `/p/[potId]/review` maintainer queue (open/decided) and `/p/[potId]/review/[proposalId]` workspace: full comparison, proposer explanation, sources, provider review assistance (what changed, possible overlap/conflicts), discussion history, "AI cannot publish this change. A maintainer must decide.", actions Accept / Request revisions (feedback required) / Decline (reason required).
6. Accept path (atomic RPC): new version, note updated, previous versions preserved, original contributor + correction contributor + reviewing maintainer all credited.

Verification: Playwright `correction.spec` covering all three outcomes with two browser contexts (member proposes, maintainer decides): accept updates the note and history; revision request allows editing and resubmitting the same proposal; decline preserves the proposal with its reason.

---

## Step 7: Version history

Status: [pending]

Objective: full attribution trail per SPEC.

Tasks:
1. `/p/[potId]/n/[noteId]/history`: chronological timeline (left) and version comparison (right, own scroll container), per-version attribution (contributor, correction contributor, reviewing maintainer, timestamp, sources), previous versions readable in full.

Verification: Playwright `history.spec`: after the step 6 accept run, history shows version 1 and version 2 with correct credits and a working comparison.

---

## Step 8: Search, settings, members, error states

Status: [pending]

Tasks:
1. `/search` (and Pot-scoped search): Postgres full-text across note titles, summaries, content, sections, contributor names, attachment names; results show section, contributor, matching excerpt.
2. `/p/[potId]/settings`: rename, edit description, class code display with copy / regenerate (confirm dialog; old code invalid immediately), archive and delete (owner only, confirm).
3. `/p/[potId]/members`: roster with roles, add/remove maintainer (owner), remove member, leave Pot. A quiet "Integrations" settings block with a disabled Google Classroom / Canvas hook (framework only, never in main nav).
4. Global 404 / error boundaries and remaining empty states; rate limiting on the code lookup endpoint.

Verification: Playwright `settings.spec`: search finds a seeded note by content word; regenerated code invalidates the old one (old code lookup fails, new one works); non-owner cannot see owner controls; RLS re-checks still pass.

---

## Step 9: Polish pass (responsive, motion, a11y, copy)

Status: [pending]

Tasks:
1. Responsive behavior per UX-BRIEF (1200 / 1000 / 900 breakpoints, tabbed comparisons on narrow screens, collapsible nav).
2. Framer Motion page/card transitions; GSAP timeline for the organizing sequence; all gated by prefers-reduced-motion.
3. Accessibility: focus states, labels, aria on status pills (text + color), keyboard path through both core loops, contrast check on tokens.
4. Copy audit: grep the codebase for banned patterns (em dashes, emojis, "merge", "fork", "pull request", "branch", "commit", school/organization words) and fix.

Verification: Playwright screenshot sweep at 1440/1024/860 across the main routes; the banned-pattern grep returns clean; reduced-motion run shows no animation.

---

## Step 10: Deploy and hackathon deliverables

Status: [pending]

Tasks:
1. Netlify site config (`netlify.toml`, Next runtime), env vars (Supabase URL + anon key, service role as server-only secret), deploy, custom site name.
2. Live smoke test: full join flow + contribution loop against the seeded pot on the live URL.
3. README rewrite: what MeltingPot is, live URL, screenshots, local run instructions, architecture summary, license note (MIT already present). Record the live URL and final config in `memory/`.
4. Revisit decision 003 with the user before submission: flip organizer provider to Claude API for the demo, or keep deterministic.

Verification: live URL loads; join + contribute loop passes on production; README instructions reproduce a working local setup from scratch.

---

## Risks and mitigations

- RLS policy recursion (memberships referencing memberships): use security definer helper functions from the start (step 2).
- Netlify x Next.js runtime surprises: pre-flight deploy moved early, into step 3.
- Email confirmation cannot be disabled via the MCP tools: fall back to the Supabase management API, or ask the user to flip the dashboard toggle; do not ship a flow that silently breaks signup.
- Supabase free tier allows limited active projects: only one is active now; creating ours is within limits at $0.
- Deterministic organizer must never look fake: progress states reflect real steps, output is honest restructuring only, and the failure state is a real path.
- Hackathon requires meaningful AI: the provider seam plus review-assist keeps the upgrade to a live model a config change (see step 10 task 4).

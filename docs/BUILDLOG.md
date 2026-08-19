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

## Step 3: Join flow, auth, create Pot (2026-08-19)

- Built: Supabase SSR clients + proxy.ts session gate; landing with in-place code validation (invalid code keeps input, exact SPEC copy); /join/[code] Pot preview with the four account-status branches; RPC-backed signup and sign-in preserving the pending join; /pots/new create flow with code + copy + invite link; minimal /home (expanded in step 5); placeholder Pot page.
- Bug found by e2e: browser-side Supabase calls hung. Root cause: the egress proxy resets ALL browser TLS handshakes (CONNECT succeeds, reset lands after Chromium's ClientHello; openssl passes; Node fetch passes without any proxy). Fix: same-origin /supabase rewrite through the Next server in dev/test; production talks direct (lesson 004). Playwright needs no proxy config.
- Bug found by e2e: /join/[code] 500ed because normalizeClassCode lived in a "use client" module; moved to lib/class-code.ts (server-safe).
- Bug found by React key warnings: getUserPots returned all four members of the pot because the memberships select policy intentionally exposes the roster; queries must filter user_id themselves (lesson 005). Dashboard was showing four copies of Biology 101 with other people's roles.
- Test-only fix: Next's route announcer duplicates heading text; assert on role=heading.
- Verified: lint, typecheck, build green; all 8 e2e tests pass (invalid-code keeps input; full new-student join -> preview -> signup -> inside the Pot; existing-member re-join; protected-route redirect; create Pot with code + copy + open; styleguide both themes; landing hero).

## Step 4: Pot feed and note detail (2026-08-19)

- Migration 0008: shared contributions become member-readable (the SPEC requires the original of a shared note to stay accessible to the class; author-only visibility was correct only pre-share).
- Built: Pot data layer (context, feed with per-contribution attachment counts, note detail with blocks parser); PotShell with render-prop context; feed with vitals row (contributors, notes, open corrections, class code + copy), section pills, note cards (title, summary, contributor, time, section, attachment count, version pill, Open + Suggest correction); section-filtered feed; note detail with serif block renderer (paragraph, heading, bullets, definition, example), clay takeaways card, Organized | Original tabs, attribution with correction credit, History link.
- Fixed during e2e: exact member-count assertion was brittle against accumulated e2e users; cleanup taught that pots.owner_id restricts profile deletion (delete owned pots first when scrubbing users; good guard in production).
- Verified: 11/11 e2e green after reseed; screenshots of feed and note detail reviewed against the design direction (serif reading surface + labeled definition/example blocks land as the signature; vitals and cards scan cleanly).

## Step 5: Role-based dashboard (2026-08-19)

- Built the priority surface: needs-attention modules lead (maintainer cross-Pot review queue with amber accents and named proposers; member revision-requested list; resumable drafts), Pot cards with stats (members, notes, open corrections, last activity) plus a Continue deep link driven by memberships.last_seen_note_id (recorded by a client effect + server action on note view), cross-Pot activity rail, inline join card. Greeting line states the pending review count for maintainers.
- Interim pages added so nothing dead-ends before steps 6-7: real review queue listing (open + decided, maintainer-gated with 404 for members), read-only proposal view, composer placeholder.
- Deductions from failures: tsconfig target had to move to ES2022 for regex /s in specs; Playwright getByRole name matching is substring by default ("Exam review" matched "Review"), and identical nav + card link names need role="main" scoping.
- Verified: 15/15 e2e including two-context role checks (member never sees the review module and gets a 404 on direct /review navigation; maintainer leads with the queue and reaches the proposal), Continue deep-link round trip, and dashboard screenshots reviewed for both roles.

## Step 6: Contribution loop (2026-08-19)

- Organizer provider seam: deterministic implementation (filler stripping, versus-phrase titles, definition and fact-run detection, explicit bullet parsing, takeaway markers, uncertainty preserved as a visible "Still to confirm" paragraph, keyword section suggestion) + Claude slot behind NEXT_PUBLIC_ORGANIZER_PROVIDER. 13 unit tests including a no-invention property test (every output word traces to the input).
- Composer flow: write step with SPEC heading/placeholder verbatim, autosave from first keystroke, file uploads to storage and link attachments with removal; optional section step with recommendation, search, and a first-class "Not sure" path; honest staged organizing state with cancel-to-draft and the real failure state (typed OrganizeError; [[fail-organize]] test hook); review step with original-beside-organized columns, full editing (title, summary, body round-tripped through a plain-text block syntax, takeaways), placement select that never silently applies the suggestion; share via the atomic RPC; success state; /me/contributions with Shared / Drafts / Proposals tabs.
- Design decision honoring "AI must not silently decide": after "Not sure", the review select stays on "No section yet" with the suggestion only labeled, never preselected.
- Bugs fixed: React set-state-in-effect lint (indicator moved to the change handler); three strict-mode/test-data issues (route announcer, accumulated notes from earlier runs -> floor assertions + reseed).
- Verified: 13/13 unit, 19/19 e2e (full loop with edit + share + feed presence + original intact, draft autosave/resume, failure path with all three exits, link attachment carried to the shared note), build green; write/section/organizing/review screenshots reviewed.

## Step 7: Correction loop (2026-08-19)

- Diff layer: LCS word diff with labeled added/removed segments, honest word-count summaries, block-aware sentence replacement that returns a conflict (null) when the selection no longer exists, and sentence splitting for the picker. 9 new unit tests (22 total).
- Correction flow: tap-to-select sentences on the serif note body, reason chips, plain-text correction with optional explanation and source, then a before/after stage with labeled cards, marked-up diff, and the honest change summary; Send to maintainer records the submitted event.
- Proposal lifecycle page for the proposer: pending/accepted/revision-requested/declined banners, maintainer feedback and decline reasons quoted, edit-in-place that resubmits the SAME proposal (RPC preserves history), full event timeline, boundary statement.
- Maintainer workspace: labeled Current/Suggested comparison, marked-up diff, the selected sentence highlighted in the full note context, proposer reasoning, rule-based review assistance (change summary, conflict detection that disables Accept when the selection is stale, overlap hint, source presence) under the "AI cannot publish this change" boundary, decision bar with Accept / Request revisions (feedback required) / Decline (reason required). Accept applies the replacement client-side and the atomic RPC creates the dual-credited version.
- Bugs found and fixed: three flaky failures traced to cross-run test data (lesson 006) -> guarded dev_reseed() in Playwright globalSetup; a real product race where autosave + attach created two contribution rows and lost the attachment (lesson 006) -> in-flight promise guard.
- Verified: 22/22 unit, 21/21 e2e including both two-context decision paths; workspace screenshot reviewed (labeled diff cards, assistance, decision bar all land).

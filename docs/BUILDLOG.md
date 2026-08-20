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

## Step 8: Version history (2026-08-19)

- History data loader with per-version attribution (contributor, correction contributor, reviewing maintainer, source, change summary); two-pane view: selectable timeline left (Current pill, attribution lines, "Every version stays visible. Nothing is silently overwritten."), readable version right with its blocks and takeaways, plus a marked-up "Changes from version N-1" diff card using the stored change summary.
- Spec deduction: paragraph blocks render as separate DOM nodes, so cross-paragraph regexes never match; assert on exact block text instead.
- Verified: 22/22 e2e green (full suite with reseed).

## Step 9: Search, settings, members, frameworks, errors (2026-08-19)

- Search across the user's Pots: note titles, summaries, body text, contributor names (server-filtered with excerpt extraction and term highlighting), section names, attachment names (shared notes only); Pot-scoped via the topbar inside a Pot with a one-tap widen to all Pots; empty and no-match states.
- Settings: owner edits identity, everyone sees and copies the class code, owner regenerates with a confirm that names the consequence; archive and delete (confirmed, cascade); non-owners get Leave this Pot; Integrations block ships the Google Classroom and Canvas hooks disabled, settings-only per SPEC.
- Members: roster sorted by role, owner promotes/demotes via set_member_role, maintainers remove members, confirm dialog notes that credit survives removal.
- Root not-found and error boundaries in product voice.
- Rate limiting on the code lookup deliberately NOT faked: a per-instance in-memory counter on serverless would be security theater; recorded as an accepted MVP risk to revisit with real infrastructure (documented here rather than shipped broken).
- Bugs fixed along the way: attachments->pots relationship missing from the hand-maintained DB types; dev_reseed failing after code regeneration because the seed wipe keyed on the mutable class_code (migration 0010 wipes by owner email); two Playwright races (count() does not auto-wait; assertions running before navigation commits) plus an exact-match assertion against a composite text node.
- Verified: 25/25 e2e, build green.

## Step 10: Brand landing with scroll stopper (2026-08-19)

- Landing per decisions 005/006: code entry stays the hero beside a serif display headline ("Everything your class knows, in one Pot."), clay eyebrows, trust bullets; then the scroll stopper; then a genuinely-sequential three-step walkthrough (numbering earns its place), three trust-principle cards mirroring the product boundaries, a forest-green CTA band, and a quiet MIT footer. Copy audit: no AI-speak, no em dashes, no emojis.
- Scroll stopper: pinned GSAP ScrollTrigger timeline (scrub 0.6, +=1700) melts the rough ATP note into an organized card: raw slides from center into its "What you type" slot, then title, summary, definition block, bullets, and clay takeaway stagger in while the four-stage rail lights up, ending on the "Only you can approve what gets shared" pill. The caveat line ("Still to confirm: krebs cycle location, flagged from your 'i think'") demonstrates uncertainty preservation right on the landing.
- Iteration findings: the pinned sequence requires the two-column md layout, so the animation is gated to (min-width: 768px) and (prefers-reduced-motion: no-preference); small screens and reduced motion render the finished story statically (verified with a reducedMotion browser context). Approval pill given tail room so the finished state holds before the pin releases. Screenshots reviewed at four scroll depths.
- Verified: 28/28 e2e (landing hero validation, pin/scrub/build assertions at depths, reduced-motion static path), build green.

## Step 11: Polish pass (2026-08-19)

- Copy audit grep came back completely clean on the first run: no em dashes, no emojis, no git terms in UI strings, no AI-speak, no school or organization language.
- Contrast: faint meta text was ~3.2:1 on paper; --ink-faint darkened to #7d7767 (light, ~4.6:1) and brightened to #8f8877 (dark) so small metadata passes AA in both themes.
- Responsive sweep at 1440/1024/860 across home, feed, note, and composer, plus dark-theme home and feed: nav collapses to the drawer below lg with the FAB present, vitals wrap cleanly, cards hold their hierarchy at 860. Sweep also confirmed the note page intentionally relies on the drawer for Add contribution below lg.
- Motion: one Framer Motion moment added (the success settle on Shared with the class), joining the organizing checklist and the landing melt as the app's three orchestrated moments; useReducedMotion renders it statically, and global CSS still zeroes all animation under prefers-reduced-motion.
- Verified: 22/22 unit, 28/28 e2e, build green after all changes.

## Step 12, round 1: Adversarial bug pass (2026-08-19)

Ran a 32-agent five-lens adversarial review (security, correctness, spec compliance, state machines, UX states) with per-finding skeptic verification. 27 findings confirmed, zero rejected as noise. All 27 fixed in this round.

Security (migrations 0011 rpc_publish_guards + 0012 rls_hardening, applied and mirrored):

- share_contribution never checked current membership, so a removed or departed member could still publish into the Pot; it also ignored archived_at. Now raises not_pot_member / pot_archived, and the composer maps both to plain-language errors.
- contributions_update RLS re-validated nothing about the mutable pot_id, letting an author relocate a draft into any Pot by UUID and (with the hole above) inject notes cross-Pot. WITH CHECK now requires is_pot_member(pot_id).
- attachments_insert (table and storage) skipped the status guard, so new files/links could be attached to already-shared notes without review; storage delete let authors destroy files behind published notes. All three policies now require the contribution to be unshared.
- proposal_events_insert accepted any event kind, letting a proposer forge "accepted" history entries. Client inserts are now limited to comment, plus submitted by the proposer; decision kinds only come from the RPCs.
- decide_proposal published client-computed content with no staleness check: two review tabs could silently revert an accepted correction. Accepts now lock the note row, take p_expected_version_id, and verify the selected sentence still appears; conflicts surface as "the note changed while this page was open" with a refresh.
- resubmit_proposal gained the same membership guard.

Correctness (organizer and diff library):

- body_text was space-joined, so sentences could span blocks; the correction picker then offered selections replaceInBlocks could never find, producing a false "note has changed" conflict with accept permanently disabled. Blocks and bullet items now join with newlines, selectable sentences split on newlines too, and a unit test locks the invariant that every selectable sentence is replaceable.
- replaceInBlocks used String.replace, so $$ and $& in a proposed correction were interpreted as substitution patterns, and only the first occurrence of a repeated sentence was corrected while the picker highlighted all of them. Replacement is now literal and covers every occurrence; the review workspace marks all occurrences in context and says how many an accept updates.
- explicitBullets dropped non-bullet lines from paragraphs mixing prose with a list ("things the exam covers" above three dashes vanished). Paragraphs now segment into bullet and non-bullet runs first.
- tokens() stripped every non-ASCII character, so notes in Arabic, Chinese, or any non-Latin script were rejected as "too short" regardless of length. Tokenization is Unicode-aware and the length gate no longer depends on space-delimited words alone.
- A note where every sentence matched an uncertainty marker produced an empty summary rendered as a blank line; the summary now falls back to the uncertain sentences, and empty summaries are not rendered.

Product and UX:

- File attachments linked to /api/attachments/... with no such route: every uploaded file 404ed. Added the route handler (viewer-scoped storage download, so bucket RLS decides access) and per-segment path encoding.
- The review-before-sharing step omitted attachments and contributor identity, both required by the SPEC; it now shows removable attachment chips and "Shared as {name}".
- There was no way to create, rename, reorder, or delete sections anywhere, leaving the whole section system inert in real Pots. Settings now has a maintainer sections panel (add, rename, up/down reorder, delete with a confirm naming the consequence), covered by a new e2e test.
- Archiving was a dead end: pots vanished from every list with no unarchive anywhere. Settings shows an archived banner and an Unarchive button for owners, and the dashboard lists archived Pots in a collapsed group.
- A signed-in user following a dead invite link was silently bounced to /home with no message; the failure now lands next to the dashboard join field with the code prefilled.
- Autosave reported "Saved" without checking the write (including the zero-rows RLS case); it now verifies the row came back and shows "Couldn't save. Your next keystroke retries." A failed first save also no longer poisons the composer: the creation guard clears and retries instead of leaving Continue silently dead.
- Dashboard drafts and revision-requested lists included Pots the user had left (dead links), and stats were computed by fetching every row (silent truncation at PostgREST's 1000-row cap). Queries are membership-scoped and stats use per-Pot head counts; /me/contributions is membership-scoped the same way.
- decided proposals showed proposer-voiced banners to the maintainer who decided ("credited to you"); copy now branches on the viewer.
- Sending a correction while signed out left the button stuck on "Sending" forever (same in leave Pot); both now release and explain.
- Detaching an uploaded file now also removes the storage object so nothing orphans.

Verified after all fixes: lint and typecheck clean, 31/31 unit (9 new regression tests), 29/29 e2e (new sections test), production build green, Supabase security advisors show only the known intentional WARNs (security-definer RPCs that validate their callers; dev_reseed remains until the pre-deploy cleanup).

One transient: dashboard.spec "review queue is not reachable" failed once on the 404 navigation in a full run and passed on isolation and on the full re-run; watching for recurrence.

## Step 12, round 2: Visual and UX pass on the round 1 surfaces (2026-08-19)

- Screenshot review (light + dark, 1440px) of the sections panel, the review step with attachments and identity, the archived settings banner, the dashboard archived group, and the dashboard join error: all render cleanly; dark keeps the warm undertone.
- Flaw found and fixed: an archived Pot still offered "Add contribution" in the Pot nav and feed even though sharing there is now refused. The nav shows a quiet "Archived: readable, closed to new notes." note instead, the header says "archived", and the feed drops its contribute buttons with archived-aware empty-state copy.
- The throwaway screenshot spec became a permanent e2e test: archive lifecycle (archive, collapsed dashboard group, archived banner, no contribute affordance, unarchive restores it, delete cleans up).
- Two test-robustness fixes from full-suite flakes: the dashboard Continue test reload-polls instead of racing the client-side last-seen write, and the sections member check navigates by URL because link-text navigation is ambiguous when the drafts module also names the Pot (the same ambiguity produced a false composer-reset alarm during the visual pass; the app was fine, the test had clicked a seeded draft row).
- Verified: 30/30 e2e, lint, typecheck, build green.

## Step 12, round 3: Self-review of the fix diff (2026-08-19)

- Adversarially re-read the round 1 and 2 diff. Two refinements came out of it: DiffText renders with pre-line whitespace so the version-history diff shows block boundaries now that body_text is newline-joined, and a lone dashed line after run segmentation becomes a one-item list instead of a dash-prefixed paragraph (segmentByBulletRuns keeps runs homogeneous, so a single bullet line is unambiguous list intent; new unit test).
- Confirmed non-issues while reviewing: the replaceInBlocks swap helper only marks replacement after a containment check; the archived guard does not block corrections (archive freezes new notes and joins, review keeps working); me/contributions with zero memberships correctly shows empty tabs; the attachments route adds no authority beyond the viewer's own storage access.
- Verified: 32/32 unit, lint, typecheck, 30/30 e2e full run, build green.

## Step 13: Single production deploy and deliverables (2026-08-19)

- Pre-deploy cleanup (migration 0013): deleted every dev-seed account and Pot and dropped dev_seed/dev_reseed, so production launched with zero rows and no way for a signed-in user to rebuild seed data. The attachments bucket was verified empty (storage tables refuse direct SQL deletes).
- Netlify site created as meltingpot-io ("meltingpot" is taken platform-wide); env vars set before any deploy: the direct Supabase URL and the anon key. No service role key exists in the deployment; RLS and the security-definer RPCs are the enforcement layer.
- The deploy itself needed two fixes, both recorded in decision 008: the MCP zip deploy only excludes top-level node_modules, so deploying from the repo root died on upload (500); deploying web/ as the package root fixed that. Then the first successful build published the raw .next directory as static files because zip deploys do not auto-inject the Next.js runtime; declaring @netlify/plugin-nextjs in web/netlify.toml fixed the 404s.
- Post-deploy smoke test (Node, against the live URL and the production Supabase API, since this container blocks browser TLS): landing with the brand promise and join hero, login page, protected-route redirect, register_student, password sign-in, create_pot, anonymous code lookup, hosted join page showing the Pot before any account, draft, share_contribution, revision proposal, decide_proposal accepted with the expected-version check, two credited versions, outsider blocked by RLS from reading and from publishing, owner deletes the Pot. All checks passed. The temporary smoke accounts were removed afterward; every table and the storage bucket verified at zero rows.
- Deliverables: judge-facing README at the repo root with the live URL, real product screenshots, the AI seam explanation, stack, repo map, and local setup; decision 008 records the deployment shape and the owner's open decision point (organizer stays deterministic; NEXT_PUBLIC_ORGANIZER_PROVIDER=claude selects the Claude slot later).

## Round 2 requested by the owner: hardening and de-vibe-coding (2026-08-19)

- Database-enforced rate limiting (migration 0014): every privileged RPC now consumes a fixed-window limit inside Postgres, per user for authenticated actions and per IP for anonymous ones (code lookup 60 per 10 minutes, registration 20 per hour, sharing 60 per hour, decisions 120 per hour, and so on), and the client-writable tables (contributions, revision_proposals, proposal_events, attachments, sections) carry per-user insert limits via triggers. Enforcement lives in the database, so it holds no matter what client calls; the dev seed functions bypass it with a transaction-local flag. Every rate-limited surface shows plain-language "wait a moment" copy instead of a generic failure.
- Endpoint closure (migration 0015): the anonymous role lost all table access (its entire surface is now the code lookup, registration, and sign-in), and authenticated lost every write verb the app does not use: shared_notes and note_versions are RPC-only, profiles are read-only, proposals and their events cannot be edited or deleted directly, contributions cannot be deleted, memberships and pots cannot be inserted directly. Verified against a complete code audit of the app's direct table writes.
- Landing de-vibe-coded: the hero now fills the first viewport with a larger serif headline, wider gaps, and roomier trust bullets; the join card is labeled "For students" with a "Teaching a class? Create a Pot" line beneath it, making the two roles' paths explicit at the top of the page. Section rhythm is consistent and generous (py-24 to py-36), steps and trust cards got bigger gaps and padding, and the closing CTA band grew into its space.
- Role-aware dashboard: plain members (students) no longer see the header "Create a Pot" button (it stays in the nav and for maintainers and empty dashboards), and their right rail leads with the class-code join card; maintainers (teachers) lead with activity. The feed's duplicate "Add contribution" button hides on large screens where the nav already carries it, and keeps serving small screens where the nav is in the drawer.
- Dev seed functions temporarily restored on the production project (owner directed a single database) so the e2e suite can run; they will be dropped and wiped again before this round closes.
- Verified: 32 unit, 33 e2e (including new screenshot checks), lint, typecheck.

## Round 2 bug pass: six-lens adversarial review (2026-08-19)

Ran a fresh six-lens adversarial review (functional, ux-flows, visual, a11y, security, data-layer) over the whole tree after the hardening and de-vibe-coding changes. It surfaced 50 candidate findings; verification confirmed the substantive ones. Fixed every critical, major, and clearly-real functional or overflow finding:

- Rate limits were too tight for a whole class behind one school NAT (a class shares one IP): registration raised to 200/hour per IP, code lookup to 400/10 minutes, join to 120/hour. Every rate-limited path shows plain wait copy.
- Join preview no longer reports a rate-limited or failed code lookup as an invalid code; the landing and home distinguish notfound / busy / error.
- Post-signup join failures (rate limit, or the Pot archived or its code changed since the preview) are surfaced to the user instead of silently dropping them on /home.
- File uploads work end to end: ASCII-safe storage keys (unicode file names were rejected), the real name rides on the row and returns as the download filename, and HEIC/HEIF from phone cameras is accepted alongside the vision-model image set. Proven by an e2e test uploading an Arabic-named PNG through share and download.
- Text overflow: a global overflow-wrap/word-break rule plus min-w-0 and break-words on every user-content title, SectionPill truncation, and section-step button truncation. An overflow assertion confirms no page scrolls horizontally with a 90-character unbroken title and URL.
- A draft that reached review resumes at the review step with its organized result intact, instead of restarting at write and re-organizing.
- The "Open corrections" vitals number is pot-wide for every role via a security-definer count (migration 0018); it previously showed a member only their own pending proposals on the feed and dashboard.
- Attachment reads scoped to shared-or-own so a member cannot download another member's unshared draft files (migration 0017).
- /dev/styleguide 404s in production via a dev-only route layout; a stale section URL 404s instead of a misleading empty-Pot state; clearing the composer no longer sticks on "Saving"; an archived-only dashboard still shows the archived group; title and summary gain length caps.

Documented, not fixed this round (feature gaps or minor polish, no security or data-loss impact): no password recovery (a consequence of the custom-RPC registration that bypasses the rate-limited GoTrue mailer), no maintainer "manage shared notes" surface, no discard-draft action, no loading states, search hidden below the sm breakpoint, greeting computed in server time, login/signup cross-links dropping the next destination, and a set of a11y refinements (focus management on step changes, sr-only diff labels, dialog names, a few AA contrast ties). client_ip() keys per-IP limits off X-Forwarded-For, which is best-effort for anonymous callers; per-user limits are the real enforcement.

Verified: 32 unit, 35 e2e (new upload, resume-at-review, and overflow checks), lint, typecheck, build.

## Round 2 close-out (2026-08-19)

- The six-lens workflow's final result added one major finding: the version-history word diff ran an unbounded O(n*m) LCS over two whole note bodies, so a large note plus one accepted correction could allocate gigabytes and hang the History page for every member. Fixed by trimming the shared prefix and suffix before the DP table (a one-word correction on a long note is now near-free), falling back to a whole-block replace above a cell budget, memoizing the diff, and length-bounding the review Body editor. Two unit tests cover the cheap-edit and huge-rewrite paths.
- Production data note: the live site already had real usage, a "Quran 12th Grade" Pot with a shared note and two real accounts, created after launch. All dev-seed and smoke-test data was removed and the dev seed functions dropped again, but the real Pot was left untouched. Final production state: two real users and their one Pot, zero test data, dev functions absent, rate-limit counters cleared.
- Security advisors after hardening: only expected items remain, namely the security-definer RPCs (each validates and now rate-limits its caller), the rate_limits table as an intentional deny-all (RLS on, no policy, no grants, reachable only by the definer functions), and the pre-existing leaked-password-protection toggle the owner can enable in the Supabase dashboard.
- Redeployed to meltingpot-io.netlify.app after the round-2 changes; the live smoke test passed all 19 checks against the hardened stack, and the live landing serves the new student/teacher split.

Known follow-ups, documented not built (feature gaps or minor polish, no security or data-loss impact): password recovery, a maintainer manage-shared-notes surface, discard-draft, route loading states, mobile search entry, timezone-correct greeting, preserving the post-login next destination through the auth cross-links, and a set of a11y refinements (focus management on step changes, sr-only diff labels, dialog names, a handful of AA contrast ties). client_ip() keys per-IP limits off X-Forwarded-For, which is best-effort for anonymous callers; the per-user limits are the real enforcement.

## Brand rework: orange on cream, the pot-and-m mark, and the mock hero (2026-08-19)

- The owner supplied a new brand: an app icon (orange pot, lowercase m knockout, liquid blobs, cream tile) and a hero mock (serif "Many ideas. One shared knowledge base." headline, nav with Home, Spaces, Explore, Sign in, and a dark Get started pill, orange Get started CTA with Learn more, giant pot illustration bleeding off the hero's bottom edge). Recorded as decision 010; supersedes the green palette.
- The icon and hero pot were recreated as hand-drawn SVGs (components/brand/pot-mark.tsx, app/icon.svg) so the mark stays crisp from favicon size to the hero and the repo carries no binary source assets. favicon.ico and apple-icon.png are rasterized from the SVG. The wordmark is the mark plus lowercase "meltingpot" in Baloo 2.
- Every color flows from the token block, so swapping the palette in globals.css recolored the entire app in both themes: cream paper, warm white surfaces, near-black ink, brand orange primary, warm dark variant. Buttons became pills. Fraunces carries display headlines; Source Serif 4 stays on note bodies.
- The hero matches the mock's layout, spacing, and CTAs; the code-entry card moved one anchor below (id spaces, where both hero CTAs and the nav's Get started land) so the no-login-wall promise survives the visual change. The mock's "teams" copy became "classes" and its em dash was dropped, per the product's copy rules.
- Iterated the pot art against the reference by screenshot: first pass had a drum-like white mouth and floating steam; the rebuilt geometry pours a tall steam column from inside the rim, clipped by the front lip, with the heavy drop falling back in.
- Light-theme faint text darkened to hold AA on the lighter cream. Deliberate trade on the record in decision 010: small orange links on cream sit near 3.1:1 to keep the mock's bright orange; the dark theme passes comfortably.
- Verified: 34 unit + 32 e2e green, lint, typecheck, production build; dashboard, review, and settings screenshots retaken for the README in the new brand.

## Account surface, two-step sign in, and the open landing (2026-08-20)

- The brand mark lost its background. The mouth and the lowercase m used to be painted in the page color, and app/icon.svg sat on a cream rounded tile, so the logo carried a card of its own wherever it went. Both are now real holes punched with SVG masks, and the tile is gone; the mark sits on any surface, light or dark. scripts/build-icons.mjs rasterizes the SVG into favicon.ico and apple-icon.png with transparency, so the two binaries are reproducible instead of hand-made.
- The hero pot is fully visible on first paint. Two things were cutting it: the art's own box ended at 850 while the pot's base reaches y 861, and at 1280 the stepped headline size pushed the three forced lines to four, growing the left column past the viewport. The box now runs to 872, the headline is fluid at clamp(2.5rem, 4.6vw, 4.625rem), and the art carries a max height with xMaxYMax so a short viewport scales it down instead of clipping it. Checked at 1024x768, 1280x720, 1440x900, and 1920x1080.
- Signed-in people can read the landing. It used to redirect any session straight to /home. Now only a failed invite link redirects, because /home surfaces that error next to its join field; otherwise the page renders, "Sign in" and "Get started" become one "Go to dashboard", and the account menu carries "About MeltingPot" as the route in.
- The account control moved from the top bar to the foot of the left nav, where the owner asked for it: avatar, name, and email, with a menu for contributions, settings, the landing, and log out. The top bar keeps the mark and search. The mobile drawer pins the same card to its foot.
- Theme moved into a new /me/settings. There was no account-level settings page before this one. The old icon toggle could only flip light and dark and could never hand control back to the device, so it was replaced by three visible states (System, Light, Dark) and deleted rather than left orphaned. The storage key and the pre-paint script are unchanged.
- Avatars are a person icon in one of six tints instead of initials. The old tints were mostly functional colors, so a green avatar could sit beside a green success pill; the new --avatar-N pairs are decorative only and live apart from the functional set. The tint is hashed from the display name, so a person keeps their color across every screen.
- Two-step sign in for people who run a Pot, and it actually holds. Enrolling a TOTP factor in Supabase changes nothing by itself: a password-only session is aal1 and the app would have kept letting it through. So enrolment in settings is paired with a challenge in the login form, which checks the assurance level after a correct password and stops for a six-digit code. Proven end to end by a test that plays the authenticator: it enrols, signs out, is stopped at the code step, is refused a wrong code, is let through with the right one, and turns it back off.
- The footer credits the Pixel Forge AI Hackathon with its own mark, linked to the Devpost page, trimmed of transparent padding and kept small enough to read as a credit.
- Landing copy strengthened: the hero body now leads with what the student does rather than a sentence that said "together" twice, and the class-vault section trades an abstract description for the concrete case (thirty sets of half-finished notes becoming one set worth studying from).
- Verified: 34 unit and 40 e2e green (7 new account and landing tests, 1 new two-step sign in test), lint, typecheck, production build. All four README screenshots retaken.
- Answered from the reference pack: the Pot home follows reference 03 on every structural point the caption asks for except contributor activity, which lives on the dashboard rather than inside the Pot. Not built this round because the request was a question, not a change.

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

# CODEX_DEBUG — Senior Engineering Release Audit

**Branch:** `claude/meltingpot-mvp-build-57aw4u`  
**Commit reviewed:** `203e7b203b1def96881c4a0f3335d7020442a7b9`  
**Compared with:** `origin/main` at merge base `af51184`  
**Branch delta:** 23 commits ahead; 140 files changed; +13,294 / -918 lines  
**Audit date:** 2026-08-20  
**Decision:** **Do not publish this branch yet.**

This was a hostile, release-gate review of the branch as if it were an intern's submission about to be merged into an organization's live student-facing product. The review covered application code, Supabase migrations and effective RLS/RPC behavior, authentication, AI boundaries, storage, error handling, accessibility, responsive behavior, documentation, CI, and tests. It found one critical authentication failure plus multiple high-severity security, privacy, data-integrity, cost, and reliability defects.

The branch is not low quality across the board: lint, typecheck, all 164 unit tests, the production build, and dependency audit pass. Those checks simply do not exercise the most important trust boundaries identified below.

## Severity definitions

- **Critical:** security/privacy promise is fundamentally bypassable; blocks any release.
- **High:** likely security, data-loss, privacy, billing, or core-product failure; blocks release.
- **Medium:** significant correctness, reliability, accessibility, or operational defect; should be fixed before a public launch.
- **Low:** release hygiene, documentation, hardening, or polish gap.

---

## Critical

### C-01 — Two-factor authentication is only a screen, not an enforced security boundary

**Evidence**

- `web/lib/auth/supabase-client.ts:47-60` creates a valid AAL1 Supabase session immediately after the password succeeds, then merely reports that a second factor is needed.
- `web/components/auth/auth-form.tsx:97-103,150-194` pauses only the current React form.
- `web/proxy.ts:41-55`, `web/lib/auth/supabase-server.ts:12-29`, and `web/lib/auth/server.ts:33-38` accept any authenticated user and never require AAL2.
- `web/app/login/page.tsx:16-17` redirects that AAL1 user to `/home` on reload.
- RLS policies and security-definer RPCs also accept the AAL1 JWT.
- `web/tests/e2e/two-factor.spec.ts:52-70` proves only that the form does not navigate automatically before a code is entered. It does not test reload, direct protected navigation, REST, or RPC access.

**Reproduction**

1. Enable TOTP for an account.
2. Sign out and enter the correct password.
3. Stop on the “One more step” screen without entering a code.
4. Reload `/login`, open `/home` directly, or call an authenticated Supabase endpoint with the newly issued session.
5. The application accepts the session without the second factor.

**Impact**

An attacker who knows the password receives essentially the same application and database authority as a fully verified user. The README's claim that two-step sign-in “is enforced rather than advertised” (`README.md:47`) is false.

**Required before release**

Confine AAL1 sessions to MFA completion/recovery routes; enforce the required assurance level in centralized server auth, every sensitive API/RPC, and preferably database policy. Add direct-navigation, reload, REST, and RPC tests from an AAL1 session.

---

## High severity — release blockers

### H-01 — Any Pot member can forge, overwrite, restore, or flood class-wide study material

**Evidence**

- `supabase/migrations/0027_recoverable_and_configurable.sql:112-148` exposes a `SECURITY DEFINER` `save_study_set` operation that checks only Pot membership.
- It accepts caller-controlled fingerprint, JSON payload, model name, and options; it does not recompute the fingerprint, validate schema or size, enforce `pots.study_generation`, verify that an AI generation occurred, or rate-limit the write.
- Its conflict path (`:136-145`) overwrites the class cache, clears moderation fields, and retains the previous `generated_by`, creating false attribution.
- Authenticated execution remains granted by `supabase/migrations/0026_study_sets_carry_their_settings.sql:57-58`.
- The browser calls this RPC directly at `web/components/study/study-workspace.tsx:296-313`.
- Cached JSON is returned without revalidation at `web/app/api/ai/study/route.ts:91-111` and cast directly by the client at `study-workspace.tsx:265-283`.

**Impact**

An ordinary student can bypass a maintainer-only generation policy, replace a class summary/test with arbitrary JSON, restore material a maintainer removed, impersonate the prior generator, break consumers with malformed payloads, or insert unlimited large rows under random fingerprints to exhaust database storage.

**Required**

Revoke direct authenticated execution. Save only through a trusted server operation that rechecks role and Pot policy, recomputes the current fingerprint, validates and bounds the complete payload, attributes the actual writer, rate-limits by user and Pot, and binds the save to a one-time server generation result.

### H-02 — Registration falsely verifies arbitrary email ownership and enables account farming

**Evidence**

- Anonymous callers may execute registration (`supabase/migrations/0005_auth_registration.sql:83`).
- `supabase/migrations/0014_rate_limiting.sql:161-235` inserts directly into `auth.users`, sets `email_confirmed_at`, and writes `email_verified=true` without sending or checking an email challenge.
- The client deliberately uses this path at `web/lib/auth/supabase-client.ts:35-44`.
- The endpoint distinguishes `email_taken`, enabling account enumeration.
- The anonymous limit allows 200 successful accounts per IP per hour (`0014:176`), while AI limits are only per user (`supabase/migrations/0020_attachment_analysis.sql:16-38`). Each account receives up to 60 organizer calls/hour plus other model quotas.
- Current image organization can launch up to four provider calls concurrently (`web/app/api/ai/organize/route.ts:122-166`), increasing the burst created by each farmed account.
- The product exposes no password-reset, recovery-code, or lost-TOTP recovery flow (`web/components/auth/auth-form.tsx:197-286`; `docs/BUILDLOG.md:182-193`).

**Impact**

Anyone can claim another person's unused email, impersonate that identity inside a class, and prevent the legitimate owner from registering. Account farms can multiply model spend and storage use; 200 accounts can request roughly 12,000 organizer generations per hour before retries, with no global provider budget or Pot/IP AI ceiling.

**Required**

Use GoTrue's verified signup or institutional SSO, return generic duplicate responses, add password/MFA recovery, add CAPTCHA/abuse controls, and enforce global, IP, Pot, user, concurrency, and provider-billing limits.

### H-03 — Original-note redaction and sharing are fail-open

**Evidence**

- Raw autosave ignores empty text at `web/components/contribute/contribute-flow.tsx:173-205`; clearing sensitive content does not persist the clear.
- Raw writes are not serialized or revisioned, and only organized content is flushed before navigation/share (`:244-250,485-500`).
- Share is enabled independently of the raw/organized “Saved” state (`:995-1035`).
- The Original is read-only in the final review (`:861-867`) and no unchecked confirmation explains that both Original and Organized will become visible.
- After sharing, every Pot member can open the raw Original (`web/components/pot/note-view.tsx:21-52`; `supabase/migrations/0008_shared_contribution_visibility.sql:1-10`).

**Reproduction**

Save sensitive text, clear or edit it, then organize/share while the clear/update is skipped, delayed, failed, or overtaken by an older write. The organized version can be current while an older raw Original becomes class-visible.

**Impact**

Names, private questions, or other text the author believed removed can be irreversibly disclosed to the class.

**Required**

Make Original editable/clearable in final review; persist empty strings; serialize/version all saves; block Share until the exact current raw, organized, and section revision is re-read from the database; publish through an atomic reviewed-share RPC; require an initially unchecked confirmation naming both visible versions.

### H-04 — Storage permits unlimited orphan uploads, and “permanent” Pot deletion leaves files behind

**Evidence**

- `supabase/migrations/0012_rls_hardening.sql:61-72` permits any number of distinct Storage objects under one owned unshared contribution. It requires no corresponding `attachments` row and applies no storage upload quota.
- Each object may be 10 MB (`supabase/migrations/0004_storage.sql:4-16`).
- UI upload writes Storage first, then inserts metadata; a failed row insert has no compensating delete (`web/components/contribute/contribute-flow.tsx:300-343`).
- Attachment removal deletes the row first, ignores failures, and hides the item even if object removal fails (`:345-353`).
- Pot deletion removes only the database Pot (`web/components/pot/settings-panel.tsx:138-148`; `web/components/pot/pot-manager.tsx:46-71`) while claiming everything is permanently deleted (`settings-panel.tsx:430-439`).
- Cascades remove contribution/attachment rows, but Storage is separate. The Storage delete policy then requires the now-missing contribution (`0012:74-85`), so users cannot clean the remaining objects.

**Impact**

An authenticated member can create unbounded billed storage without metadata. Deleting a Pot leaves uploaded student material provider-side, inaccessible and uncleanable, despite an explicit permanent-deletion promise.

**Required**

Use server-authorized upload finalization with one-to-one metadata, object count/byte quotas, and orphan reconciliation. Delete and verify every Storage object through a trusted deletion job before final database deletion; retain a retryable tombstone on partial failure.

### H-05 — File validation can distribute arbitrary executable content to classmates

**Evidence**

- The Storage bucket checks declared MIME metadata only (`supabase/migrations/0004_storage.sql:4-16`; `0016_attachment_photo_types.sql:6-15`).
- Attachment `name`, `kind`, and `storage_path` are independently caller-controlled (`supabase/migrations/0001_schema.sql:148-158`), and RLS does not inspect file bytes or extension (`0012_rls_hardening.sql:20-32`).
- Download uses the attachment-row filename in `Content-Disposition` (`web/app/api/attachments/[...path]/route.ts:25-42`).

**Reproduction**

Upload executable/malware bytes while declaring an allowed MIME such as `application/pdf`, insert metadata named `LectureNotes.exe`, share the contribution, and offer the resulting executable download to the class.

**Impact**

MeltingPot becomes a trusted-looking malware distribution channel.

**Required**

Quarantine uploads; verify magic bytes, detected MIME, extension, and claimed kind server-side; malware-scan/content-disarm supported formats; issue canonical filenames; serve only objects that have passed scanning.

### H-06 — “Full Pot” study generation silently omits material and serves stale caches

**Evidence**

- The route selects only the newest 50 notes (`web/app/api/ai/study/route.ts:68-79`).
- The cache fingerprint covers only that subset (`:87-90`).
- Combined source is silently truncated at 60,000 characters, possibly mid-note (`:154-164`).
- UI promises “Study from the full Pot” (`web/components/study/study-workspace.tsx:346-350`), while README says every shared-note change invalidates the fingerprint (`README.md:25-27,33`).

**Reproduction**

Create 51 notes, generate a set, then correct or remove the oldest note. The selected 50 and fingerprint do not change; the cached set remains, and the oldest note never participates. A smaller Pot with large notes is clipped at 60,000 characters without warning.

**Impact**

Students can study incomplete or outdated material while the product explicitly claims comprehensive coverage.

**Required**

Fingerprint every live source/version using pagination. Use an explicit bounded retrieval/chunking strategy for generation and disclose coverage. Add tests above 50 notes and 60,000 characters.

### H-07 — AI-generated class material is auto-published without a trust or grounding review

**Evidence**

- Generated output is normalized and immediately saved class-wide at `web/app/api/ai/study/route.ts:172-213`.
- `web/lib/mix/contracts.ts:163-208` validates shape only weakly: an invalid/out-of-range `answerIndex` silently becomes `0`; duplicate choices and source titles are not verified; normalization may produce zero cards/questions.
- The UI presents stored results as shared Pot study material without a prominent AI/incomplete warning or approval step (`web/components/study/study-workspace.tsx:439-501`).
- `sourceNoteTitle` is plain model text rather than a verified note ID/citation (`web/components/study/flashcard-session.tsx:232-236`; `practice-session.tsx:434-440`).

**Impact**

Hallucinated explanations, incorrect answer keys, or fabricated source names become authoritative class content and can affect test scores. A zero-question practice set can reach the UI as a successful generation.

**Required**

Generate a personal preview first; validate exact cardinality, choices, answer indices, and source IDs; provide click-through evidence; label AI and coverage limitations; require human approval before Pot-wide publication; add correction/reporting controls.

### H-08 — Trusted publishing accepts impossible states and malformed permanent note bodies

**Evidence**

- Direct `contributions` INSERT checks author and membership but does not require `status='draft'` (`supabase/migrations/0002_security.sql:115-116`). Authenticated INSERT remains after endpoint closure.
- A direct caller can create `status='shared'`, bypass the reviewed publishing RPC, and expose raw text through `supabase/migrations/0008_shared_contribution_visibility.sql:5-10`.
- `share_contribution` validates title and section but does not deeply validate or bound `p_body`, `p_body_text`, summaries, or takeaways (`supabase/migrations/0014_rate_limiting.sql:346-415`).
- `parseBlocks` checks only the `type` discriminator (`web/lib/data/pot.ts:187-197`), while rendering assumes fields are valid (`web/components/pot/note-body.tsx:43-94`).

**Reproduction**

Publish a body such as `[{"type":"bullets","items":null}]`; opening the persistent shared note throws when the renderer calls `.map` on `null`.

**Impact**

Direct clients bypass the intended state machine, expose unreviewed raw notes, or persist notes that crash their read page.

**Required**

Restrict direct inserts to draft-safe columns/state. Deeply validate and size-bound every organized field inside the trusted publish transaction, and parse persisted JSON defensively.

### H-09 — Database/RLS failures are shown as truthful empty or missing data

**Evidence**

- `web/lib/data/pot.ts:36-49` discards Pot/membership query errors and returns `null`.
- Feed and attachment query errors collapse to empty arrays at `:99-147`.
- `web/lib/data/admin.ts:93-145` similarly ignores authoritative query errors.
- UI then claims “Nothing in the pot yet,” “No open corrections,” or “No versions” (`web/components/pot/feed.tsx:113-132`; `web/app/p/[potId]/admin/page.tsx:173-206,230-237,281-288`).

**Impact**

An outage, expired session, schema mismatch, or RLS regression looks like data loss or an empty moderation queue. Maintainers can make decisions based on false zeroes.

**Required**

Propagate typed success, unavailable, unauthorized, and not-found outcomes. Provide route-level retry/error UI and never coalesce failed authoritative reads to empty content.

### H-10 — Post-login open redirect supports branded phishing

**Evidence**

- `/login` accepts `next` verbatim (`web/app/login/page.tsx:10-15`).
- `web/components/auth/auth-form.tsx:78` accepts any string beginning with `/`; a scheme-relative target such as `//evil.test` passes.

**Reproduction**

Send a victim `/login?next=//evil.test`; after legitimate authentication, the client navigation can leave MeltingPot for the attacker-controlled host.

**Impact**

Attackers can use the real MeltingPot sign-in page as the first half of a convincing phishing chain.

**Required**

Parse the destination against the application origin and allow only same-origin paths with one leading slash. Reject `//`, backslashes, schemes, control characters, and unknown sensitive destinations.

### H-11 — The documented fresh setup cannot produce the current application or run E2E

**Evidence**

- `README.md:98` says to apply only migrations `0001`–`0023`, but current code requires `0024`–`0027`.
- The same instructions say to call `dev_reseed`, but `supabase/migrations/0013_production_cleanup.sql:11-19` removes seed accounts and drops `dev_reseed`/`dev_seed` in the middle of the normal migration ledger.
- `web/tests/e2e/global-setup.ts:23-55` requires the seeded Maya account and invokes mutating `dev_reseed`.
- CI does not create/apply a fresh schema (`.github/workflows/ci.yml:27-85`).

**Impact**

A developer following the README gets missing columns/RPCs and a broken test fixture. A deployment can compile successfully and then fail at runtime because migrations 24–27 are absent.

**Required**

Document and automate the complete migration chain; separate production cleanup from reusable development bootstrap; create an isolated disposable Supabase E2E project; add fresh-schema migration/type-generation smoke CI.

### H-12 — There is no adequate privacy/consent/retention or data-rights surface for a classroom AI product

**Evidence**

- Signup requests only name/email/password and links to no privacy or terms route (`web/components/auth/auth-form.tsx:197-286`).
- Raw notes, images, and extracted classroom content are sent to Google's API (`web/components/contribute/contribute-flow.tsx:356-390`; `web/lib/mix/server.ts:121-134`). `store:false` is set, but provider processing/retention is not disclosed.
- Account settings provide no export or deletion (`web/app/me/settings/page.tsx:18-53`).
- Saved drafts can be resumed but not deleted from the contributions screen (`web/app/me/contributions/page.tsx:158-194`).
- Several profile foreign keys have no delete action (`supabase/migrations/0001_schema.sql:31,75,91-93,128,141,156`; `0021_study_sets_and_cards.sql:21`), so deleting a user may fail once attributed/shared data exists.

**Impact**

Classroom users, potentially minors, cannot make an informed decision about third-party AI processing and cannot reliably export or delete their data/account. This is a governance and institutional-approval blocker even where the code is technically functional.

**Required**

Define and disclose exact providers, purposes, data categories, retention/deletion behavior, training policy, subprocessors, age/authority rules, and incident contact. Add sensitive-data warnings, export, draft deletion, and a tested account-deletion/anonymization workflow. Obtain the appropriate school/legal review; this audit is not legal advice.

### H-13 — Rate limiting is transactional and fails open for operations that raise errors

**Evidence**

- `consume_rate_limit` increments a row inside the caller's transaction (`supabase/migrations/0014_rate_limiting.sql:46-80`).
- RPCs call it and then raise on invalid input/state, for example registration (`:161-235`) and joining (`:238-260`). PostgreSQL rolls back the increment when the enclosing RPC raises.
- `client_ip()` trusts forwarded header values as a best-effort identifier (`:23-42`).

**Impact**

Failed registration/account-enumeration attempts, invalid join attempts, and other rejected workflows are not counted. The advertised database limits therefore do not protect the very abuse traffic most likely to fail; forwarded-header trust may further weaken anonymous buckets depending on the proxy chain.

**Required**

Move abuse accounting to an independently committed trusted boundary (gateway/edge/service) or return structured failures without rolling back the limiter. Normalize and trust client IP only from a known proxy. Add adversarial tests proving failed attempts consume quota.

### H-14 — Moving a draft between Pots creates a cross-Pot attachment disclosure

**Evidence**

- Authors may change a draft's `pot_id` to any Pot they belong to (`supabase/migrations/0012_rls_hardening.sql:11-18`).
- Existing attachment rows and Storage paths keep the original Pot ID, and authenticated users cannot update attachment rows (`supabase/migrations/0015_endpoint_closure.sql:20-21`).
- Final attachment read policies check membership in the attachment/path Pot and whether the contribution is authored by the caller or shared, but they never require the contribution's current `pot_id` to equal the attachment/path Pot (`supabase/migrations/0017_attachment_read_scope.sql:8-28`).

**Reproduction**

Create a draft with a file in Pot A, move the contribution to Pot B through a direct update, then share it. The object remains under Pot A. Pot A members can read it once the contribution status is `shared`, while Pot B-only readers may not see the attachment belonging to their note.

**Impact**

A file can be disclosed to the wrong class and hidden from the intended class, violating the Pot privacy boundary.

**Required**

Make contribution `pot_id` immutable after creation, or move/rewrite all attachment metadata and Storage objects atomically. In every attachment/table/Storage read policy, require path Pot, attachment Pot, and contribution Pot equality.

### H-15 — Failed regeneration can be falsely reported as success by reopening old material

**Evidence**

- After every unsuccessful generation response, `web/components/study/study-workspace.tsx:223-248` performs a cache peek and treats any returned set as rescued output.
- The peek route returns an existing row for the same fingerprint (`web/app/api/ai/study/route.ts:91-115`).
- Rebuild uses `regenerate: true`, but the rescue peek does not prove the returned row was created or changed by this attempt.
- The new E2E at `web/tests/e2e/study.spec.ts:80-127` starts with no stored set and models a failed request that saved a new row. It does not cover a pre-existing cache plus a failed rebuild.

**Reproduction**

Open an existing deck/test, click “Build a new…,” and make the provider return 429/502 before saving. The rescue peek returns the old row, clears the error, closes setup, and presents stale content as if rebuilding succeeded.

**Impact**

Users are told a core learning operation succeeded when it did not, and may rely on outdated material.

**Required**

Snapshot the current row ID/timestamp before generation and rescue only a demonstrably newer result, ideally bound to a server-issued request/idempotency ID. Otherwise retain the old set with a clear “rebuild failed” message.

---

## Medium severity — significant defects

### M-01 — Study pages can hang forever after a network error

`web/components/study/study-workspace.tsx:154-187` does not catch a rejected `fetch`; the background lookup calls `.then` without `.catch` (`:195-217`), and generation/recovery still lack `try/finally` (`:223-250`). Offline/DNS/network failure can leave “Looking…” or “Mixing” permanently on screen with disabled controls. Add `AbortController`, `try/catch/finally`, timeout, retry, and unmount guards.

### M-02 — Concurrent cache misses duplicate AI work and spend

`web/app/api/ai/study/route.ts:91-112,133-213` reads cache, consumes quota, calls the model, and saves with no single-flight claim or lease. A class opening the same missing set concurrently can bill many equivalent generations; last writer wins. Use a Pot/kind/fingerprint job lease with wait/poll and stale-lease recovery.

### M-03 — Malformed successful AI JSON is retried as a connection failure

`web/lib/mix/server.ts:161-190` allows `JSON.parse` to throw into the generic retry path, causing up to four paid attempts even though comments say an unusable reply is not regenerated. `web/lib/mix/retry.test.ts:218-225` tests empty output, not invalid JSON. Convert parse/schema failures to non-retryable errors and test them.

### M-04 — AI error responses expose provider internals

`web/app/api/ai/study/route.ts:214-219` and `web/app/api/ai/organize/route.ts:238-242` return most `MixError.message` text to the client. Provider messages may expose model/config/request details. Map provider failures to a fixed public error taxonomy; keep detailed diagnostics only in scrubbed server logs.

### M-05 — Vision quota is charged before validating whether the file is usable

`web/app/api/ai/organize/route.ts:122-135` consumes each vision generation before download succeeds and before the 7 MB check. Missing, oversized, or already-expired-deadline files spend user quota without making a provider call. Validate/download and check the deadline first, then consume immediately before dispatch; report skipped items.

### M-06 — The supposedly provider-neutral AI configuration is hardwired to Google

`web/.env.example` and documentation describe generic `MODEL_API_KEY`, `FAST_MODEL`, and `REASONING_MODEL`, but `web/lib/mix/server.ts:121-134` hardcodes Google's hostname, headers, Interactions request shape, and response parsing. A DeepSeek/OpenAI key or model will not work. Either name the variables `GEMINI_*` honestly or implement a real provider adapter interface with provider-specific validation.

### M-07 — Real Gemini behavior has never been verified on this branch

`docs/BUILDLOG.md:255` records that no live model call had succeeded. Unit tests mock `fetch`, and the placeholder build proves compilation only. The implementation matches the current official [Google Interactions reference](https://ai.google.dev/api/interactions-api) and [May 2026 revision guide](https://ai.google.dev/gemini-api/docs/interactions-breaking-changes-may-2026), so this is an evidence gap rather than a confirmed request-shape defect. Do not enable AI in production until a real configured call verifies model IDs, permissions, output schema, latency, quotas, logging, retention, and errors.

### M-08 — Pot owners can bypass protected class-code regeneration

`supabase/migrations/0002_security.sql:81-83` allows an owner to update every Pot column. A direct PostgREST PATCH can set any valid `class_code` or caller-chosen `created_at`, bypassing the random, uniqueness-retry, and 20/hour regeneration path in `0014_rate_limiting.sql:312-343`. Use column-scoped grants or RPC-only mutation for system/protected columns.

### M-09 — Soft-removed study sets and cards remain readable to ordinary members

The SELECT policies in `supabase/migrations/0021_study_sets_and_cards.sql:47-51` check membership only. `0027_recoverable_and_configurable.sql:14-31` adds soft-removal but does not replace those policies. App screens filter removed rows, yet any member can query their complete payload/front/back through PostgREST. Restrict member SELECT to live rows and define the intended author/maintainer audience for removed rows.

### M-10 — Former card authors retain mutation authority after leaving a Pot

`supabase/migrations/0027_recoverable_and_configurable.sql:78-101` authorizes `set_flashcard_removed` when `created_by` equals the caller, without requiring current Pot membership. A departed member who retains a card UUID can remove or restore class material. Require current membership in addition to ownership, with maintainers as the separate administrative path.

### M-11 — Authorization decisions contain avoidable race windows

`join_pot_with_code` reads Pot state and inserts later without locking (`supabase/migrations/0027_recoverable_and_configurable.sql:193-211`); a concurrent close/archive can still admit a member. `remove_member` reads roles then deletes later (`0014_rate_limiting.sql:600-619`); a member promoted concurrently can be removed under stale authorization. `share_contribution` locks only the contribution, not Pot/membership state (`0014:367-413`). Lock authorization rows or use atomic mutation predicates and verify affected rows.

### M-12 — Search silently excludes older matching data and reports partial counts as complete

`web/lib/data/search.ts:141-186` scans only 200 recent notes, 60 study sets, 200 cards, and 20 sections, then returns 40 results (`:362-378`). Older matches can produce “No matches yet,” and counts describe only the sampled subset. `%` and `_` in the user term also remain SQL wildcards in the section/attachment `ilike` queries. Move matching/counting into indexed database search with pagination, escape literals, or explicitly disclose the searched window.

### M-13 — Core mobile actions can overflow, and mobile has no global Search entry

`web/components/ui/sticky-action-bar.tsx:26-31` forces a no-wrap row with a non-shrinking action group. Contribution review puts four actions into it (`web/components/contribute/contribute-flow.tsx:995-1035`), creating clipping risk at 320/375 px; correction and flashcard controls have similar dense rows. The only global Search form is hidden below `sm` (`web/components/shell/top-bar.tsx:31-46`) with no drawer replacement. Stack/wrap mobile actions and add a labeled mobile search destination; test 320 and 375 px widths.

### M-14 — Flashcard accessibility and keyboard shortcuts are broken in common contexts

The card button's action-only `aria-label` at `web/components/study/flashcard-session.tsx:201-229` overrides its visible question/answer as the accessible name. Its document-level ArrowLeft/ArrowRight handler (`:106-128`) prevents default even when focus is inside the shell search input, moving the deck instead of the text caret. Expose readable card content and flip state; scope shortcuts to the deck and ignore every interactive/editable target.

### M-15 — The mobile drawer is not an accessible modal/navigation surface

`web/components/shell/app-shell.tsx:39-70` has no dialog semantics, initial focus, focus trap/restore, Escape handling, or inert background. Profile navigation cannot notify the drawer to close. Implement a real accessible dialog/drawer and close it on route/profile actions.

### M-16 — Whole-note correction silently discards content after 20,000 characters

The correction editor exposes no shared limit or counter (`web/components/correct/correct-flow.tsx:251-270`), while the organize route silently slices raw input at 20,000 characters (`web/app/api/ai/organize/route.ts:60-67`). Reject oversize input visibly or enforce one client/server limit; never drop the tail without telling the author.

### M-17 — Invite and post-login destination state is lossy

`web/lib/pending-join.ts:16-20` removes the pending code before join success. The error path in `web/components/auth/auth-form.tsx:52-69` claims it is preserved but does not restore it. Login/signup cross-links drop `next` (`:148,268-283`), and proxy redirects drop the original query string (`web/proxy.ts:45-52`). Preserve a validated internal destination and clear join intent only after success.

### M-18 — Join preview claims success before joining and hides the real failure reason

`web/app/join/[code]/page.tsx:49-57` displays “You joined” before the form action actually creates membership (`:87-108`). `web/app/join/[code]/actions.ts:7-15` converts closed, archived, rate-limited, and unavailable failures into “not found.” Use invitation wording before success and preserve a safe, typed failure reason.

### M-19 — Owner-only Pot rule controls are shown as active controls to every member

`web/components/pot/settings-panel.tsx:258-337` renders joining/generation toggles regardless of role, while `supabase/migrations/0002_security.sql:77-83` allows only the owner to update. Members can click controls that optimistically change, then fail generically and revert. Render read-only status or hide controls for non-owners; add a member-role test.

### M-20 — Custom password handling has weak and ambiguous boundaries

`supabase/migrations/0014_rate_limiting.sql:180-203` requires only eight characters and calls `gen_salt('bf')` without an explicit calibrated cost or maximum byte length. Bcrypt truncates beyond its input limit, so visually distinct long passwords may authenticate identically. Delegate password lifecycle to GoTrue; otherwise set a current calibrated cost, enforce/document a byte maximum, and migrate existing hashes.

### M-21 — Arbitrary link schemes are stored and rendered without an allowlist

`web/components/contribute/contribute-flow.tsx:274-297` accepts any string and uses `new URL` only to create a display name. Shared notes pass the stored URL directly into a link at `web/app/p/[potId]/n/[noteId]/page.tsx:182-206`. Restrict to `https:`/`http:` (or an explicit safe set), normalize server-side, and show the destination host before opening. This audit did not confirm script execution in the tested target-blank browser path, so this is recorded as unsafe navigation rather than a proven XSS.

### M-22 — Security headers are absent

`web/next.config.ts` configures rewrites only, and `web/netlify.toml` contains build/plugin settings only. The repository defines no CSP/frame-ancestors, clickjacking, Referrer-Policy, Permissions-Policy, or explicit MIME-sniffing policy. Framework/host defaults were not treated as a substitute or assumed absent from live responses. Add and test a deployment-appropriate header policy, especially around third-party scripts, framing, microphone/camera, and attachment downloads.

### M-23 — Draft autosaves can finish out of order and report stale data as saved

Raw autosaves have no request sequence/revision (`web/components/contribute/contribute-flow.tsx:173-197`). Organized autosave marks `reviewDirty=false` before its request completes (`:209-231`), and `flushOrganized` does not wait for an already in-flight write (`:244-250`). A slower older request can land after a newer one, or “Save draft” can navigate while the only write is unresolved. Serialize saves or use an expected revision/monotonic sequence; report Saved only after re-reading the exact current revision.

### M-24 — Accepted-correction staleness protection is optional at the database boundary

The final `decide_proposal` signature keeps `p_expected_version_id uuid default null`, and the conflict check runs only when the caller supplies it (`supabase/migrations/0023_version_carries_the_reason.sql:24-33,76-83`). The current UI normally passes a version, but direct/older clients can omit it and accept a stale whole-note correction over a newer version. Require a non-null expected version for every acceptance and compare it while the note row is locked.

### M-25 — Structured AI requests have no generation-time size/output ceiling

The JSON schemas in `web/lib/mix/contracts.ts:12-110` constrain field types but set no string lengths or array cardinalities, and `web/lib/mix/server.ts:128-134` sets no explicit output-token/byte ceiling. Normalizers trim only after the complete response has been generated, transferred, parsed, and billed. Add provider output limits, schema `maxLength`/`maxItems` where supported, a response-byte ceiling, and a validated post-normalization minimum/maximum contract.

### M-26 — The new AI timeout comments/configuration are based on incorrect Netlify limits

Both AI routes claim Netlify defaults to 10 seconds and permits at most 26 seconds (`web/app/api/ai/organize/route.ts:41-53`; `web/app/api/ai/study/route.ts:24-36`), then self-cap model work at 22–23 seconds (`web/lib/mix/server.ts:31-45`). Current Netlify documentation states a non-configurable **60-second** synchronous limit: [Netlify function limits](https://docs.netlify.com/build/functions/configuration/?fn-language=js#default-values). The decision record is internally inconsistent too: `memory/decisions/017-mixing-not-a-model-name.md:80-85` still describes a 60-second shared budget before later describing 10/26 seconds. The shared-deadline design fixes the prior per-call-budget defect, but the incorrect platform assumption now rejects slower reasoning/vision work much earlier than necessary and has not been validated with a live provider. Measure deployed behavior, use one invocation deadline with a safe margin under the actual platform limit, and correct the architectural record.

The deadline also starts too late to guarantee even the self-imposed 26-second ceiling: organizer starts its 23-second clock only after authentication, membership, sections, and quota work (`web/app/api/ai/organize/route.ts:55-89`), while Storage downloads are unbounded (`:122-131`). Study starts the 22-second model clock only after auth, notes, cache, quota, and attachment queries (`web/app/api/ai/study/route.ts:38-173`). Anchor one absolute deadline at handler entry and bound every external stage, save, and serialization step.

### M-27 — Common image-analysis failures are silently omitted

Parallel image work returns `null` for vision-quota failure or failed download (`web/app/api/ai/organize/route.ts:122-131`); only oversized files and model exceptions create warnings (`:132-164`). The final `visionWarning` can therefore remain empty even though one or more selected images were not used. Return a per-image status for quota, download, timeout, oversize, and provider failures, then tell the contributor exactly which files were omitted before review/share.

---

## Low severity / release hygiene

### L-01 — Browser E2E is not part of CI

`.github/workflows/ci.yml` runs lint, typecheck, unit tests, and build but deliberately omits all 57 Playwright tests. The current suite also depends on a mutable seeded Supabase project. Create an isolated disposable test database and run at least auth/RLS/publish/moderation smoke flows on pull requests.

### L-02 — Admin/history pages claim completeness while queries cap results

`web/lib/data/admin.ts:93-115` caps contributions/versions at 300, while `web/app/p/[potId]/admin/page.tsx:268-287` says “Every version.” Private-draft RLS also limits what maintainers can see. Paginate and state exact visibility rather than claiming completeness.

### L-03 — Global error copy promises data safety it cannot know

`web/app/error.tsx:11-14` always says “Nothing was lost,” including crashes involving unsaved input. Use persistence-aware wording such as “Saved work should still be available” only when the application can prove it.

### L-04 — Several foundational accessibility relationships are incomplete

- `web/components/pot/note-view.tsx:21-56` uses tabs without `aria-controls`, tabpanels, roving focus, or arrow-key behavior.
- `web/components/ui/confirm-dialog.tsx:43-76` does not explicitly give the dialog an accessible name through `aria-labelledby`.
- `web/components/shell/app-shell.tsx:29-73` has no skip link/main target, forcing keyboard users through persistent navigation on each page.

Add automated axe coverage plus manual keyboard and screen-reader verification for all major states, not only initial pages.

### L-05 — Clipboard failure is silent

Create-Pot invitation copying at `web/components/pots/create-pot-flow.tsx:41-83` gives no error or selectable fallback when clipboard permission is denied. Keep the URL visible and offer manual selection/copy guidance.

### L-06 — Documentation reports the wrong test count

`README.md:87` claims 138 unit tests and 56 Playwright tests; the current run has 164 unit tests and 57 discovered Playwright tests. Update generated evidence rather than manually maintaining stale numbers.

### L-07 — Vitest configuration emits a future-compatibility warning

The unit suite passes but warns that `vitest.config.ts` uses ESM syntax under a CommonJS package and may be incompatible with a future native config loader. Rename/use an explicit module config or declare the package module type deliberately.

### L-08 — Netlify project-root behavior depends on an unversioned dashboard setting

`web/netlify.toml:1-10` works when Netlify's externally configured base directory is `web`; a fresh repository-root import depends on that out-of-repo setting. Document it or move root/build configuration into a repository-level Netlify config.

---

## Verification performed

The following local/static checks passed on the exact audited commit:

- Pinned pnpm 10.33.0 dependency install.
- Production dependency audit: **0 known advisories** at audit time.
- ESLint: passed with no warnings.
- Next/TypeScript typecheck: passed.
- Vitest: **13 files, 164/164 tests passed**.
- Production build with placeholder public Supabase values: passed; 18 route entries generated.
- Playwright discovery: **57 tests in 14 spec files**.
- No tracked Gemini/other provider secret was found in this branch.

An additional read-only live probe found that the landing page returned 200 and unauthenticated `/api/ai/study` returned 401. This probes the deployed site only; it does not prove which commit or migrations are live.

The following release evidence is still missing:

- Playwright execution was intentionally not run because no isolated E2E Supabase environment was supplied, and global setup signs in as a seed user and calls the mutating `dev_reseed` RPC against whichever project is configured.
- No fresh-database migration smoke test was run.
- No real authenticated Gemini generation was run; production model IDs, key permissions, quota, latency, schema response, logging, and retention remain unverified.
- The live probe does not prove production is running this SHA or migrations `0024`–`0027`.
- GitHub Actions status could not be independently fetched through the repository status API in this environment.

## Release order

1. Fix **C-01** and all **High** findings.
2. Add adversarial integration tests for MFA AAL, direct RPC/REST calls, raw-redaction/share, storage cleanup, file validation, account verification/abuse, and study cache integrity.
3. Apply the full migration chain to a disposable database and run all 57 E2E tests.
4. Complete a real Gemini provider/privacy/retention smoke test with bounded spend.
5. Fix or explicitly accept every Medium issue with an owner and date.
6. Re-run lint, types, unit, build, E2E, fresh-schema, security, accessibility, 320/375 px responsive, and deployment checks on one frozen candidate.

Until then, this branch should not be merged into `main` or published to the organization's live site.

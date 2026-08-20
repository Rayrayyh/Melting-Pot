# MeltingPot Desktop UX Brief

Generated from an exhaustive analysis of the 16 reference screens in `docs/reference/` plus their captions, synthesized against the master prompt in `docs/SPEC.md`. SPEC.md wins any conflict with this file. This brief drives routes, components, copy, and state machines during the build.


## Route map

### `/`

Public landing with join-by-code as the hero action. Centered card (~440px) on paper background, no app shell. Signed-in users hitting / are redirected to /home; the code field also lives on /home so this page is primarily for logged-out or link-shared arrivals.

Key components: ClassCodeInput (6-char, auto-uppercase, inline error); Button primary 'Join Pot'; InlineFieldError ('We couldn't find a pot with that code.') with retry-in-place loop; Wordmark header; Quiet links: 'Log in' / 'Create a Pot'

Source screens: 01-onboarding-flow (code entry + error loop)

### `/join/:code/confirm`

Pot confirmation BEFORE auth: shows what the code resolved to so the user knows what they joined before any sign-in wall. Widened desktop preview: Pot name, contributor count, a few recent shared-note titles. Continue triggers the four-way account-status branch.

Key components: JoinConfirmationCard (check badge, Pot name, meta line, recent-note preview list); Button primary 'Continue'; Branch cards for signed-in states: 'Open Pot' (new member) and 'Return to Pot' (already member, idempotent join)

Source screens: 01-onboarding-flow (You've joined card, decision node 2, branch cards A/B)

### `/login`

Email login, pre-contextualized with the Pot just joined when arriving from the join flow (clay eyebrow shows the Pot name). On success routes directly into the Pot, not a generic dashboard; plain logins route to /home.

Key components: AuthCard (centered ~440px, no shell); PotContextEyebrow ('BIO 101 Study Pot is waiting for you.'); Email field; Button primary 'Log In & Open Pot' (or 'Log In' without Pot context)

Source screens: 01-onboarding-flow (branch C: signed out, has account)

### `/signup`

Two-field account creation (display name + email), framed as saving a membership already granted when arriving from the join flow. Lands directly inside the Pot afterwards; membership survives account creation.

Key components: AuthCard; PotContextEyebrow; Display name + email fields; Button primary 'Create Account & Enter' (or 'Create Account')

Source screens: 01-onboarding-flow (branch D: no account, pot already joined)

### `/home`

Returning-user dashboard inside the user-level shell: greeting + one-line status, Your Pots card grid, Recently used rows, right sidebar with recent activity, your contributions with status pills, and a Join/Create card containing a class-code field.

Key components: GreetingBlock (time-of-day + status sentence); PotCard grid (name, member count, activity stat); RecentlyUsedList (title, meta, green 'Open' link); Sidebar: ActivityList, MyContributionsList (StatusPill per row), JoinCreateCard (ClassCodeInput + 'Create a Pot')

Source screens: 02-returning-user-dashboard (70/30 layout, membership cards, recently used)

### `/pots/new`

Create a Pot: minimal form (Pot name, optional description, optional starter sections). On create, shows the generated 6-char class code with copy control and routes to the new Pot home. Creator becomes owner.

Key components: Form card (~560px centered in shell); TextInput 'Pot name' (duplicates allowed); CodeDisplayBlock (large monospaced code + 'Copy code') on success; Button primary 'Create Pot'

Source screens: No direct reference; assembled from 15-pot-settings identity card + 01 join semantics

### `/p/:potId`

Pot home: the default landing inside a Pot. Vitals metric row, dominant shared-note feed (all sections), intro/call-to-contribute card, contributor activity side panel. 'Add contribution' pinned in the page header. Maintainers see 'Open corrections' vital linking to the review queue.

Key components: Breadcrumb + H1 (Pot name); MetricCard row (Contributors / Shared notes / Open corrections / Class code with copy); IntroBanner ('Build the notes together'); SharedNoteCard feed with SortPill; Button primary 'Add contribution' (header, never scrolls away); Right panel: contributor activity, Pot vitals

Source screens: 03-pot-home-layout (skeleton, metrics row), 04-class-feed (feed + intro banner, adapted Pot-wide)

### `/p/:potId/s/:sectionId`

Section feed: same feed structure scoped to one section, with section title as H1 and section description in the right panel. Reached from the left-nav section list or note breadcrumbs.

Key components: Breadcrumb (Pot > Section) + H1; IntroBanner (compact variant); SharedNoteCard list (~720px column); SortPill 'Most recent'; Right panel: section description, contributor list, 'Add contribution' echo

Source screens: 04-class-feed (primary), 03-pot-home-layout (section rail concept)

### `/p/:potId/contribute/:draftId?`

The entire 3-step contribution flow on ONE route with internal step state (write -> optional section -> organizing -> review -> success). Draft autosaves and is resumable by draftId. Section chooser is a modal over the write step, organizing replaces the editor in place, review is the two-column approval gate, success is a banner-on-feed redirect.

Key components: StepCapsule ('1 of 3 · Write' etc.); ComposerTextarea (label 'Your rough thought', 2000-char counter, autosave 'Saved' pill); AttachmentRow (Attach / Voice / Photo, all optional); TrustBanner (lock, 'Original text will always be preserved.'); SectionPickerModal (search, Recommended/Also relevant/Related cards, 'Not sure where it belongs' deferral, context-aware CTA 'Continue with [section]'); StageChecklist (Original preserved / Structuring the idea / Suggesting placement); TrustBanner ('Nothing is shared yet'); ReviewCompare (two-column: Original preserved read-only vs Organized editable; tabs below ~900px); PlacementBar ('Suggested placement' + Change); StickyActionBar ('Only you can approve what gets shared.' + Edit + primary 'Share with class')

Source screens: 05-write-anything, 06-optional-section (modal), 07-ai-organizing (in-place state), 08-review-before-sharing, 09-shared-success (collapsed into feed banner)

### `/p/:potId/n/:noteId`

Shared-note detail (reading page): title, attribution, AI summary, key takeaways, full organized body at a comfortable text measure. Header actions: Original (toggle to verbatim raw text), History, and primary 'Suggest correction'. Comments surface lives here. Sentence selection in the body starts the correction flow.

Key components: Breadcrumb (Pot > Section > Note); NoteHeader (title + action group: 'Original' toggle, 'History', primary 'Suggest correction'); AttributionRow ('Shared by Ava · Week 3 · 2h ago', correction contributors credited when versions exist); ReadingCard (~760-820px: summary paragraph, 'Key takeaways' bullets, full body); StatusPill 'Live'; SelectableSentence behavior in body; Right panel (optional): source details, compact recent versions linking to History, comments

Source screens: 16-shared-note-summary-layout (reading rhythm), 04-class-feed (card tap target), 09-shared-success ('View in class notes' destination)

### `/p/:potId/n/:noteId/correct`

Suggest-correction flow as a right slide-over panel (~420px) layered on the note detail, note stays visible for context. Stage 1: selected sentence + reason chips. Stage 2: the panel widens (or opens an ~800px modal) into the before/after proposal composer with rationale and optional evidence. Centered modal is the narrow-width fallback. Ends with 'Send to maintainer'.

Key components: SlideOverPanel; SelectedSentenceBlock (quoted sentence + 'Selected' tag, functional tint plus label); ReasonChipGroup ('Incorrect fact' / 'Unclear wording', single-select); NoticeBanner warning ('A maintainer approves changes'); BeforeAfterCompare (editable AFTER only, immutable BEFORE, always-visible text labels); RationaleField ('Why this is more accurate', 300-char counter); EvidenceChip (attach/remove source); Button primary 'Suggest correction' then 'Send to maintainer'; Microcopy footer ('No changes are public until approved.' / 'AI can help phrase it. A person decides.')

Source screens: 10-suggest-correction (stage 1), 11-before-after (stage 2) - two screens combine into one panel with two stages

### `/p/:potId/proposals/:proposalId`

Contributor-side proposal page covering ALL statuses on one route: pending shows the waiting banner + review timeline; decided shows the outcome banner (accepted / revision requested / declined) with next actions and maintainer feedback. Left rail: status + timeline; main: full side-by-side comparison, rationale, evidence, AI-boundary card.

Key components: StatusBanner (pending: 'Waiting on maintainer', named reviewer, 'Usually reviewed within 24 hours'; decided: success/warning/neutral variant with inline primary action); ProgressTimeline (Proposal submitted / Evidence attached / Maintainer reviewing / Decision); BeforeAfterCompare (full, read-only); FeedbackQuote ('[Name]'s feedback'); NoticeBanner ('AI cannot publish this change'); Buttons: 'Edit proposal' (pending or revision requested), 'View updated note' (accepted), 'Back to class feed'; Reassurance footer ('Original and every revision stay visible' linking to History)

Source screens: 12-maintainer-review (contributor pending view), 13-decision-outcomes - both combine into one status-driven route

### `/p/:potId/review`

Maintainer review queue (maintainer/owner only; the 'Open corrections' vital and a left-nav 'Review' entry link here). List of open proposals: note title, proposer, reason chip, age, compact before/after preview line, status. Also tabs for recently decided.

Key components: ProposalRow (avatar, proposer, note title, ReasonChip, age, StatusPill); Tabs: Open / Decided; EmptyState ('No open corrections. Nothing is waiting on you.'); SortPill

Source screens: No direct reference; implied by 03 'Change requests / 2 open' metric and 12's maintainer adaptation note

### `/p/:potId/review/:proposalId`

Maintainer review workspace: full side-by-side comparison center-stage, contributor rationale and evidence alongside, source note context, and explicit human-only decision actions: Accept, Request revisions (with required feedback text), Decline (with reason). Timeline rail doubles as audit trail. Decisions create a new note version (accept) and notify the contributor.

Key components: BeforeAfterCompare (full width); RationaleCard + EvidenceChip (read-only); SourceNoteContext (link to live note); DecisionActionBar (primary 'Accept', secondary 'Request revisions', quiet-destructive 'Decline'; feedback textarea for the latter two); ProgressTimeline (audit trail); NoticeBanner ('A maintainer must accept or request revisions.')

Source screens: 12-maintainer-review (maintainer adaptation), 11-before-after (comparison structure), 13-decision-outcomes (decision semantics)

### `/p/:potId/n/:noteId/history`

Version history workspace for one note: left chronological timeline (1/3 width) with full attribution per entry ('Correction by Omar · approved by Ms. Chen · Yesterday'), right side-by-side comparison of two selected versions (2/3) with inline Added/Removed marking. Compare mode and Restore (restore routes through maintainer review for non-maintainers).

Key components: Breadcrumb (Pot > Section > Note > History); VersionTimeline (entries with RolePill Contributor/Maintainer, selected state, attribution meta); Button primary 'Compare two versions'; Button secondary 'Restore this version' + helper text; ComparisonPanel x2 ('Comparing' pill, attribution meta, scrollable body, Added/Removed labels with functional green/red); Stacked fallback below ~1000px

Source screens: 14-version-history-layout

### `/p/:potId/settings`

Pot settings, role-scoped. Maintainer/owner view: two panels - Identity (editable Pot name, read-only Pot ID, class-code block with Copy and Regenerate-with-confirm) and People (maintainers list with Lead/You descriptors, 'Add maintainer', members list with confirm-guarded Remove, 'Manage members'). Members see a read-only reduced view: Pot name + class code only, plus 'Leave this Pot'.

Key components: IdentityCard (TextInput 'Pot name', CodeDisplayBlock with 'Copy code' + 'Regenerate code' confirm dialog, helper 'Anyone with the code can join this Pot.'); PeopleCard (MemberRow with RolePill 'Maintainer', descriptors 'Lead'/'You', Button 'Add maintainer', destructive 'Remove' links with ConfirmDialog); ReadOnlySettingsCard (member variant)

Source screens: 15-pot-settings-layout

### `/p/:potId/members`

Full roster view opened from 'Manage members' (also a left-nav 'Members' entry): every member with role, joined date, contribution count; maintainers can promote to maintainer, demote, or remove; owner can transfer ownership. Members see the roster read-only.

Key components: MemberRow (avatar, name, RolePill member/maintainer/owner, meta, overflow menu with role actions); SearchInput (filter roster); ConfirmDialog for destructive/role changes

Source screens: 15-pot-settings-layout (contributors sub-list expanded)

### `/search`

Global search results across the user's Pots: shared notes, Pots, sections. Reached from the top-bar search anywhere in the shell; supports scoping to the current Pot (?pot=:potId) when invoked inside one.

Key components: SearchInput (large, pre-filled from top bar); Result groups: Notes (SharedNoteCard compact variant), Pots (PotCard row variant), Sections (SectionRow); ScopeToggle ('All Pots' / current Pot); EmptyState ('No matches yet. Try a different word from the note.')

Source screens: 02 (top-bar search placement), 04 (in-Pot search icon)

### `/me/contributions`

The user's own activity across Pots: shared notes, drafts (resumable into the composer), and correction proposals with live statuses. This is where 'We'll notify you when a decision is made' resolves to when a notification is clicked.

Key components: Tabs: Shared / Drafts / Proposals; ContributionRow (title, Pot + section meta, StatusPill draft/shared/pending/accepted/revision-requested/declined); Green 'Open' links; EmptyState per tab

Source screens: 02 (sidebar contributions pattern), 13 ('My proposals' list note)


## App shell

TWO SHELL LEVELS, one persistent frame. Warm off-white paper background app-wide, flat white cards with 1px subtle borders, Inter, charcoal text, deep forest green for all primary actions and links, small clay accents for eyebrows/counts, functional red/amber/green only for status semantics (always paired with a text label).

NO-SHELL SURFACES: landing (/), join confirmation, /login, /signup render as single centered cards (~420-480px) on the paper background with only the wordmark. The left nav appears only after the user is inside the app.

TOP BAR (always present inside the app, ~56px, white, hairline bottom border): wordmark 'MeltingPot' far left (links to /home); global search field center-left with placeholder 'Search your Pots and notes' (routes to /search, scoped to the current Pot when inside one); far right the user avatar (initials circle, neutral tint) opening the account menu (Profile, My contributions, Log out). No streak icons, no checkmark, no flame. Optional quiet theme toggle. When inside a Pot the breadcrumb in the content header carries Pot context; the top bar does not duplicate the Pot title.

LEFT NAV (persistent, ~240px, white, hairline right border), two modes:
1. User level (on /home, /pots/new, /search, /me/*): Home, My Pots (expandable list of Pot names), Join a Pot (opens the class-code field inline or routes to /), Create a Pot. Account/avatar block pinned at the bottom.
2. Pot level (on any /p/:potId/* route): 'Back to all Pots' quiet link at top, then the Pot name as a header block with member count; below it the Pot's named sections as nav items (never bare numbers; active section marked with a soft green-tinted rounded highlight, not yellow); then fixed entries: Feed (Pot home), Members, Settings; maintainers/owners additionally see Review with an open-corrections count badge (functional amber when > 0). 'Add contribution' also appears as a full-width forest-green button near the top of the Pot-level nav so the primary action is reachable from every Pot page.

CONTENT AREA widths: feed and list columns max ~720-760px; reading surfaces (note detail) max ~760-820px text measure; workspaces (review compare, version history, maintainer review) expand to ~1200px with internal columns; forms/dialogs ~560-640px. Many pages carry an optional right contextual panel (~300px) for section descriptions, contributor activity, vitals, or version links; it is always informational, never required.

RESPONSIVE BEHAVIOR: below ~1200px the right contextual panel drops below the main column or hides behind a toggle. Below ~1000px the version-history layout stacks timeline above comparison, and each comparison panel scrolls in its own overflow container. Below ~900px all side-by-side comparisons (review step, before/after, history) fall back to the tabbed pattern from the mobile references ('Organized' | 'Original preserved'; 'Before' | 'After'); the left nav collapses to an icon rail or hamburger drawer. Wide content (comparisons, code blocks) always scrolls inside its own container; the page body never scrolls horizontally. Sticky elements: composer footer action bar, review-step action bar, and correction-panel footer stay pinned while their content scrolls.


## Component inventory

### ClassCodeInput
6-character segmented or wide monospaced input; auto-uppercase, auto-advance, paste-friendly. Props: value, onSubmit, error (renders red inline text under the field, field value retained for retry-in-place), size (hero | inline for dashboard sidebar), disabled/loading. Label 'Class code'. Never navigates away on error.

### Button
Variants: primary (deep forest green fill, white text), secondary (white, 1px charcoal-tinted border), quiet (text-only green link style), destructive-quiet (functional red text, used for Remove/Decline). Props: variant, size (md | lg | full-width), leading/trailing icon, loading, disabled. Primary is unique per view; context-aware labels supported ('Continue with Week 3').

### PotCard
Dashboard membership card: Pot name (bold), member/contributor count, activity stat line ('3 notes shared this week'), whole card clickable to Pot home. Props: pot, activityStat, variant (grid | row for search results). White card, subtle border, hover raises border contrast.

### SharedNoteCard
Feed unit: AvatarInitial + contributor first name + relative timestamp (right-aligned), bold plain-language title, one-line summary (2-line clamp), meta footer 'SectionName · N comments'. Props: note, showSection (hide inside a section feed), compact (search results), onClick to note detail. Neutral/clay avatar tints only.

### AvatarInitial
Circular initials avatar. Props: name (derives 1-2 initials), size (xs 20 / sm 28 / md 36), tint (neutral | clay | charcoal-fill for emphasis). No photos required in MVP.

### AttributionRow
Credit line: AvatarInitial + primary text + secondary text. Variants: feed ('Ava · 2h'), note-detail ('Shared by Ava · Week 3 · 2h ago'), credit ('Credited to Ava Morgan' / 'Visible with every version'), history ('Correction by Omar · approved by Ms. Chen · Yesterday'). Props: user, primary, secondary, variant.

### StatusPill
Small rounded label, ALWAYS text + color (never color alone). Variants: live (green tint, 'Live'), ready (green tint, 'Ready'), saved (neutral gray, 'Saved', passive autosave indicator), joined (green, 'Joined'), pending (amber, 'Waiting on maintainer'), accepted (green, 'Accepted'), revision (amber, 'Revision requested'), declined (neutral/red, 'Declined'), draft (neutral, 'Draft'), comparing (neutral, 'Comparing'). Props: status, size.

### RolePill
People-context pill distinct from StatusPill: 'Member', 'Maintainer', 'Owner', plus history-timeline 'Contributor'/'Maintainer'. Neutral charcoal-tint styling, no blue. Plain-text descriptors 'Lead' / 'You' render beside it, not as pills.

### SectionPill
Section reference chip used in card footers and pickers. Props: section, interactive (click filters/navigates), selected. Selected state: forest-green border + fill tint + check icon (never color alone).

### SectionPickerModal
The optional-placement surface (modal ~560-640px, or two-pane with section preview at width). Contains: search field ('Search sections'), SectionOptionCard list with eyebrow ranks (Recommended pinned first and pre-selected with green border + check, Also relevant, Related), each with an AI-evidence line quoting the student's own words ('Matches "nuclear envelope" and "chromatids".'), a visually separated DeferralCard ('Not sure where it belongs' / 'Let AI suggest a section. Nothing is automatic.'), sticky footer with quiet 'Skip' and primary 'Continue with [section]' whose label tracks the selection. Props: sections, recommendation, evidence, selected, onSkip, onContinue. Selection is never mandatory.

### StepCapsule
Segmented flow-progress capsule: filled current segment ('1 of 3 · Write') + inactive preview segment ('Next: choose a section' / 'AI organizes next'). Props: step, total, label, nextLabel. Filled segment uses forest green, not black. Rendered as a slim horizontal indicator above the content column headline.

### ComposerTextarea
The low-friction writing surface: white card, uppercase micro-label 'YOUR ROUGH THOUGHT', tall multiline plain-text area, live character counter '132 / 2,000' bottom-right, continuous autosave driving a StatusPill 'Saved'. Props: value, maxChars (2000), onSave. NO title field, NO tags, NO formatting toolbar, NO required section. Desktop ~720-840px wide.

### AttachmentRow
Compact icon-button row (Attach paperclip / Voice mic / Photo image) docked bottom-left of the composer. All strictly optional. Props: onAttach, onVoice, onPhoto, attachments (renders removable chips).

### TrustBanner
Quiet reassurance strip: leading icon (lock / eye / person) + bold line + optional subline, light neutral surface. Instances: 'Original text will always be preserved.'; 'Nothing is shared yet' / 'You'll review every change before classmates see it.'; 'Only you can approve what gets shared.'; 'AI cannot publish this change' / 'A maintainer must accept or request revisions.'; 'Original and every revision stay visible' / 'Nothing is silently overwritten.' Props: icon, title, body, tone (neutral | warning).

### NoticeBanner
Functional status banner. Tones: info (neutral), warning/pending (functional amber: maintainer-approval notice, waiting-on-maintainer), success (functional green: accepted, shared confirmation), error (functional red). Props: tone, eyebrow, title, body, inlineAction, dismissible. Decision outcome banners use this full-width at the top of the proposal page.

### StageChecklist
Vertical checklist for the organizing state: per-stage glyph by state - complete: functional-green check circle; active: charcoal spinner disc; pending: muted numbered circle. Each stage has bold title + gray subline ('Original preserved' / 'Saved exactly as you wrote it', 'Structuring the idea' / 'Building a scannable explanation', 'Suggesting placement' / 'Matching this to the right section'). Props: stages[{title, detail, state}]. Restrained motion, no streaming text, no chat.

### ProgressTimeline
Vertical connected timeline for proposal review and history audit trail: completed steps (green check + timestamp/detail), active step (filled dot + ring), future steps (muted). Entries like 'Proposal submitted · Today, 10:42 AM', 'Evidence attached · OpenStax Biology', 'Maintainer reviewing', 'Decision · Accepted by Ms. Chen'. Props: steps[{title, detail, state, timestamp}].

### BeforeAfterCompare
The correction comparison. Desktop: two equal cards in a row; stacked fallback below ~900px. BEFORE card: 'BEFORE' text pill (functional red tint), immutable quoted sentence, provenance footer ('From Ava's shared note'). AFTER card: 'AFTER' text pill (functional green tint), inline-editable replacement (pencil affordance) when mode=edit, scope footer ('Replaces one selected sentence'). Props: before, after, mode (edit | read), onAfterChange. Text labels always visible so color is never the only signal. Compact one-line preview variant for queue rows.

### SelectedSentenceBlock
The correction anchor: quoted sentence in a bordered, functionally tinted box with an uppercase 'SELECTED' tag. Rendered in the correction panel after in-place sentence selection on the note body. Props: sentence, onClear.

### ReasonChipGroup
Single-select tile chips for 'What seems off?': 'Incorrect fact', 'Unclear wording' (extensible). Selected: forest-green fill + white check; unselected: outlined with icon. Props: options, value, onChange. Helper text 'This helps the maintainer review faster.'

### RationaleField
Bounded free-text explanation card, eyebrow label 'WHY THIS IS MORE ACCURATE', live counter '78 / 300', maxChars 300. Props: value, onChange, maxChars.

### EvidenceChip
Attached-source row: link icon, source name ('OpenStax Biology · Cell Division'), status line 'Evidence attached', circular X to detach. Optional. Props: source, onRemove, readOnly (maintainer view).

### FeedbackQuote
Maintainer feedback card: eyebrow '[Name]'s feedback' over the quoted feedback text, nested white card with warning-tint border in revision-requested context. Read-only. Props: reviewerName, text.

### ReviewCompare
The approval-gate layout for step 3 review: left column 'Original preserved' (read-only verbatim rough text, clearly labeled), right column 'Organized' (editable: generated title, one-line summary, 'Key points' numbered rows on subtle strips, pencil edit affordance, quiet muted provenance text 'Organized by AI' - no branded chip). PlacementBar spans above both columns ('SUGGESTED PLACEMENT · Week 3 › Mitosis · Change'). Tabs fallback below ~900px. Props: original, organized, placement, onEdit, onChangePlacement.

### StickyActionBar
Bottom-pinned bar for flow steps: reassurance line at left (eye icon + 'Only you can approve what gets shared.'), actions at right (secondary + primary). Used by composer (Continue), review (Edit / Share with class), correction panel (Send to maintainer), maintainer workspace (Decline / Request revisions / Accept). Props: message, actions[].

### MetricCard
Glanceable vital: tiny muted uppercase label over bold value ('Contributors / 12', 'Shared notes / 48', 'Open corrections / 2', 'Class code / D2Z7GG'). Props: label, value, href (corrections links to review queue), accessory (copy button for class code), tone (amber value when corrections > 0). Rendered as an equal-width row of 4.

### CodeDisplayBlock
Class-code display: large monospaced 6-char code on a gray read-only field, 'Copy code' outlined button with brief 'Copied' success state, maintainer-only 'Regenerate code' quiet action gated by ConfirmDialog ('This invalidates the old code'). Helper 'Anyone with the code can join this Pot.' Props: code, canRegenerate, onCopy, onRegenerate.

### VersionTimeline
History list: entries newest-first with version title ('Current version', 'Correction accepted'), RolePill, attribution meta line ('Correction by Omar · approved by Ms. Chen · Yesterday'), selected state (soft tinted row), compare-mode checkmarks. Footer: 'Restore this version' secondary button + helper 'Compare first so the class can see what would change.' Props: versions, selectedIds, compareMode, onSelect, onRestore. Restore routes through maintainer review for non-maintainers.

### ComparisonPanel
One side of the history comparison: header (version label + 'Comparing' StatusPill), attribution meta ('Ada · 2 hours ago'), scrollable body with inline change marking - additions in functional green with 'Added' label, removals in functional red with 'Removed' label. Props: version, body, changes. Own overflow container.

### MemberRow
Roster row: AvatarInitial (compact, aligned), name, RolePill, plain descriptors ('Lead', 'You'), meta (joined date / contribution count), right-aligned actions: destructive-quiet 'Remove' (ConfirmDialog), overflow menu for promote/demote/transfer. Props: member, viewerRole (gates actions), onAction.

### ConfirmDialog
Modal confirmation for destructive/irreversible actions: Remove member, Regenerate code, Decline proposal, Leave Pot. Props: title, body, confirmLabel (explicit verb), tone (danger uses functional red confirm), onConfirm/onCancel.

### EmptyState
Centered quiet illustration-free block: bold line + gray subline + optional primary action. Instances: empty feed ('Nothing in the pot yet' / 'Be the first. Write it however it comes to you.' + 'Add contribution'), empty dashboard ('Join your first Pot' + ClassCodeInput), empty review queue ('No open corrections.'), empty search ('No matches yet.'), empty drafts/proposals tabs. Props: title, body, action.

### SortPill
Small outlined dropdown pill above feeds and queues: 'Most recent' default; options Most recent / Most discussed. Props: value, options, onChange.

### Breadcrumb
Muted eyebrow path with ›-separated crumbs: Pot > Section > Note > History. Each crumb navigates. Props: crumbs[{label, href}]. Pairs with the H1 beneath per the eyebrow/H1 hierarchy pattern.

### IntroBanner
Call-to-contribute card at feed top: eyebrow 'CLASS KNOWLEDGE POT', heading 'Build the notes together', body 'Drop a rough thought, example, correction, or question. Formatting can wait.', primary 'Add contribution'. Flat white or soft green-tint surface (not dark navy). Props: compact (section feeds), dismissed state remembered.

### SuccessBadge
Circular flat pale-green disc with dark green check, used in join confirmation and shared-success banner. Props: size. No gradients, no animation beyond a subtle fade.

### ToastBanner
Dismissible inline success strip at feed top after sharing: SuccessBadge (sm) + 'Shared with the class and credited to you' + placement breadcrumb + 'View in class notes' quiet link. Auto-highlights the new SharedNoteCard's 'Live' pill briefly. Props: message, meta, action, onDismiss.


## Copy bank

Sentence case, natural language. No emojis, no em dashes, no Git terms. Audit against SPEC copy direction before shipping any screen.

### join-code-entry (/)

- Class code
- Join Pot
- That code didn't work
- We couldn't find a pot with that code.
- Try Again
- Enter the 6-character code your class shared.

### join-confirmation (/join/:code/confirm)

- You've joined
- Next, we'll check your MeltingPot status.
- Continue
- Welcome back
- This pot is already in your vault, so nothing gets duplicated.
- Membership is saved instantly. No extra setup required.
- Open Pot
- Return to Pot
- Joined
- 28 contributors · notes updating live

### auth (/login, /signup)

- Log in to keep your spot
- BIO 101 Study Pot is waiting for you.
- Email
- Log In & Open Pot
- You're in. Save your account.
- Create an account so this pot stays in your vault.
- Display name
- Your name
- you@example.com
- Create Account & Enter

### dashboard (/home)

- Good afternoon, Ada
- Your Pots
- Recently used
- Open
- Join a Pot
- Create a Pot
- Have a class code?
- 3 notes shared this week
- 1 accepted contribution this week
- Your contributions
- Join your first Pot
- Enter a class code to see what your class is building.

### create-pot (/pots/new)

- Create a Pot
- Pot name
- What is this Pot for? (optional)
- Create Pot
- Your Pot is ready
- Share this code with your class so they can join.
- Copy code
- Copied
- Anyone with the code can join this Pot.

### pot-home and feed (/p/:potId, /p/:potId/s/:sectionId)

- Build the notes together
- Drop a rough thought, example, correction, or question. Formatting can wait.
- Add contribution
- Latest contributions
- Most recent
- Contributors
- Shared notes
- Open corrections
- Class code
- 4 active today
- 2 open
- Nothing in the pot yet
- Be the first. Write it however it comes to you.
- Add something useful
- Write naturally. AI organizes later.

### composer-write (step 1)

- New contribution
- Saved
- 1 of 3 · Write
- Next: choose a section
- Write it however it comes to you
- No templates, no formatting, no pressure. AI can clean it up after you send.
- Your rough thought
- 132 / 2,000
- Attach
- Voice
- Photo
- Original text will always be preserved.
- Continue

### composer-section (step 2, modal)

- Choose a section
- Skip
- 2 of 3 · Optional
- AI organizes next
- Where might this belong?
- Pick a section if you know it. "Not sure" lets AI suggest one during review.
- Search sections
- Recommended
- Also relevant
- Related
- Matches "nuclear envelope" and "chromatids".
- Not sure where it belongs
- Let AI suggest a section. Nothing is automatic.
- Continue with Week 3

### composer-organizing (step 3, in-place)

- Organizing your note
- Step 3 of 3
- Turning rough thoughts into a clear note
- Your wording stays intact while AI suggests structure and placement.
- Original preserved
- Saved exactly as you wrote it
- Structuring the idea
- Building a scannable explanation
- Suggesting placement
- Matching this to the right section
- Nothing is shared yet
- You'll review every change before classmates see it.
- Cancel and return to draft
- Organizing didn't finish
- Your draft is safe. Try again or share it as written.
- Try again

### composer-review (approval gate)

- Review before sharing
- Ready
- Review required
- Organized
- Original preserved
- Organized by AI
- Suggested placement
- Change
- Key points
- Only you can approve what gets shared.
- Edit
- Share with class

### shared-success (banner on feed)

- Shared with the class
- Shared with the class and credited to you
- Your contribution is live and credited to you.
- Added to
- Credited to Ava Morgan
- Visible with every version
- Live
- 3 key points · Added just now
- View in class notes
- Back to class feed
- Done

### shared-note-detail (/p/:potId/n/:noteId)

- Shared by Ava · Week 3 · 2 hours ago
- Key takeaways
- Original
- History
- Suggest correction
- Built from notes shared in this Pot.
- Select any sentence to suggest a correction.

### suggest-correction (panel stage 1)

- Class note
- Suggest a correction
- Select what seems off, then explain the fix.
- Selected
- What seems off?
- This helps the maintainer review faster.
- Incorrect fact
- Unclear wording
- A maintainer approves changes
- Your proposal won't replace the note automatically.
- Suggest correction
- No changes are public until approved.

### before-after-proposal (panel stage 2)

- Correction proposal
- Show the change
- Your maintainer will compare these side by side.
- Before
- After
- From Ava's shared note
- Replaces one selected sentence
- Why this is more accurate
- 78 / 300
- Evidence attached
- Send to maintainer
- AI can help phrase it. A person decides.

### proposal-status (contributor, /p/:potId/proposals/:id)

- Maintainer review
- Waiting on maintainer
- Ms. Chen is reviewing your proposal
- Usually reviewed within 24 hours
- Review progress
- Proposal submitted
- Evidence attached
- Maintainer reviewing
- Proposed change
- Open the full comparison
- AI cannot publish this change
- A maintainer must accept or request revisions.
- Edit proposal
- We'll notify you when a decision is made.

### decision-outcomes (contributor, same route)

- The maintainer chooses one path
- You'll get a clear next step either way.
- Accepted
- The shared note is updated
- Your correction becomes the newest version and your contribution is credited.
- View updated note
- Revision requested
- Keep working on the same proposal
- Ms. Chen's feedback
- Edit this proposal
- Declined
- This proposal won't change the note
- The note stays as it is, and your proposal stays visible to you.
- Original and every revision stay visible
- Nothing is silently overwritten.
- Back to class feed

### maintainer-review (queue and detail)

- Review
- Open corrections
- Decided
- No open corrections. Nothing is waiting on you.
- Accept
- Request revisions
- Decline
- Tell them what to improve.
- Tell them why. Their proposal stays visible to them.
- Accepting publishes this as the newest version and credits both contributors.
- Only a person can approve this change.

### version-history (/p/:potId/n/:noteId/history)

- Version History
- Timeline
- Current version
- Who changed what, and where it started.
- Compare two versions
- Comparing
- Restore this version
- Restore is available. Compare first so the class can see what would change.
- Correction by Omar · approved by Ms. Chen · Yesterday
- Added
- Removed
- First shared by Ava · Last week

### pot-settings (/p/:potId/settings, /p/:potId/members)

- Pot settings
- Identity
- Pot name
- Invite code
- Copy code
- Regenerate code
- This invalidates the old code. Anyone joining will need the new one.
- Anyone with the code can join this Pot.
- Maintainers
- Add maintainer
- Members
- Manage members
- Remove
- Lead
- You
- Maintainer
- Member
- Owner
- Leave this Pot
- Members see the Pot name and class code only.

### search (/search)

- Search your Pots and notes
- Notes
- Pots
- Sections
- All Pots
- This Pot
- No matches yet. Try a different word from the note.

### my-contributions (/me/contributions)

- Your contributions
- Shared
- Drafts
- Proposals
- Draft
- Resume draft
- Nothing shared yet. Your first note can be rough.
- No drafts. Anything you start is saved here automatically.
- No proposals yet. Suggest a correction from any shared note.


## State machines

CONTRIBUTION (note) STATES: draft -> organizing -> ready_to_review -> shared, with organizing_failed as a recoverable branch and cancel returning organizing -> draft. Details:

- draft: exists from the first keystroke in the composer; autosaved continuously (StatusPill 'Saved'); has body text (<= 2000 chars), optional attachments, optional chosen/deferred section. Visible only to the author. Screens: composer write step (editing), /me/contributions Drafts tab ('Resume draft'), dashboard sidebar. Back-navigation anywhere in the flow never destroys it.
- organizing: entered on 'Continue with [section]' or Skip. AI runs three stages surfaced by StageChecklist (Original preserved -> Structuring the idea -> Suggesting placement). Screen: in-place organizing state replacing the editor; 'Cancel and return to draft' aborts back to draft with nothing lost. Nothing is visible to anyone else; TrustBanner 'Nothing is shared yet'.
- organizing_failed: AI error or timeout. Screen: same in-place card swaps to 'Organizing didn't finish' with 'Try again' (re-enters organizing) and 'Cancel and return to draft'. The draft is never lost; failure never publishes anything.
- ready_to_review: AI output exists (title, summary, key points, suggested placement) alongside the verbatim original. Screen: review step (ReviewCompare) with StatusPill 'Ready' and 'Review required' framing. Author may edit the organized version, change placement, flip to the original, or navigate away (state persists; the draft row in /me/contributions shows 'Ready to review'). NOTHING auto-publishes from this state, ever.
- shared: entered ONLY via the explicit 'Share with class' action. Note becomes version 1, appears at top of the Pot/section feed immediately with StatusPill 'Live', permanent attribution ('Credited to [name] · Visible with every version'). Screens: ToastBanner success on the feed, SharedNoteCard, note detail, /me/contributions Shared tab. From here the note can only change through the proposal machine below; every accepted change appends a version, nothing is silently overwritten.

PROPOSAL (correction) STATES: selecting -> drafting -> pending -> (accepted | revision_requested | declined), with revision_requested -> resubmitted (which is pending again with history retained).

- selecting (local/ephemeral): a sentence is selected on the note body and a reason chip chosen in the correction panel stage 1. Abandoning via X discards silently.
- drafting: stage 2 of the panel; AFTER wording editable, rationale (<= 300 chars), optional evidence; autosaved ('Saved'). Screens: correction panel; /me/contributions Proposals tab shows 'Draft'. Only the proposer sees it.
- pending: entered on 'Send to maintainer'. Contributor screens: proposal page shows amber NoticeBanner 'Waiting on maintainer' with named reviewer and 'Usually reviewed within 24 hours', ProgressTimeline active at 'Maintainer reviewing', read-only comparison, and 'Edit proposal' (editing while pending updates the same proposal in place, timeline notes the edit). Maintainer screens: appears in /p/:potId/review queue (StatusPill 'Waiting'), counts into the 'Open corrections' vital and the nav badge; detail workspace offers Accept / Request revisions / Decline, each human-only.
- accepted: maintainer accepts. Effects: proposed AFTER text replaces the selected sentence as a NEW note version; version history records 'Correction by [proposer] · approved by [maintainer] · [time]'; both contributors credited. Contributor proposal page: green success banner 'Accepted / The shared note is updated' + primary 'View updated note'. Queue: moves to Decided tab. Note detail and History reflect the new current version. Contributor is notified.
- revision_requested: maintainer returns it with required feedback text. Contributor proposal page: amber banner 'Revision requested / Keep working on the same proposal', FeedbackQuote '[Maintainer]'s feedback', primary 'Edit this proposal' which reopens the SAME proposal pre-filled (never start over). Queue: Decided tab as 'Revision requested', reopens to Open when resubmitted. Notified.
- resubmitted: contributor edits and re-sends; state returns to pending with the full timeline preserved (submitted -> revision requested -> resubmitted -> reviewing) as the audit trail on both the contributor page and the maintainer workspace.
- declined: maintainer declines with a reason. The note is untouched; the proposal and its history stay visible to the proposer (neutral/red banner 'Declined / This proposal won't change the note' + reason quote + 'Back to class feed'). Queue: Decided tab. Notified. Reuses the outcome-banner structure per the reference caption.

CROSS-CUTTING GUARANTEES every screen must uphold: the original text is preserved verbatim and always reachable ('Original' toggle, left column of ReviewCompare, version 1 in History); AI never publishes anything (only 'Share with class' by the author and Accept by a maintainer change what classmates see); all versions and proposals remain visible (no silent overwrites); status is always shown as a text label plus functional color, never color alone. RESTORE in version history is a special path: for maintainers it creates a new current version directly (recorded in the timeline); for members it generates a correction proposal that enters the same pending machine.


## Per-screen analyses

### 01-onboarding-flow.png

Purpose: A flow diagram (not a single screen) documenting the entire join-a-Pot onboarding sequence: class-code entry first, code validation with an error loop, Pot confirmation BEFORE any authentication, then a four-way account-status branch (signed in + new to pot, signed in + already member, signed out + has account, no account), all converging on the joined Pot screen. The governing principle is stated in the diagram subtitle: 'One class code first. Pot confirmation second. Authentication only after the user knows what they joined.'

Layout: Left-to-right flowchart on a light canvas. (1) Far left: a START chip feeding a purple mobile-card mock titled 'MeltingPot' containing a labeled CLASS CODE text field (value 'D2Z7GG') and a full-width black 'Join Pot' button. (2) A white decision node 'Is the class code valid?' with a YES pill exiting right and a NO pill exiting down. (3) NO branch: a red-outlined purple error card 'That code didn't work' with a CLASS CODE field (value 'ABC123'), red inline error text 'We couldn't find a pot with that code.', a black 'Try Again' button, and a red annotation 'NO → stay in the code-entry loop' with a dashed connector looping back to the first card - validation failure never leaves the code-entry step. (4) YES branch: a purple card with a yellow circular check icon, heading 'You've joined', subheading 'BIO 101 Study Pot', helper text 'Next, we'll check your MeltingPot status.', and a 'Continue' button. (5) A yellow-outlined decision node 'What's their MeltingPot status?' with caption 'Branch only after the pot is confirmed.' (6) A vertical stack of four branch cards on the right, each with a small-caps branch label: SIGNED IN • NEW TO POT, SIGNED IN • ALREADY A MEMBER, SIGNED OUT • HAS ACCOUNT, NO ACCOUNT. (7) Far right: all four branches converge via connectors into a final joined-Pot screen mock: blue 'MeltingPot' header bar with a yellow 'JOINED' badge, title 'BIO 101 Study Pot', meta line '28 contributors • notes updating live', and a 2x2 tile grid (Raw Notes / Summary / Flashcards / Practice).

Components:
- Code-entry card: label 'CLASS CODE', single text input showing a 6-character code 'D2Z7GG', primary button 'Join Pot'
- Decision node 1: 'Is the class code valid?' with YES and NO edge labels
- Error card (red-outlined): heading 'That code didn't work', CLASS CODE field re-shown with the bad value 'ABC123', red inline error 'We couldn't find a pot with that code.', button 'Try Again'; annotation confirms failure stays in the code-entry loop rather than navigating away
- Join-confirmation card: circular check icon, heading 'You've joined', Pot name 'BIO 101 Study Pot' shown before any sign-in, helper 'Next, we'll check your MeltingPot status.', button 'Continue'
- Decision node 2: 'What's their MeltingPot status?' with caption 'Branch only after the pot is confirmed.'
- Branch card A (SIGNED IN • NEW TO POT): heading 'Pot added to your kitchen', body 'Membership is saved instantly. No extra setup required.', button 'Open Pot'
- Branch card B (SIGNED IN • ALREADY A MEMBER): heading 'Welcome back', body 'This pot is already in your vault, so nothing gets duplicated.', button 'Return to Pot' - idempotent re-join, no duplicate membership
- Branch card C (SIGNED OUT • HAS ACCOUNT): heading 'Log in to keep your spot', body 'BIO 101 Study Pot is waiting for you.', labeled EMAIL field with placeholder 'you@example.com', button 'Log In & Open Pot' - login form pre-contextualized with the Pot the user just joined
- Branch card D (NO ACCOUNT • POT ALREADY JOINED): heading 'You're in - save your account', body 'Create an account so this pot stays in your vault.', labeled fields DISPLAY NAME ('Your name') and EMAIL ('you@example.com'), button 'Create Account & Enter' - minimal two-field signup, framed as saving membership already granted
- Final joined-Pot screen: header with 'JOINED' status badge, Pot title 'BIO 101 Study Pot', meta '28 contributors • notes updating live', 2x2 tile grid: 'Raw Notes / Shared notes from everyone.', 'Summary / Fresh summary ready.' (highlighted), 'Flashcards / Generate from the pot.', 'Practice / Quiz the full vault.'

Interactions:
- 'Join Pot' submits the 6-character class code for validation
- Invalid code → error card with the field retained and 'Try Again'; the flow explicitly loops back to code entry and never dead-ends or redirects
- Valid code → 'You've joined [Pot name]' confirmation; the user sees WHAT they joined before any auth wall
- 'Continue' → account-status check that branches four ways
- Signed in + new: 'Open Pot' → straight into the Pot (membership auto-saved, zero extra steps)
- Signed in + already a member: 'Return to Pot' → existing Pot, no duplication
- Signed out + has account: email login → 'Log In & Open Pot' lands directly inside the Pot, not on a generic dashboard
- No account: name + email → 'Create Account & Enter' lands directly inside the Pot; Pot membership is preserved through account creation
- All four branches converge on the same joined-Pot home screen showing a JOINED badge

Desktop adaptation: Render each flow step as a single centered card (~420-480px) on the warm off-white paper background with generous whitespace - no left nav until the user is inside a Pot. Make the class-code input a large 6-character segmented/monospace input with auto-uppercase and inline validation; 'Join Pot' as a deep forest green primary button. The 'You've joined' confirmation can widen into a Pot preview card (Pot name, contributor count, a few recent shared-note titles) so the desktop user sees richer proof of what they joined before authenticating. Login and create-account branches stay as centered single-column cards with the Pot name persistently visible as context (small clay-accented eyebrow text). Error state uses functional red text under the field only; keep the retry-in-place loop. After auth, route directly into the desktop Pot home with its persistent left nav shell.

Must ignore:
- All purple card backgrounds, blue header bars, blue buttons, and yellow badges/highlights (old styling)
- Black button fills - replace with deep forest green primary actions
- Mobile card dimensions and phone-frame proportions
- 'Pot added to your kitchen' - kitchen metaphor is off-voice; prefer neutral membership language
- Flashcards and Practice tiles on the final joined-Pot screen ('Generate from the pot.', 'Quiz the full vault.')
- The Raw Notes / Summary / Flashcards / Practice 2x2 structure of the final screen - the real destination is the Pot home / shared-note feed
- Yellow 'Summary / Fresh summary ready.' highlight styling
- No school-initials or school-verification step exists in the final product (none is shown here either - do not add one)

### 02-returning-user-dashboard.png

Purpose: Returning-user desktop dashboard: a personalized landing page that greets the user, surfaces their memberships (courses here → Pots in the final product) as cards, lists recently used items with one-click Open actions, and holds a right sidebar of secondary panels. Used strictly as a structural reference for the desktop shell, global search placement, main/right-sidebar proportions, membership cards, and the recently-used area.

Layout: Full-width desktop page. (1) Top bar (white, thin bottom border): 'Meltingpot' wordmark far left; a wide global search field with magnifier icon and placeholder 'Search courses, notes, practice' occupying most of the bar; far right a red flame streak icon and a circular blue avatar with initial 'A'. (2) Body on a very light gray background, split roughly 70/30. Main column (left): H1 greeting 'Good afternoon, Ada' with a one-line status subline 'Two courses in progress. Ionic Bonds is next in Chemistry 7.'; small section label 'Courses'; two equal-width membership cards side by side; then section label 'Recently used' above one wide card containing a three-row list. (3) Right sidebar column: three stacked cards - 'Upcoming' (three title+day rows), a '12 day streak' card with flame icon, weekly stats and a recent-acceptance line, and a 'Quick upload' card with a sentence and four chip buttons (Notes, PDF, Image, Resource). Everything is flat white cards with subtle 1px borders and rounded corners on a light ground - structurally already close to the target aesthetic.

Components:
- Top bar: wordmark, full-width global search input ('Search courses, notes, practice'), streak icon (ignore), avatar button
- Greeting block: time-of-day greeting with first name ('Good afternoon, Ada') plus a single-sentence status line summarizing what's next
- Membership card (x2): leading book icon + course title ('Chemistry 7' / 'World History 8'), institution subline ('Greenfield International School' - ignore), an inset light-gray chip block with current unit and next task ('Module 2 Chemical Bonding / Next: Lesson 4 Ionic Bonds, quiz Friday'), and a footer activity stat ('3 student notes accepted this week' / '1 accepted contribution this week')
- Recently used card: three rows, each with bold item title, gray meta line (parent course + recency: 'Chemistry 7  opened 2 hours ago'), and a right-aligned 'Open' text link; rows separated by hairline dividers
- Sidebar 'Upcoming' card: three rows of task title left / weekday right (ignore content - deadlines)
- Sidebar streak card: flame icon, '12 day streak', stat row 'Study 8  Contribute 5  Review 3 this week', line 'Accepted note on ionic bonds yesterday' (ignore streaks; the accepted-note activity line is a useful pattern)
- Sidebar 'Quick upload' card: helper sentence and four pill chips: Notes, PDF, Image, Resource (ignore feature)

Interactions:
- Global search from anywhere in the shell (placeholder scopes it: courses, notes → adapt to Pots and shared notes)
- Membership card click → that course/Pot home
- 'Open' link per recently-used row → jumps straight back into that item
- Avatar → account menu (implied)
- Quick upload chips → upload flows (ignore feature)
- Upcoming rows → task detail (ignore feature)

Desktop adaptation: Keep the 70/30 main-plus-right-sidebar proportion and the flat-white-cards-on-soft-ground structure, but mount it inside the master prompt's persistent left nav shell (Home, My Pots, Join a Pot, Create a Pot, account at bottom) with the global search moved into the top bar of the shell ('Search your Pots and notes'). Main column: greeting + one-line status ('2 Pots · your note on X was shared yesterday'), then 'Your Pots' as a responsive card grid - each Pot card carrying Pot name, member/contributor count, and an activity stat like '3 notes shared this week' in place of module/deadline chips - then 'Recently used' rows pointing at recently viewed shared notes and drafts with green 'Open' links. Right sidebar: 'Recent shared notes' across Pots, 'Your contributions' (with pending/shared status pills in functional colors), and a card with two actions: 'Join a Pot' (class-code field) and 'Create a Pot'. Paper background, white cards, subtle borders, forest green links/buttons, small clay accents for eyebrows or counts.

Must ignore:
- School labels ('Greenfield International School')
- Deadline content ('quiz Friday', 'source analysis due Thursday', entire 'Upcoming' card)
- Streak system (flame icon in top bar, '12 day streak' card, 'Study 8 Contribute 5 Review 3 this week')
- Flashcards and practice rows in Recently used ('Flashcards Chemical Bonding', 'Practice set Module 2', '8 of 12 correct')
- 'Quick upload' card and its Notes/PDF/Image/Resource chips (not an MVP feature in this form)
- Current colors: blue avatar, blue 'Open' links, red flame - replace with forest green actions and functional color only
- Course/module/lesson vocabulary - everything becomes Pots and shared notes

### 03-pot-home-layout.png

Purpose: A course/lesson home page used purely as a desktop layout skeleton for the Pot home: compact top navigation with context title, a thin left rail for section navigation, breadcrumb + large page title, a horizontal row of four summary-metric cards, and two-by-two large content regions below. The module/lesson/flashcard/practice content itself must be discarded and redesigned as a Pot home with a shared-note feed.

Layout: (1) Compact top nav bar (~56px, white, bottom border): far left a hamburger menu icon plus back and forward chevrons; centered bold context title 'Chemistry 7'; far right the user's name 'Ada', a red flame icon, a checkmark icon, and a brightness/theme (sun) icon. (2) Thin white left rail (~85px wide, full height, right border) holding a vertical numbered section stepper: '1', '2', '3' - item 3 wrapped in a tall yellow rounded rectangle marking the active section. (3) Content area on light gray: small gray breadcrumb/eyebrow 'Module 2 Chemical Bonding' above a large bold H1 'Lesson 4 Ionic Bonds'. (4) A row of four equal metric cards, each with a small gray label over a bold value: 'Current module / Chemical Bonding', 'Next deadline / Quiz Friday', 'Change requests / 2 open', 'Contributors / 4 active today'. (5) Below, a 2x2 grid of large white region cards (left column ~40% width, right ~60%), each with a small line icon, bold title, and one-line gray description, with generous empty body space: 'Raw Notes', 'Summary', 'Flashcards', 'Practice'.

Components:
- Top nav: hamburger (global nav drawer), back/forward history chevrons, centered Pot-context title, right-side user name + utility icons (flame = streak, checkmark, theme toggle)
- Left rail section stepper: numbered items 1/2/3 with a filled rounded-rectangle highlight on the active item - a minimal persistent section switcher
- Breadcrumb eyebrow ('Module 2 Chemical Bonding') + page H1 ('Lesson 4 Ionic Bonds') hierarchy pattern
- Metric card pattern: tiny muted label + bold value; the four instances: 'Current module / Chemical Bonding', 'Next deadline / Quiz Friday', 'Change requests / 2 open', 'Contributors / 4 active today'
- Large content-region card: icon + bold title + one-line description + large empty canvas; instances: 'Raw Notes / Student workspace for this lesson. Clean up, upload, or make a copy.', 'Summary / Organized takeaways from the shared pot, derived from the notes.', 'Flashcards / 12 of 40 reviewed. Help me study when you want a guided pass.', 'Practice / Student-created quizzes first. Start a mixed set or write one from this lesson.'

Interactions:
- Hamburger → global navigation drawer
- Back/forward chevrons → browser-style history within the app
- Left-rail numbered items → switch between sections of the course (active state = filled highlight); adapt to Pot sections
- Metric cards read as glanceable status; 'Change requests / 2 open' implies click-through to a review queue - adapt to open corrections
- Each large region card is an entry point to a full workspace (Raw Notes editor, Summary view, etc.)
- Theme toggle icon in top bar

Desktop adaptation: Keep the three-band skeleton - compact top bar, slim left section nav, wide content with metrics row over large regions - but redesign the content as a Pot home. Merge the hamburger rail into the persistent left nav: Pot name at top, then named Pot sections (not bare numbers - use section titles with the active one marked by a soft green-tinted rounded highlight instead of yellow), plus Feed / Members / Settings entries. Top bar keeps the centered Pot title (or moves it left), global search, and the user avatar; drop flame and checkmark. Metrics row becomes Pot vitals: 'Contributors / 12', 'Shared notes / 48', 'Open corrections / 2', 'Class code / D2Z7GG (copy)'. Replace the 2x2 lesson grid with: a dominant shared-note feed region (recent contributions with contributor identity and timestamps), a sections overview region, and a contributor-activity side region - with one unmissable deep forest green 'Add contribution' button in the page header. White flat cards, subtle borders, paper ground, functional color only on the corrections count.

Must ignore:
- Module/lesson structure ('Module 2 Chemical Bonding', 'Lesson 4 Ionic Bonds') and all official-course concepts
- Flashcards region and its copy ('12 of 40 reviewed...')
- Practice region and its copy ('Student-created quizzes first...')
- 'Next deadline / Quiz Friday' metric - no deadlines in MVP
- Numbered-only section rail (use named sections)
- Yellow active-state highlight, red flame streak icon, checkmark icon
- 'Raw Notes' as a per-lesson student workspace concept - in MeltingPot the original note lives with each contribution, not as a lesson tab
- Light gray content background and current neutral palette - use warm off-white paper instead

### 04-class-feed.png

Purpose: Mobile class feed for one Pot section: establishes the feed hierarchy - Pot + section context header, a short motivational introduction banner with the primary Add contribution action, a sorted list of compact shared-note cards with contributor identity, timestamps and one-line summaries, and a repeat add-contribution affordance at the end of the feed.

Layout: Single mobile column in a rounded phone-width card. (1) Header: small-caps gray eyebrow 'MELTINGPOT · BIO 101' (app + Pot context), bold H1 'Week 3 · Mitosis' (section title), search icon at top right. (2) Dark navy rounded banner: small-caps eyebrow 'CLASS KNOWLEDGE POT', white heading 'Build the notes together', body 'Drop a rough thought, example, correction, or question. Formatting can wait.', and a right-aligned white pill button '+ Add contribution'. (3) Feed header row: bold label 'Latest contributions' with a small outlined sort pill 'Most recent ▾' below it. (4) Three white shared-note cards, stacked with subtle borders/shadow, each: circular tinted avatar with initial (A lavender, B blue, C pink) + contributor first name (Ava / Ben / Chloe) on the left, relative timestamp right-aligned (2h / 5h / 1d); bold note title ('Chromosomes line up at the center' / 'How spindle fibers separate chromatids' / 'Cytokinesis finishes the split'); one-to-two-line gray summary ('A quick way to remember metaphase: "middle" starts with M.' / 'They attach at the centromere and shorten toward opposite poles.' / 'The cytoplasm divides after the two nuclei have formed.'); gray meta footer 'Week 3 · 4 comments' (section tag + comment count). (5) Terminal card: dark circular '+' button beside bold 'Add something useful' and gray subline 'Write naturally. AI organizes later.'

Components:
- Context header: app+Pot eyebrow ('MELTINGPOT · BIO 101'), section title as H1 ('Week 3 · Mitosis'), search icon
- Intro banner (call-to-contribute): eyebrow 'CLASS KNOWLEDGE POT', heading 'Build the notes together', friction-lowering body copy 'Drop a rough thought, example, correction, or question. Formatting can wait.', pill button '+ Add contribution'
- Feed header: 'Latest contributions' label + sort dropdown pill 'Most recent'
- Shared-note card (x3): avatar initial + contributor first name + relative timestamp; bold plain-language title; one-line summary; footer meta with section tag and comment count ('Week 3 · 4 comments')
- End-of-feed add card: '+' icon button, 'Add something useful', 'Write naturally. AI organizes later.' - a second, low-pressure entry into the composer

Interactions:
- Search icon → search within the Pot
- '+ Add contribution' (banner) → the Write anything composer
- 'Most recent' pill → sort/filter options for the feed
- Tapping a shared-note card → shared-note detail/reading page
- Comment count in card footer implies a comments/discussion surface on the note detail
- Section tag ('Week 3') in the footer links the note to its section
- End-of-feed '+' card → same composer (redundant affordance so the action is reachable after scrolling)

Desktop adaptation: Place the feed in the center column (~680-760px max-width) of the persistent left-nav shell, with the Pot's sections in the left nav making the 'Week 3 · Mitosis' context header a lightweight breadcrumb + H1. Convert the dark banner into a flat white (or softly green-tinted) intro card with the same copy - 'Build the notes together' + 'Formatting can wait.' - and a deep forest green 'Add contribution' button; also pin 'Add contribution' in the page header so it never scrolls away, replacing the end-of-feed '+' card. Keep the note cards compact and scannable exactly as structured (avatar + name + timestamp / bold title / one-line summary / section + comment meta), with clay-tinted or neutral avatar circles instead of purple/pink. Add a right-hand contextual side panel (~300px) showing section description, contributor list/activity, and Pot vitals. Sort control stays as a small outlined pill above the cards.

Must ignore:
- Mobile phone-width dimensions and single-column-only layout
- Dark navy banner styling and white-on-dark pill button - recolor to the warm paper / forest green system
- Lavender, blue, and pink avatar tints (old palette)
- The floating dark '+' circle styling on the terminal card
- 'Week 3' numbering is fine as a section name pattern, but do not import any official-course week/lesson structure requirements
- No streaks, flashcards, practice, or school concepts appear here - do not add any

### 05-write-anything.png

Purpose: Step 1 of the 3-step contribution flow: a deliberately low-friction plain-text composer where a student dumps a rough, unformatted thought. It removes every gate (no title, no tags, no formatting, no required section) and reassures the student that the original wording is kept verbatim before AI touches anything.

Layout: Single mobile card on a pale gray-blue backdrop. Top to bottom: (1) Header bar - back chevron at left, bold title 'New contribution' centered-left, a small light-gray 'Saved' status pill at far right. (2) A pill-shaped stepper capsule spanning the width: left segment is a dark filled pill reading '1 of 3 · WRITE', right segment is a white/outlined region reading 'Next: choose a section'. (3) Large bold headline 'Write it however it comes to you'. (4) Muted gray subline 'No templates, no formatting, no pressure. AI can clean it up after you send.' (5) The dominant region: a tall white bordered textarea card (~40% of screen height) with tiny uppercase field label 'YOUR ROUGH THOUGHT' at top, informal lowercase student text filling the field, and a right-aligned character counter '132 / 2,000' at the field's bottom. (6) A horizontal row of three equal outlined icon+label buttons: 'Attach' (paperclip), 'Voice' (microphone), 'Photo' (image icon). (7) A full-width light-gray rounded reassurance banner with a lock icon: 'Original text will always be preserved.' (8) A full-width dark rounded primary CTA 'Continue' with a right-arrow glyph.

Components:
- Header bar: back chevron button, page title 'New contribution', autosave status pill 'Saved' (muted gray, non-interactive)
- Segmented step-progress capsule: filled dark pill '1 of 3 · WRITE' + inactive segment 'Next: choose a section' (tells current step AND previews the next one)
- Headline block: H1 'Write it however it comes to you' with supporting line 'No templates, no formatting, no pressure. AI can clean it up after you send.'
- Plain-text composer card: uppercase micro-label 'YOUR ROUGH THOUGHT', multiline free-text area containing example rough note 'i think the nuclear envelope disappears before the chromosomes move apart not after - prof said this order matters for the exam' (intentionally lowercase/unpolished), character counter '132 / 2,000' bottom-right
- Attachment action row: three equal-width outlined secondary buttons with leading icons - 'Attach', 'Voice', 'Photo'
- Reassurance banner: lock icon + single line 'Original text will always be preserved.' on a subtle gray surface
- Primary CTA: full-width dark filled button 'Continue' with trailing arrow icon

Interactions:
- Back chevron → returns to the previous screen (Pot home / class feed) without losing the draft (autosave implied by the 'Saved' pill)
- Typing in the textarea → autosaves continuously; 'Saved' pill reflects draft persistence; counter updates against the 2,000-char limit
- 'Attach' → file picker for optional attachment
- 'Voice' → optional voice input/recording
- 'Photo' → optional image capture/upload
- 'Continue' (single, unambiguous forward action) → advances to Step 2, the optional section chooser (06-optional-section)
- 'Saved' pill is a status indicator, not a button; no submit/publish happens on this screen

Desktop adaptation: Render inside the persistent left-nav app shell with Pot context in the top bar. Center a wide writing surface (~720-840px max-width white card on the warm off-white paper background) so the textarea becomes a generous multi-paragraph editor with room to breathe; put the '1 of 3 · Write' stepper as a slim horizontal indicator above the headline within the content column. Keep the headline and 'no formatting' subline above the editor. Move the Attach/Voice/Photo actions to a compact icon-button row docked at the editor's bottom-left, and the lock reassurance line plus the forest-green 'Continue' button in a sticky footer bar bottom-right of the surface. A slim contextual right panel can show the Pot name, section list preview, and the 'Original text will always be preserved' reassurance - but nothing in it may be required. Absolutely no added title, tag, content-type, formatting toolbar, or mandatory section field.

Must ignore:
- Mobile card dimensions and single-column phone layout
- Dark navy/near-black fills on the stepper pill and Continue button - primary actions become deep forest green on the target design
- Pale blue-gray page backdrop - replace with warm off-white paper background
- System-default typography - replace with Inter
- Do not treat Voice/Photo as required or as flashcard/practice capture features - they are strictly optional attachments

### 06-optional-section.png

Purpose: Step 2 of the contribution flow: optional placement. The student may pick where the note belongs (with an AI-recommended section pre-selected and justified), search for another section, or explicitly defer with 'Not sure where it belongs' - and can skip the whole step. It guarantees the student never has to understand the Pot's organization to contribute.

Layout: Single mobile card. Top to bottom: (1) Header - back chevron, title 'Choose a section', text button 'Skip' at far right. (2) Stepper capsule: dark filled segment '2 of 3 · OPTIONAL' + inactive segment 'AI organizes next'. (3) Bold headline 'Where might this belong?' with muted subline 'Pick a section if you know it. "Not sure" lets AI suggest one during review.' (4) Search input with magnifier icon and placeholder 'Search sections'. (5) A vertical stack of section option cards: first a dark filled SELECTED card (eyebrow 'RECOMMENDED', title 'Week 3 · Mitosis', evidence line 'Matches "nuclear envelope" and "chromatids".', white check-circle at right); then two white outlined cards with right chevrons - eyebrow 'ALSO RELEVANT' / title 'Exam 1 review' / subline 'Common misconceptions and exam reminders.', and eyebrow 'RELATED' / title 'Week 2 · Cell cycle' / subline 'Preparation before mitosis begins.' (6) A visually distinct fallback card with a circled '?' icon: 'Not sure where it belongs' / 'Let AI suggest a section-nothing is automatic.' (7) Full-width dark CTA 'Continue with Week 3' with trailing arrow - its label names the current selection.

Components:
- Header: back chevron, title 'Choose a section', secondary text action 'Skip'
- Step capsule: '2 of 3 · OPTIONAL' (filled) + 'AI organizes next' (inactive preview segment) - the word OPTIONAL is baked into the stepper itself
- Headline + helper: 'Where might this belong?' / 'Pick a section if you know it. "Not sure" lets AI suggest one during review.'
- Search field: magnifier icon, placeholder 'Search sections'
- Recommended section card (selected state): eyebrow label 'RECOMMENDED', section name 'Week 3 · Mitosis', AI-evidence microcopy 'Matches "nuclear envelope" and "chromatids".' quoting the student's own words, trailing check-circle indicating selection
- Alternative section cards with relevance eyebrows: 'ALSO RELEVANT' → 'Exam 1 review' ('Common misconceptions and exam reminders.'), 'RELATED' → 'Week 2 · Cell cycle' ('Preparation before mitosis begins.'), each with a right chevron affordance
- Deferral card: '?' badge, 'Not sure where it belongs', 'Let AI suggest a section-nothing is automatic.'
- Context-aware primary CTA: 'Continue with Week 3' - button text updates to reflect the chosen section

Interactions:
- Back chevron → returns to the composer (step 1) with the draft intact
- 'Skip' → proceeds to AI organizing with no section chosen (functionally same as 'Not sure')
- Search field → filters/finds sections beyond the three suggested cards
- Tapping the recommended card → toggles selection (check-circle marks the selected state; selected card is visually filled)
- Tapping 'Exam 1 review' or 'Week 2 · Cell cycle' → selects that section instead; the CTA label changes to match (e.g. 'Continue with Exam 1 review')
- Tapping 'Not sure where it belongs' → selects deferral; AI will propose placement at the review step, and nothing is placed automatically
- 'Continue with Week 3' → advances to Step 3, the AI organizing state (07-ai-organizing)

Desktop adaptation: Present as a modal dialog or slide-over panel layered on the composer within the left-nav shell (placement is a quick optional decision, not a destination page). Inside a ~560-640px panel: search at top, recommended card pinned first with a forest-green border/fill and check for the selected state, alternatives below as flat white cards with subtle borders; the 'Not sure' deferral card visually separated at the bottom; sticky footer with 'Skip' as a quiet text button and the green 'Continue with [section]' button. With more width, a two-pane variant works: section list with search on the left, a preview of the chosen section (its recent notes) on the right. The evidence line quoting the student's own words ('Matches "..."') should be kept - it is the best explanation of why the recommendation exists.

Must ignore:
- Mobile card dimensions and single-column stack
- Dark navy fill for the selected card and CTA - selected state should use forest green with a visible check plus border, never color alone
- Any temptation to make section choice mandatory - Skip and 'Not sure' must both survive
- Blue-gray backdrop and system font - warm paper background and Inter instead
- Example week/exam section names are placeholder content, not required structure (no official-course module/lesson hierarchy)

### 07-ai-organizing.png

Purpose: Step 3 processing state: an in-place, non-chatbot progress screen shown while AI structures the note. It communicates three parallel guarantees - the original is preserved verbatim, the idea is being structured, and a placement is being suggested - while explicitly promising that nothing has been shared and the student reviews everything first.

Layout: Single mobile card. Top to bottom: (1) Header - back chevron beside a two-line title block: tiny uppercase eyebrow 'NEW CONTRIBUTION' over bold 'Organizing your note'. (2) Progress region: small uppercase label 'STEP 3 OF 3' above a full-width, fully-filled dark progress bar. (3) Dominant centered status card (white, rounded, subtle shadow): a circled sparkle glyph at top center; headline 'Turning rough thoughts into a clear note'; subline 'Your wording stays intact while AI suggests structure and placement.'; then a hairline-divided vertical checklist of three stages - stage 1 with a green check-circle: 'Original preserved' / 'Saved exactly as you wrote it' (complete); stage 2 with a dark in-progress spinner circle: 'Structuring the idea' / 'Building a scannable explanation' (active); stage 3 with a muted numbered circle '3': 'Suggesting placement' / 'Matching this to the right section' (pending, dimmed, partially clipped by the card fold). (4) Gray reassurance banner with lock icon: bold 'Nothing is shared yet' / 'You'll review every change before classmates see it.' (5) Full-width white outlined secondary button 'Cancel and return to draft'. No primary CTA exists - the screen advances itself.

Components:
- Header with eyebrow pattern: 'NEW CONTRIBUTION' micro-label above the screen title 'Organizing your note'
- Linear progress: 'STEP 3 OF 3' label + filled bar (flow-level progress, distinct from the stage checklist)
- Central status card: circular icon badge (sparkle), headline 'Turning rough thoughts into a clear note', subline 'Your wording stays intact while AI suggests structure and placement.'
- Three-stage status checklist with distinct state glyphs: completed = green check-circle ('Original preserved' / 'Saved exactly as you wrote it'); active = dark spinner disc ('Structuring the idea' / 'Building a scannable explanation'); pending = muted numbered circle ('Suggesting placement' / 'Matching this to the right section')
- Trust banner: lock icon, 'Nothing is shared yet', 'You'll review every change before classmates see it.'
- Escape hatch: outlined secondary button 'Cancel and return to draft'

Interactions:
- Screen is transient and self-advancing: stages complete top-to-bottom (check replaces spinner replaces number) and the app auto-navigates to the review screen (08-review-before-sharing) when stage 3 finishes
- 'Cancel and return to draft' → aborts AI processing and returns to the composer with the draft untouched (nothing lost, nothing shared)
- Back chevron → equivalent escape to the previous step
- No chat input, no streaming text, no user decision required mid-process

Desktop adaptation: Keep it in-place inside the same left-nav shell and content column the composer occupied - the editor surface is replaced by (or overlaid with) a centered status card of ~480-560px max-width on the warm paper background, so it reads as the same flow pausing, not a new destination. Stage checklist stays vertical with generous line height; use functional green only for the completed check, charcoal for the active spinner, muted gray for pending. Keep 'Nothing is shared yet' as a quiet banner directly under the card and 'Cancel and return to draft' as a centered outlined button beneath it. Use a subtle determinate/indeterminate bar or simple spinner - motion should be restrained. Auto-transition to the review screen; optionally leave the three completed stages briefly visible before navigating.

Must ignore:
- Mobile dimensions
- The sparkle glyph as-is - no glowing effects, no AI mascot, no purple AI branding; if an icon is needed use a neutral charcoal line icon (e.g. layers/sort/document)
- Any temptation to add fake terminal logs, streaming token output, or a chatbot conversation - this must stay a quiet in-place progress state
- Dark navy accents and blue-gray backdrop - charcoal text, forest-green primary, warm paper background instead
- System font - use Inter

### 08-review-before-sharing.png

Purpose: The mandatory contributor-approval gate: after AI organizing, the student inspects the organized note against the preserved original, confirms or changes the suggested placement, edits the organized version if needed, and only then explicitly publishes with 'Share with class'. Nothing reaches classmates until this approval.

Layout: Single mobile card. Top to bottom: (1) Header - back chevron, eyebrow 'NEW CONTRIBUTION' over bold title 'Review before sharing', and a light-green status pill 'Ready' at far right. (2) Progress region: uppercase label 'REVIEW REQUIRED' above a fully-filled dark bar. (3) Segmented control with two tabs: 'Organized' (active, dark filled) and 'Original preserved' (inactive gray) - the view switcher between AI output and verbatim input. (4) Suggested-placement bar: a white bordered card with folder icon, eyebrow 'SUGGESTED PLACEMENT', breadcrumb 'Week 3 › Mitosis', and a small 'Change' button at right. (5) The organized-note preview card (dominant region): a small 'AI-' chip at top-left and a pencil edit icon-button at top-right; note title 'Why mitosis produces identical cells'; one-sentence summary 'Mitosis copies and separates chromosomes so each daughter cell receives the same genetic information.'; uppercase label 'KEY POINTS'; three numbered list rows on light-gray rounded strips - '1 DNA is copied before the cell divides.', '2 Chromosomes separate into matching sets.', '3 Each new cell keeps the same chromosome count.' (6) Footer above the actions: eye icon + 'Only you can approve what gets shared.' (7) Action row: outlined secondary 'Edit' button (left, ~1/3 width) and dark filled primary 'Share with class' button (right, ~2/3 width).

Components:
- Header with eyebrow 'NEW CONTRIBUTION', title 'Review before sharing', and success-tinted status pill 'Ready'
- Progress strip labeled 'REVIEW REQUIRED' (frames review as a required step, not an optional preview)
- Two-tab segmented control: 'Organized' | 'Original preserved' - swaps the content region between the AI-structured note and the untouched original text
- Suggested placement card: folder icon, 'SUGGESTED PLACEMENT' eyebrow, breadcrumb path 'Week 3 › Mitosis', inline 'Change' button reopening the section picker
- Organized note card: provenance chip ('AI-', i.e. AI-organized marker), pencil edit affordance, generated title, one-line summary, 'KEY POINTS' header, numbered key-point rows (1-3) each on its own subtle strip
- Contributor-control reassurance line: eye icon + 'Only you can approve what gets shared.'
- Dual action bar: secondary outlined 'Edit' + primary filled 'Share with class'

Interactions:
- 'Organized' / 'Original preserved' tabs → toggle the content region between the AI-structured note and the verbatim original text (original is read-only proof of preservation)
- 'Change' on the placement card → reopens the section chooser (same surface as 06-optional-section) to pick a different section
- Pencil icon on the note card and the 'Edit' button → open inline editing of the organized note (title, summary, key points) before sharing
- 'Share with class' → the explicit, sole publish action; leads to the shared-success confirmation (09) and the note appears in the Pot feed
- Back chevron → returns toward the flow's earlier steps without publishing
- 'Ready' pill is a status (AI processing complete), not a control; nothing publishes automatically

Desktop adaptation: This is the screen that benefits most from width: replace the tabs with a two-column comparison inside the left-nav shell - left column 'Original preserved' (read-only, verbatim rough text on a white card labeled clearly), right column 'Organized' (editable card with title, summary, key points, pencil affordance) - with the 'Suggested placement - Week 3 › Mitosis - Change' bar spanning both columns above, and a sticky bottom action bar carrying the eye-icon reassurance line at left and 'Edit' (outlined) + forest-green 'Share with class' at right. Retain the tabbed pattern only as the responsive fallback below ~900px. Replace the 'AI-' chip with a quiet neutral text label such as 'Organized by AI' in muted charcoal - no branded chip. The 'Ready' pill maps cleanly to the functional success color.

Must ignore:
- Mobile dimensions and the tabs-only comparison (desktop should show original vs organized side by side; tabs are the narrow-width fallback only)
- The 'AI-' branded chip styling - no AI badge branding; a plain neutral provenance label only
- Dark navy fills for the active tab and 'Share with class' button - forest green primary, charcoal text
- Blue-gray backdrop and system font - warm off-white paper and Inter
- No school, streak, flashcard, or practice elements exist here, and none may be introduced; the biology copy is placeholder demo content

### 09-shared-success.png

Purpose: Post-approval confirmation state shown immediately after the contributor approves and shares their organized note. It confirms the note is live in the Pot, shows where it was filed, guarantees permanent contributor credit, previews the shared note, and offers two exits: view the note in context or return to the class feed.

Layout: Mobile card (~438px wide) on a light page. TOP BAR: white header strip with uppercase wordmark 'MELTINGPOT' at left and a light-gray 'Done' pill button at right; thin divider below. HERO REGION (centered, on off-white body): large circular success badge - pale green circle with a dark green checkmark - followed by a large bold charcoal H1 'Shared with the class' and a gray one-line subhead 'Your contribution is live and credited to you.' STACKED CARD REGION (full-width cards with generous spacing): (1) white rounded 'ADDED TO' placement card with a folder outline icon at left, tiny uppercase gray eyebrow 'ADDED TO', bold breadcrumb 'Week 3 › Mitosis', and a right chevron indicating navigation; (2) light-gray filled attribution row with a dark circular avatar ('AM' in white), bold 'Credited to Ava Morgan' and sub-line 'Visible with every version'; (3) white rounded shared-note preview card with a pale-green uppercase 'LIVE' pill at top-left, bold note title 'Why mitosis produces identical cells', a two-line gray summary paragraph, a hairline divider, and a small meta footer '3 key points  •  Added just now'. ACTION REGION (bottom): full-width dark pill primary button 'View in class notes' stacked above a full-width white outlined secondary pill 'Back to class feed'.

Components:
- Top app bar: 'MELTINGPOT' uppercase wordmark left, 'Done' dismiss pill button right
- Circular success indicator: pale green disc containing a dark green checkmark (flat, no gradient)
- Headline block: H1 'Shared with the class' + gray subhead 'Your contribution is live and credited to you.'
- Placement card ('ADDED TO'): folder icon, uppercase eyebrow label 'ADDED TO', section breadcrumb 'Week 3 › Mitosis' in bold, trailing chevron (tappable, navigates to that section)
- Attribution row (filled gray surface): circular initials avatar 'AM' (dark fill, white text), primary line 'Credited to Ava Morgan', secondary line 'Visible with every version'
- Shared-note preview card: status pill 'LIVE' (pale green background, green uppercase text), bold note title 'Why mitosis produces identical cells', 2-line AI summary 'Mitosis copies and separates chromosomes so each daughter cell receives the same genetic information.', divider, meta row '3 key points • Added just now'
- Primary button: full-width dark pill 'View in class notes' (remap fill to deep forest green)
- Secondary button: full-width white outlined pill 'Back to class feed'

Interactions:
- 'Done' (top-right) - dismisses the contribution flow, returning to the Pot feed
- 'ADDED TO Week 3 › Mitosis' card with chevron - navigates to the section where the note now lives
- Shared-note preview card - implied tap-through to the new note's detail page
- 'View in class notes' primary button - opens the note in context in the Pot's shared notes
- 'Back to class feed' secondary button - returns to the Pot feed, where the new contribution should already appear at the top
- Attribution row - informational only (no visible affordance), communicates permanent credit across all future versions

Desktop adaptation: Render inside the persistent left-nav app shell as a centered confirmation panel (max ~640px) in the main content area: success badge, headline, and the three info cards, with 'View in class notes' (forest green) and 'Back to class feed' side by side as a horizontal button pair rather than stacked. A stronger desktop option: skip a dedicated page and return the user to the Pot feed with a dismissible success banner ('Shared with the class - credited to you') while the newly shared note card appears at the top of the feed with the LIVE pill briefly highlighted; keep the placement breadcrumb and credit line inside the banner. Either way the new contribution must appear in the feed immediately.

Must ignore:
- Mobile card dimensions and single-column stacked buttons
- Dark navy/near-black primary button fill (use deep forest green instead)
- Cool gray-blue background tint (use warm off-white paper)
- Non-Inter typeface details
- No schools, streaks, flashcards, practice, or official-course elements appear in this frame - do not introduce any

### 10-suggest-correction.png

Purpose: Entry point of the correction flow, launched from an existing shared note. The student sees the source note in context, has selected the questionable sentence, picks a reason category, and is told explicitly that a maintainer must approve any change before it becomes public.

Layout: Mobile modal card. HEADER: X close button top-left, tiny uppercase gray eyebrow 'CLASS NOTE', bold H1 'Suggest a correction', divider below. INSTRUCTION LINE: gray helper text 'Select what seems off, then explain the fix.' SOURCE-NOTE CARD (white, rounded, subtle border): top row with circular dark avatar 'AM', bold 'Ava Morgan', breadcrumb sub-line 'Week 3 › Mitosis', and a pale-green 'LIVE' pill at top-right; bold note title 'Why mitosis produces identical cells'; body sentence 'Mitosis creates two daughter cells by separating duplicated chromosomes.'; then the SELECTED SENTENCE block - a pale red/pink rounded box with red border containing the quoted sentence '"The chromosome number is cut in half during mitosis."' in bold dark red and a tiny uppercase red 'SELECTED' tag beneath it. REASON CARD (white): heading 'What seems off?', helper 'This helps the maintainer review faster.', and a 2-up chip grid: 'Incorrect fact' (selected - dark filled tile with white checkmark icon and white label) and 'Unclear wording' (unselected - light outlined tile with a text-lines icon and charcoal label). GOVERNANCE BANNER: pale yellow rounded notice with a shield outline icon, bold line 'A maintainer approves changes' and sub-line 'Your proposal won't replace the note automatically.' FOOTER: full-width dark pill primary button 'Suggest correction' and a final centered gray microcopy line 'No changes are public until approved.'

Components:
- Modal header: X close, eyebrow 'CLASS NOTE', title 'Suggest a correction'
- Instruction line: 'Select what seems off, then explain the fix.'
- Source-note context card: avatar 'AM' + author 'Ava Morgan', breadcrumb 'Week 3 › Mitosis', 'LIVE' status pill, note title, note body excerpt
- Selected-sentence highlight block: quoted sentence in a bordered tinted box with uppercase 'SELECTED' tag - the anchor of the whole correction
- Reason selector card: heading 'What seems off?', helper text, single-select reason chips 'Incorrect fact' (selected state: filled tile + checkmark) and 'Unclear wording' (unselected state: outlined tile + icon)
- Maintainer-approval notice banner (warning-tinted, shield icon): 'A maintainer approves changes' / 'Your proposal won't replace the note automatically.'
- Primary CTA: full-width dark pill 'Suggest correction'
- Trust microcopy under CTA: 'No changes are public until approved.'

Interactions:
- X close - abandons the correction flow, back to the note detail page
- Sentence selection (implied precondition) - the student picks the questionable sentence directly from the note text; the highlighted 'SELECTED' block reflects that choice
- Reason chips - single-select toggle between 'Incorrect fact' and 'Unclear wording' (selected chip fills dark with a checkmark; extendable to more reasons)
- 'Suggest correction' primary button - advances to the before/after proposal composer (image 11), where the replacement wording and rationale are written; the correction input itself may be unformatted plain text
- Governance banner and footer copy - non-interactive trust messaging that the proposal cannot self-publish

Desktop adaptation: On desktop, run this from the shared-note detail page inside the left-nav shell: the student selects a sentence directly in the full note text (in-place highlight), and a 'Suggest a correction' side panel slides in on the right (~400-440px) containing the selected-sentence block, the reason chips, and the plain-text explanation field, with the maintainer-approval notice and the 'Suggest correction' button pinned at the panel bottom. The note stays visible on the left for context. A centered modal over the note page is the acceptable fallback when width is limited. Style the approval notice with the functional warning token (not decorative yellow) and the selected sentence with a functional pending/selection tint plus its text label.

Must ignore:
- Mobile modal dimensions and stacked single-column layout
- Dark navy filled chip/button color (map selected and primary states to deep forest green)
- Exact pale-yellow banner styling (use the design system's functional warning treatment)
- Red styling used decoratively - keep red only as a functional marker paired with the 'SELECTED' text label
- Do not add title, tag, content-type, or formatting fields to the correction input
- No schools, streaks, flashcards, practice, or official-course concepts

### 11-before-after.png

Purpose: Contributor-side review of the drafted correction proposal before submission: a labeled before/after comparison of the exact sentence change, an editable suggested wording, a bounded rationale field, an attached supporting source, and the single 'Send to maintainer' action.

Layout: Mobile card. HEADER: back chevron top-left, uppercase eyebrow 'CORRECTION PROPOSAL', bold H1 'Show the change', and a light-gray 'Saved' autosave status pill at top-right; divider below. HELPER LINE: gray text 'Your maintainer will compare these side by side.' BEFORE CARD: pale red background, thin red border, rounded corners; small 'BEFORE' pill (red uppercase text on lighter red chip) top-left; quoted current sentence '"The chromosome number is cut in half during mitosis."' in bold dark red; small red source footer 'From Ava's shared note'. AFTER CARD: pale green background, thin green border; 'AFTER' pill (green uppercase on pale green) top-left and a circular white edit button with a green pencil icon top-right; quoted replacement '"Mitosis preserves the chromosome number in each daughter cell."' in bold dark green sitting above a thin underline (editable text affordance); small green footer 'Replaces one selected sentence'. RATIONALE CARD (white): tiny uppercase gray eyebrow 'WHY THIS IS MORE ACCURATE'; body text 'Chromosome number is preserved in mitosis; it is reduced during meiosis.'; right-aligned character counter '78 / 300'. SOURCE CARD (white row): link icon in a light square at left; bold 'OpenStax Biology · Cell Division' with sub-line 'Evidence attached'; circular X remove button at right. FOOTER: full-width dark pill primary 'Send to maintainer' and centered gray microcopy 'AI can help phrase it. A person decides.'

Components:
- Header: back chevron, eyebrow 'CORRECTION PROPOSAL', title 'Show the change', autosave pill 'Saved'
- Helper line: 'Your maintainer will compare these side by side.'
- BEFORE card: text label pill 'BEFORE' (functional red), quoted current sentence, provenance footer 'From Ava's shared note'
- AFTER card: text label pill 'AFTER' (functional green), inline-editable replacement sentence with pencil edit button, scope footer 'Replaces one selected sentence'
- Rationale field card: labeled 'WHY THIS IS MORE ACCURATE', free-text explanation, character counter '78 / 300' (300-char limit)
- Attached-evidence chip card: link icon, source name 'OpenStax Biology · Cell Division', status 'Evidence attached', removable via X
- Primary CTA: full-width dark pill 'Send to maintainer'
- AI-boundary microcopy under CTA: 'AI can help phrase it. A person decides.'

Interactions:
- Back chevron - returns to the previous correction step (reason selection) without losing the draft ('Saved' autosave state)
- Pencil edit button on AFTER card - makes the suggested wording inline-editable; only the AFTER text is editable, BEFORE is immutable source text
- Rationale field - editable free text limited to 300 characters with a live counter
- X on the evidence card - detaches the supporting source (attachment itself is optional)
- 'Send to maintainer' - submits the proposal and advances to the pending maintainer-review state (image 12)
- 'Saved' pill - passive autosave indicator, no data loss when navigating back

Desktop adaptation: Show BEFORE and AFTER as a true side-by-side two-column comparison (equal-width cards in a row) instead of stacked, matching the helper copy 'Your maintainer will compare these side by side.' Place the rationale field and evidence attachment full-width beneath the comparison, and put 'Send to maintainer' (forest green) with the 'AI can help phrase it. A person decides.' line in a right-aligned footer or a sticky action bar. This step can live as the second stage of the same right-side correction panel on the note detail page, expanding to a wider modal (~800px) when the side-by-side comparison needs room. Keep the BEFORE/AFTER text labels always present so functional red (removal) and green (addition) are never the only indicators.

Must ignore:
- Mobile stacked layout and card dimensions
- Dark navy primary button fill (use deep forest green)
- Any decorative use of red/green - restrict them to functional removal/addition semantics with visible BEFORE/AFTER text labels
- Cool gray-blue page background (use warm off-white paper)
- No purple AI branding for the AI-phrasing assist; no schools, streaks, flashcards, practice, or official-course concepts

### 12-maintainer-review.png

Purpose: Contributor-facing pending state after submitting a correction: shows who is reviewing, expected turnaround, a stepper timeline of review progress, a compact before/after preview of the proposed change, the explicit boundary that AI cannot publish the change, and the ability to keep editing the proposal while waiting.

Layout: Mobile card. HEADER: back chevron top-left, uppercase eyebrow 'CORRECTION PROPOSAL', bold H1 'Maintainer review'; divider. STATUS BANNER: pale yellow rounded card with an orange status dot, tiny uppercase label 'WAITING ON MAINTAINER', bold headline 'Ms. Chen is reviewing your proposal', and sub-line 'Usually reviewed within 24 hours'. REVIEW PROGRESS CARD (white): heading 'Review progress' above a vertical three-step timeline connected by a line - step 1: green check-in-circle, 'Proposal submitted' bold with timestamp 'Today, 10:42 AM'; step 2: green check, 'Evidence attached' with detail 'OpenStax Biology'; step 3 (current): larger dark filled dot with inner ring, bold 'Maintainer reviewing'. PROPOSED CHANGE CARD (white): tiny uppercase eyebrow 'PROPOSED CHANGE'; compact comparison - red uppercase 'BEFORE' label beside a pale-red row 'Chromosome number is cut in half.', then green uppercase 'AFTER' label beside a pale-green row 'Chromosome number is preserved.'; footer link row 'Tap to open the full comparison' with right chevron. AI-BOUNDARY CARD (light gray filled): person outline icon, bold 'AI cannot publish this change', sub-line 'A maintainer must accept or request revisions.' FOOTER: full-width white outlined secondary pill 'Edit proposal' and centered gray microcopy 'We'll notify you when a decision is made.'

Components:
- Header: back chevron, eyebrow 'CORRECTION PROPOSAL', title 'Maintainer review'
- Pending-status banner (warning-tinted): status dot + uppercase 'WAITING ON MAINTAINER', named reviewer 'Ms. Chen is reviewing your proposal', SLA line 'Usually reviewed within 24 hours'
- Review-progress stepper: vertical timeline with completed steps (green checks) 'Proposal submitted - Today, 10:42 AM' and 'Evidence attached - OpenStax Biology', plus active step (filled dot) 'Maintainer reviewing'
- Compact comparison preview: eyebrow 'PROPOSED CHANGE', labeled rows BEFORE (red label, pale red row) / AFTER (green label, pale green row) with one-line truncated texts, and 'Tap to open the full comparison' link with chevron
- AI-boundary card: person icon, 'AI cannot publish this change', 'A maintainer must accept or request revisions.'
- Secondary action: full-width outlined pill 'Edit proposal'
- Notification microcopy: 'We'll notify you when a decision is made.'

Interactions:
- Back chevron - returns to the source note or the user's proposals list
- 'Tap to open the full comparison' row - opens the full before/after view (the image-11 comparison) read-only
- 'Edit proposal' - reopens the proposal composer (image 11) so the same proposal can be revised while pending
- Status banner and stepper - passive live status; the active step advances when the maintainer decides, then branches to the decision-outcome states (image 13)
- Notification promise - the contributor is notified on decision, so they can safely leave this screen

Desktop adaptation: Two adaptations are needed. Contributor view: inside the left-nav shell, a two-pane proposal page - left rail (~320px) holding the pending banner, named reviewer, and the review-progress stepper; main area showing the full side-by-side BEFORE/AFTER comparison (no truncated preview needed on desktop, so 'Tap to open the full comparison' becomes unnecessary or reads 'Open the full comparison'), the rationale, attached evidence, the 'AI cannot publish this change' boundary card, and 'Edit proposal'. Maintainer view: expand the same structure into a review workspace - full comparison center-stage, contributor explanation and sources alongside, optional AI assistance summary, and explicit maintainer decision actions (Accept / Request revisions / Decline) that only a human can trigger; the timeline rail doubles as an audit trail.

Must ignore:
- Mobile dimensions and stacked single-column layout
- Exact pale-yellow banner styling (use the functional warning/pending token from the master palette)
- 'Tap' wording in link copy (desktop uses click/open phrasing)
- Dark navy accents (primary/active states become deep forest green; status colors stay functional only)
- No purple AI branding around the AI-boundary messaging; no schools, streaks, flashcards, practice, or official-course concepts

### 13-decision-outcomes.png

Purpose: Post-review outcome screen for a correction proposal: explains the two branches a maintainer decision can take (accepted vs revision requested), gives the contributor a clear next action for each branch, and reassures that all versions remain visible. Per caption, a declined state may reuse the same structure with a reason plus preserved history.

Layout: Narrow mobile card (single column, ~440px, roughly 6 stacked regions on a light gray page background). Region 1 (top, white header card): left-aligned back chevron, small all-caps gray eyebrow 'CORRECTION PROPOSAL' above the bold page title 'Decision outcomes'. Region 2: a light-gray rounded info banner with a bold one-line heading and a smaller gray subline. Region 3: 'Accepted' outcome card - light green tinted surface with a green border, containing (top to bottom) a circular pale-green icon badge with a green checkmark, a small green all-caps status eyebrow 'ACCEPTED', a bold dark-green heading, a two-line green body sentence, and a full-width solid dark-green button. Region 4: 'Revision requested' outcome card - light amber tinted surface with an amber border, containing a circular amber icon badge with a redo/refresh arrow, a small warm-red all-caps eyebrow 'REVISION REQUESTED', a bold warm-brown heading, a nested white sub-card (amber border) holding a small all-caps feedback label and a quoted maintainer feedback sentence in clay/brown text, then a full-width solid near-black button. Region 5: white reassurance card with a small clock/history icon at left, a bold one-line heading and a gray subline. Region 6 (bottom): full-width outlined secondary button 'Back to class feed'.

Components:
- Header card: back chevron icon button; eyebrow label 'CORRECTION PROPOSAL' (small caps, gray); page title 'Decision outcomes' (bold, charcoal)
- Info banner (light gray, rounded): bold line 'The maintainer chooses one path'; subline 'You'll get a clear next step either way.'
- Accepted outcome card (success-tinted surface + border): circular icon badge with checkmark; status eyebrow 'ACCEPTED'; heading 'The shared note is updated'; body 'Your correction becomes the newest version and your contribution is credited.'; full-width filled primary button 'View updated note'
- Revision-requested outcome card (warning-tinted surface + border): circular icon badge with a redo/refresh arrow; status eyebrow 'REVISION REQUESTED'; heading 'Keep working on the same proposal'; nested white feedback sub-card with eyebrow 'MS. CHEN'S FEEDBACK' and quoted text '"Please cite the exact chapter and explain why this applies to mitosis, not meiosis."'; full-width filled dark button 'Edit this proposal'
- History reassurance card (white): clock/history icon; bold line 'Original and every revision stay visible'; subline 'Nothing is silently overwritten.'
- Bottom outlined full-width secondary button 'Back to class feed'

Interactions:
- Back chevron -> returns to the proposal status / maintainer-review screen
- 'View updated note' (accepted branch) -> opens the shared note detail showing the newly accepted current version with the contributor credited
- 'Edit this proposal' (revision-requested branch) -> reopens the SAME proposal in the correction editor, pre-filled, with the maintainer's feedback visible, so the student iterates rather than starting over
- 'Back to class feed' -> returns to the Pot feed
- The maintainer feedback sub-card is read-only context, not interactive

Desktop adaptation: Fold these outcomes into a proposal-detail page inside the persistent left-nav shell rather than a standalone screen: a full-width status banner at the top of the proposal page (green success banner for Accepted, amber warning banner for Revision requested, red/neutral for Declined) with the status eyebrow, heading, and primary action inline; below it a two-column body - left column keeps the before/after comparison from the proposal, right side panel stacks the maintainer feedback card (quoted, with the '[Name]'s feedback' label), next-step buttons ('View updated note' or 'Edit this proposal' as forest-green primaries), and the 'Original and every revision stay visible / Nothing is silently overwritten.' reassurance as a footer note linking to version history. Surface the same outcomes as compact status rows in a 'My proposals' list and as feed notifications. Keep green/amber/red strictly functional over the warm-paper palette, always paired with the text status label.

Must ignore:
- Mobile card dimensions and single-column phone frame
- The near-black filled button style ('Edit this proposal') - primary actions must be deep forest green per the master palette
- Exact green/amber tint values - re-tone success and warning states to the functional colors of the final system over warm off-white
- The specific example feedback content (mitosis/meiosis quote) - placeholder content only
- Any rounded-shadow floating-card phone styling; use flat cards with subtle borders

### 14-version-history-layout.png

Purpose: Desktop version-history workspace for one shared note: a chronological timeline of versions on the left with attribution ('who changed what, and where it started'), and a large side-by-side comparison of two selected versions on the right, plus restore and compare-two-versions controls.

Layout: Full desktop app frame (~1440x900). Region 1 (top bar, white, full width): left cluster of hamburger menu + back/forward chevron buttons; centered Pot title 'Chemistry 7'; right cluster of user name 'Ada', a red streak/flame icon, a checkmark icon, and a brightness/theme toggle. Region 2 (left edge): a narrow vertical rail (~85px) with numbered items 1, 2, 3; item 3 highlighted with a yellow rounded rectangle (section/lesson navigation). Region 3 (main, light gray background): page header row with large bold 'Version History', a gray subtitle 'Ionic vs covalent table - who changed what, and where it started.', and a top-right blue filled button 'Compare two versions'. Region 4 (content, two side-by-side white cards): LEFT ~380px 'Timeline' card listing three version entries stacked chronologically newest-first, each with a title, a role pill on the right, and a gray meta line (who + what + when); the topmost entry has a light gray selected background; below the list sits an outlined 'Restore this version' button and a small gray helper line. RIGHT ~900px comparison card holding two equal side-by-side panels, each panel with a header row (version label left, 'Comparing' pill right), a gray attribution/meta line ('Ada · 2 hours ago' / 'Omar · yesterday'), and the version's body text beneath.

Components:
- Top app bar: menu button, back/forward navigation chevrons, centered Pot name 'Chemistry 7', user name, streak icon, checkmark icon, theme toggle
- Left numbered section rail: items 1 / 2 / 3, current item marked with a yellow highlight
- Page header: title 'Version History'; subtitle naming the note ('Ionic vs covalent table') plus 'who changed what, and where it started.'; primary button 'Compare two versions' (top right)
- Timeline card (left): header label 'Timeline'; version entry 1 'Current version' + green 'Student' pill + meta 'Ada edited the comparison table · 2 hours ago' (selected state, gray background); version entry 2 'Lattice energy row added' + green 'Student' pill + meta 'Omar contributed a row · Yesterday'; version entry 3 'Copied from official slides' + blue 'Official' pill + meta 'Original source · Ms. Chen · Last week'
- Outlined button 'Restore this version' with helper text 'Restore is available. Compare first so the class can see what would change.' (truncated in screenshot)
- Comparison card (right): two equal version panels; panel A header 'Current' + blue 'Comparing' pill, meta 'Ada · 2 hours ago', body beginning 'Ionic bonds transfer electrons. Covalent bonds share. Added polar co…'; panel B header 'Yesterday' + 'Comparing' pill, meta 'Omar · yesterday', body beginning 'Ionic bonds transfer electrons. Covalent bonds share. Lattice energy…'
- Role pills on timeline entries (Student / Official) distinguishing who produced each version

Interactions:
- Clicking a timeline entry selects that version (selected state = tinted row) and loads it into the comparison area
- 'Compare two versions' enters/toggles a compare mode where two timeline entries can be marked; each chosen version shows a 'Comparing' pill in its panel header
- 'Restore this version' restores the selected older version as the new current version (helper text nudges the user to compare first so the class can see what would change)
- Top-bar back/forward chevrons navigate browsing history; hamburger opens the nav drawer
- Left rail numbers switch between sections of the Pot
- Comparison panels are scrollable reading surfaces for full version bodies

Desktop adaptation: Keep this exact information architecture - left chronological timeline (~1/3 width) + large right comparison (~2/3) - but mount it inside MeltingPot's persistent left-nav shell as the 'History' view of a shared-note detail page, breadcrumbed Pot > Section > Note > History. Each timeline entry should record what the caption requires: original contributor, correction contributor, the reviewing maintainer who approved it, timestamp, and cited sources - e.g. 'Correction by Omar · approved by Ms. Chen · Yesterday'. Replace role pills with Contributor/Maintainer pills in the final palette. In the comparison, add inline diff marking with functional green for additions and functional red for removals, always accompanied by text labels ('Added'/'Removed') so color is never the only indicator. 'Compare two versions' and 'Restore this version' become forest-green primary and outlined secondary respectively; restoring should route through the same maintainer-review boundary for non-maintainers. On narrower widths, stack timeline above comparison and let each comparison panel scroll in its own overflow container.

Must ignore:
- Blue button and pill styling and the yellow rail highlight - replace with forest-green primary, neutral pills, and the warm-paper palette
- The 'Official' pill and the 'Copied from official slides' / 'Original source · Ms. Chen' official-course provenance concept - no official-course material in MVP; the origin version is simply the first contributor's shared note
- Numbered lesson-style left rail as-is - reinterpret as Pot section navigation, not lessons
- Red streak/flame icon and checkmark gamification icons in the top bar
- Exact placeholder content (chemistry text) - structure only
- Mobile-agnostic caveat aside, do not copy the light-gray page background verbatim; use warm off-white paper with white cards and subtle borders

### 15-pot-settings-layout.png

Purpose: Maintainer-facing Pot settings page: a two-panel structure with Pot identity (name, link, invite/class code with copy control) on the left and people management (maintainers list with roles, add maintainer, contributor/member list with remove controls) on the right. Subtitle notes students would see only a reduced read-only subset.

Layout: Full desktop app frame identical in shell to image 14: white top bar (menu, back/forward chevrons, centered 'Chemistry 7', right 'Ada' + streak icon + checkmark + theme toggle) and the narrow numbered left rail with item 3 yellow-highlighted. Main area on light gray: page header with bold 'Pot settings' and gray subtitle 'Maintainer view. Students would see the name, URL, and join code only.' Below, two side-by-side white cards of roughly equal width (~640px each). LEFT card 'Identity': three stacked labeled form rows - 'Pot name' text input containing 'Chemistry 7'; 'URL' text input containing 'meltingpot.io/gis/chemistry'; 'Invite code' rendered as a gray read-only field with bold code '7KT4P2' on the left and an outlined 'Copy code' button on the right; beneath, a gray helper sentence about joining after school confirmation. RIGHT card 'Maintainers': two person rows, each with name, a small blue 'Maintainer' pill, a large circular avatar, and a right-aligned role note ('Lead' for Ms. Chen, 'You' for Ada); then an outlined 'Add maintainer' button; then a 'Contributors' subheading with two compact rows ('Omar · Contributor', 'Lina · Contributor') each ending in a red 'Remove' text link; a blue filled 'Manage contributors' button closes the card.

Components:
- Page header: title 'Pot settings'; subtitle 'Maintainer view. Students would see the name, URL, and join code only.'
- Identity card: labeled input 'Pot name' (value 'Chemistry 7'); labeled input 'URL' (value 'meltingpot.io/gis/chemistry'); labeled read-only code field 'Invite code' showing '7KT4P2' in bold with an adjacent outlined 'Copy code' button; helper text 'Anyone with the code can join this pot after they confirm Greenfield International School.'
- Maintainers card: person row 'Ms. Chen' + 'Maintainer' pill + avatar + right-aligned 'Lead' designation; person row 'Ada' + 'Maintainer' pill + avatar + right-aligned 'You' designation; outlined button 'Add maintainer'
- Contributors sub-list inside the same card: 'Omar · Contributor' with red 'Remove' link; 'Lina · Contributor' with red 'Remove' link; filled button 'Manage contributors'
- Role pills: 'Maintainer' (on people rows); role descriptors 'Lead', 'You', 'Contributor' as plain text
- App shell: top bar with Pot title, user identity; numbered left rail

Interactions:
- 'Pot name' input is directly editable by maintainers (titles may be duplicated; uniqueness lives in the internal Pot ID and the 6-character class code)
- 'Copy code' copies the 6-character class code to the clipboard (should confirm with a brief success state)
- 'Add maintainer' opens a picker/dialog to promote a member to maintainer
- 'Remove' link on each contributor row removes that member from the Pot (destructive, red, should confirm)
- 'Manage contributors' opens the fuller member-management view (full roster, roles, removals)
- Right-aligned 'Lead'/'You' descriptors are informational, not interactive
- Top-bar and left-rail navigation return to other Pot views

Desktop adaptation: Keep the two-panel structure inside the persistent left-nav shell: left card = Pot identity with an editable 'Pot name' field (duplicates allowed), a read-only internal Pot ID row, and a class-code block showing the 6-character code large and monospaced with BOTH a 'Copy code' and a 'Regenerate code' control (regenerate confirms, since it invalidates the old code) plus the helper 'Anyone with the code can join this Pot.'; right card = people: maintainers list with Maintainer pill, 'Lead' and 'You' descriptors, forest-green 'Add maintainer' action, then the members list with functional-red 'Remove' text links and a 'Manage members' secondary action. Show a reduced read-only variant for non-maintainers (name + class code only, per the subtitle's role-scoping idea). Use white cards with subtle borders on warm off-white, charcoal labels, forest-green primaries; red only for the destructive Remove.

Must ignore:
- The 'URL' field and its school-based value 'meltingpot.io/gis/chemistry' - no school-based URLs in the final product
- The school-confirmation helper sentence ('…after they confirm Greenfield International School.') - joining is by 6-character code only, no school verification
- Blue pill and blue filled-button styling - use forest green for primary actions and neutral pills
- Oversized decorative avatar circles awkwardly overlapping rows - use compact aligned avatars or initials
- Yellow-highlighted numbered rail, streak/flame icon, and checkmark icon in the top bar
- Light-gray page background - use warm off-white paper with flat white cards and subtle borders

### 16-shared-note-summary-layout.png

Purpose: Spacious desktop reading layout for synthesized/shared note content: a clear title, a transparency subtitle about where the content comes from, a topic heading with a short readable summary paragraph, attribution chips crediting the underlying sources, a key-takeaways bullet block, and header-level actions. To be adapted into the shared-note detail (reading) page.

Layout: Full desktop app frame with the same shell as images 14-15 (white top bar with menu, back/forward chevrons, centered 'Chemistry 7', right 'Ada' + streak icon + checkmark + theme toggle; numbered left rail with item 3 yellow-highlighted). Main area on light gray: page header row with large bold 'Summary' at left, gray subtitle 'Built from the shared notes for Lesson 4, not a hidden model dump.' beneath it, and a right-aligned horizontal action group of three pill buttons - blue filled 'Catch me up', outlined 'Find what's missing', outlined 'Suggest changes'. Below, one large full-width white content card (the reading surface) containing top-to-bottom: bold section heading 'Ionic bonds'; a one-to-two-line summary paragraph in charcoal; an attribution row of two chip+label pairs (green 'Student' pill + gray 'Ada, Ionic vs covalent table'; blue 'Official' pill + gray 'Lesson 4 slides'); a bold 'Key takeaways' heading; a three-item bulleted list; then a light-gray inset callout box with a bold 'Find what's missing' label and a gray explanatory sentence. Generous whitespace fills the rest of the card - the reading surface is deliberately tall and uncluttered.

Components:
- Page header: title 'Summary'; transparency subtitle 'Built from the shared notes for Lesson 4, not a hidden model dump.'
- Header action group (right-aligned): filled button 'Catch me up'; outlined button 'Find what's missing'; outlined button 'Suggest changes'
- Reading card: content heading 'Ionic bonds'; summary paragraph 'An ionic bond forms when electrons transfer from a metal to a nonmetal, and the resulting ions attract. NaCl and MgO are typical examples from this lesson.'
- Attribution row: green 'Student' pill with source label 'Ada, Ionic vs covalent table'; blue 'Official' pill with source label 'Lesson 4 slides'
- 'Key takeaways' block: bold heading + bulleted list ('Opposite charges attract after electron transfer.' / 'Lattice energy is high in compounds like MgO because the ions pack tightly.' / 'Covalent examples in this lesson include H2O and CO2.')
- Inset callout box (light gray): bold label 'Find what's missing' + body 'Polar covalent is mentioned in Ada's rough note but is not in the shared summary yet. Suggest changes if the class should add it.'
- App shell: top bar and numbered left rail as in images 14-15

Interactions:
- 'Suggest changes' -> starts the correction flow on this note (becomes 'Suggest correction' leading to sentence selection + reason, per images 10-11)
- 'Catch me up' and 'Find what's missing' are header actions for AI reading aids (future features - excluded from MVP)
- Attribution chips reference the underlying source notes; on desktop these should link to the original contributions
- The 'Find what's missing' callout invites suggesting an addition (future feature)
- Left rail and top-bar chevrons navigate between sections and back to the feed

Desktop adaptation: Reuse this page's reading rhythm for the shared-note detail page inside the persistent left-nav shell: breadcrumb Pot > Section > Note; a header row with the note title at left and a right-aligned action group of exactly three actions per the caption - 'Original' (view the contributor's untouched raw text), 'History' (opens the version-history layout from image 14), and 'Suggest correction' (forest-green primary, starts the correction flow); below the header, one wide white reading card (max-width ~760-820px text measure, generous line height) containing the short AI summary paragraph, an attribution line crediting the original contributor and note ('Shared by Ada · [section] · [time]', with the correction contributors credited when versions exist), a 'Key takeaways' bulleted block, and then the full organized note body as the large readable surface. An optional right side panel can hold source/attribution details and a compact recent-versions list linking into History. Clay accents only for small highlights; no purple, no filled blue buttons.

Must ignore:
- 'Catch me up' button and feature - future feature, excluded
- 'Find what's missing' button AND the gap-detection callout box - future feature, excluded
- Formal lesson numbering ('Lesson 4', 'shared notes for Lesson 4') and the numbered lesson rail as-is
- The 'Official' pill and 'Lesson 4 slides' official-course source concept - no official-course material; attribution credits student contributors only in MVP
- Blue filled button styling, blue bullets, green/blue chip colors - restyle to forest green primaries, charcoal text, neutral chips on warm off-white
- Streak/flame and checkmark icons in the top bar
- Exact chemistry placeholder content - layout and hierarchy only

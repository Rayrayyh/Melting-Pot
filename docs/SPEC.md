# MeltingPot MVP Specification (Master Prompt)

This is the authoritative product specification for meltingpot.io, captured from the build brief.
When any other document in this repo conflicts with this file, this file wins.
See `memory/decisions/001-source-of-truth.md` for the full precedence order.

## Product

Build meltingpot.io, a responsive web app where students collaboratively build a shared vault of class knowledge.

Each class has a shared space called a Pot. Students join using a class code, submit rough notes or explanations without formatting them, and let MeltingPot organize the content with AI. The student reviews the result before anything is shared.

The core promise is:

> Join a Pot. Write anything. MeltingPot organizes it. You approve what gets shared.

MeltingPot should feel like a modern collaborative student tool, not a traditional LMS or developer platform.

Reference images (in `docs/reference/`) and their captions are the source of truth for intended flows, screen relationships, and interactions. Adapt them into a polished desktop web application. Do not copy mobile dimensions directly. The references communicate UX structure, not a permanent color scheme.

## Core Product Rules

- A class space is called a Pot.
- Students join a Pot using a six-character class code.
- Account creation happens after the student sees which Pot they are joining.
- Do not use schools, organizations, or school initials.
- Pot titles can be duplicated.
- Internal Pot IDs and class codes must remain unique.
- Students can contribute completely unformatted text.
- Titles, tags, content types, and sections are optional.
- AI organizes content but never publishes automatically.
- The original raw submission is always preserved.
- Students approve their own new contributions.
- Corrections to existing shared notes require maintainer approval.
- Every contribution and accepted correction remains attributed.
- Avoid Git terminology in the interface.
- Complete the core flows before adding secondary features.

## Roles

### Member
- View shared notes
- Create contributions
- Review and share their organized contributions
- Suggest corrections
- Search the Pot
- View contribution and version history

### Maintainer
- Review correction proposals
- Accept changes
- Request revisions
- Decline proposals with a reason
- Organize sections
- Manage shared notes
- Help manage members

### Owner
The Pot creator becomes its owner and first maintainer.
- Rename the Pot
- Edit its description
- Regenerate the class code
- Add or remove maintainers
- Remove members
- Archive or delete the Pot

## Joining a Pot

Joining should be the fastest path into MeltingPot.

### Step 1: Enter Class Code
The landing page should primarily show: Enter class code.

Class codes are six characters, letters and numbers, case-insensitive, unique, easy to regenerate or revoke.

Do not ask for an account, school, organization, or profile information yet.

If the code is invalid, show: "We couldn't find that Pot. Check the code and try again." Do not erase the entered code.

### Step 2: Show the Pot
When the code is valid, show the Pot before authentication. Example: "You found Biology 101". The copy must not claim membership before it is finalized.
Supporting information may include: Pot description, owner or maintainer, member count, recent activity.

### Step 3: Sign Up or Sign In
After showing the Pot, ask the student to create an account or sign in.
Keep signup minimal: display name, email, password or supported authentication method.
Preserve the pending membership during authentication.
After authentication: finalize the membership, open the joined Pot immediately, do not add unrelated onboarding steps.
Returning users should see their existing Pots and should not enter the same code again.

## Creating a Pot

Creating a Pot should only require a Pot title and optional description.

After creation: generate a unique class code, make the creator the owner, open the empty Pot, provide actions to copy the code or invitation link.

Do not require school, organization, department, grade, or course numbers.

## Pot Home and Class Feed

The main Pot page should feel like an active shared knowledge feed.

Include: Pot title, search, section filters, recent shared notes, contributor identity, contribution timestamps, short organized summaries, Add contribution, Suggest correction, empty states for new Pots.

Shared-note cards show: generated title, short summary, contributor, section (when available), time shared, attachment count (when relevant), open action, suggest correction action.

Do not add public likes, follower counts, trending scores, or social-media engagement systems.

## Contribution Flow

Class feed -> Write anything -> Optional section -> AI organizes -> Review -> Shared

### Write Anything
Large plain-text composer.
Heading: "Write anything".
Placeholder: "Type whatever you remember, paste rough notes, explain an idea, or share an example. Formatting does not matter."
Optional attachments: image, PDF, file, link.
Do not require: title, tags, markdown, content type, section, correct grammar, manual formatting.
Primary action: Continue.
Clearly communicate that the original submission will be preserved.

### Optional Section
Show: recommended section, other relevant sections, section search, "Not sure where it belongs".
The user may continue without selecting a section. AI may suggest placement but must not silently decide.

### AI Organization
In-place processing state, not a chatbot.
Progress: Original preserved, Structuring the idea, Creating a summary, Suggesting placement.
Copy: "Organizing your note" / "Your original is saved. Nothing has been shared yet."

### Review Before Sharing
Show: organized version, original version, generated title, summary, structured body, suggested section, attachments, contributor identity, editing controls.
Primary action: "Share with class".
Secondary actions: Edit, View original, Change section, Organize again, Save draft, Cancel.
Clearly state: "Only you can approve what gets shared."

### Shared Success
Show: "Shared with the class", contributor credit, final section, organized preview, timestamp, link to the shared note.
Actions: View in class notes, Back to class feed, Add another contribution.
The contribution appears in the class feed immediately.

## AI Behavior

AI may produce: titles, summaries, headings, clear paragraphs, bullet points, definitions, examples, key takeaways, section suggestions.

AI must: preserve the original submission, preserve uncertainty and caveats, avoid changing intended meaning, keep attachments connected, allow complete editing, show the result before sharing.

AI must not: publish automatically, delete the original, invent sources, present guesses as facts, pretend to verify everything, silently resolve contradictions, replace human approval.

If organization fails, show: "We couldn't organize this contribution" / "Your original draft is safe. You can try again or edit it manually." Actions: Try again, Edit manually, Save draft.

## Shared Notes and History

Each shared note contains: title, summary, structured content, contributor, section, attachments, original submission, current version, version history, suggest correction action.

The organized version is shown by default; the original always remains accessible.

Version history records: who contributed, what changed, when, previous versions, correction contributors, reviewing maintainers, supporting sources.

## Correction Flow

Shared note -> Suggest correction -> Before and after -> Maintainer review -> Decision

### Suggest Correction
Show: existing note, original contributor, section, selected sentence or content, plain-text correction field, optional explanation, optional supporting source. The correction may be unformatted.

### Before and After
After organization, show: current version, suggested version, highlighted additions, highlighted removals, reason for the change, supporting source, AI summary of the difference.
Primary action: "Send to maintainer". Corrections never publish directly.

### Maintainer Review
Show: proposal contributor, original contributor, current and suggested versions, highlighted differences, contributor explanation, supporting sources, AI review assistance, discussion history.
AI assistance may identify: what changed, possible overlap, possible conflicts, useful additions.
Clearly state: "AI cannot publish this change. A maintainer must decide."
Maintainer actions: Accept changes, Request revision, Decline with reason.

### Outcomes
Accepted: update the shared note, create a new version, preserve previous versions, credit the original contributor, credit the correction contributor, record the reviewing maintainer.
Revision requested: show maintainer feedback, preserve the proposal and discussion, let the contributor edit and resubmit the same proposal.
Declined: show the reason, preserve the proposal in history.

## Basic Search

Search within a Pot across: titles, summaries, note content, sections, contributors, attachment names.
Results show their section, contributor, and matching excerpt.

## Core Data

Persistent entities: User, Pot, Membership, Section, Contribution, SharedNote, RevisionProposal, Version, Attachment, MaintainerDecision.

Rules:
- Pot titles may be duplicated.
- Pot IDs and class codes must be unique.
- A user may belong to multiple Pots.
- Raw and organized contribution content must both be stored.
- Corrections reference the shared note they intend to change.
- Accepted corrections create new versions.
- Attachments remain connected throughout review and acceptance.
- Never use raw titles as database identifiers.

## Required MVP Areas

Join by class code, Pot confirmation, signup and sign-in, returning-user Pot list, create Pot, Pot feed, write-anything composer, optional section selection, AI organization, review before sharing, shared success, shared-note detail, suggest correction, before-and-after proposal, maintainer review, accepted and revision-requested outcomes, version history, basic search, Pot settings, error and empty states.

Combine screens where doing so reduces friction.

## Web App Design

Responsive web application optimized for desktop and laptop use. Use horizontal space for persistent navigation, side panels, two-column review layouts, before-and-after comparisons, contextual information, maintainer actions. Usable on smaller screens but not mobile-first.

Feel: calm, modern, academic, collaborative, human, fast.

Use: Inter typography, Lucide-style icons, white, gray, and black, simple borders, minimal shadows, rounded cards, clear spacing, strong information hierarchy.

Functional color only for success, warnings, errors, additions, removals, and pending review. Do not establish a permanent brand color system yet.

Avoid: gradients, glowing AI effects, purple AI branding, dense control panels, developer terminology, childish gamification, social-media styling, large chatbot interfaces.

Do not use emojis. Do not use em dashes.

### Front-End Design Direction

Warm, academic feel. Off-white paper-like background, white surfaces, dark charcoal text, deep forest green for primary actions, small clay accents for contribution-related moments. Persistent left navigation, spacious central content area, optional contextual side panels. Inter for interface elements, optionally Source Serif 4 for long-form shared notes. Flat cards with subtle borders, restrained shadows, rounded corners, generous whitespace, strong hierarchy. AI appears through simple progress states and organized previews. The final interface should feel like a calm digital study room combined with a serious collaborative productivity tool.

## Copy Direction

Prefer: Enter class code, Write anything, Organizing your note, Review before sharing, Share with class, Suggest correction, Send to maintainer, Revision requested, View history.

Avoid: Generate AI content, Create pull request, Merge changes, Fork note, Execute transformation, Run AI formatter.

## Future Features (do NOT build in MVP)

Google Classroom or Canvas integration (add only the framework hook, not functionality), school and organization systems, formal module and lesson hierarchy, calendars and assignments, personal forks or branches, full AI study assistant (framework wiring only, API key later), Catch me up, missing-material analysis, flashcards and quizzes (placeholders only if needed), comments and reactions, contribution graphs, ranks and streaks, advanced contributor profiles, recaps and certificates, school administration, advanced analytics, adaptive learning.

Lifted since, by the owner: flashcards and practice tests (2026-08-19 and 2026-08-20); a private record of one person's own days, quiet by decision 030; and on 2026-09-02 the twelve month contribution stream on the Contributions page and a personal standing in each class, said only as what the person is ahead of, with no leaderboard and no names (decision 031).

Do not place unfinished future features in the main navigation.

## Build Priority

1. Pot creation and class-code joining
2. Authentication and membership persistence
3. Pot feed and shared notes
4. Contribution organization and approval
5. Corrections and maintainer review
6. Version history
7. Search, settings, and error states

Do not start future features until the contribution and correction loops work end to end.

## Final Standard

The MVP is complete when a student can:
- Join a Pot without encountering a login wall
- See the Pot before creating an account
- Submit completely unformatted knowledge
- Review an AI-organized version
- Share only after approving it
- See their contribution in the class feed
- Suggest a correction to an existing note
- Send the correction to a maintainer
- Receive an accepted or revision-requested outcome
- View attribution and previous versions

The product should feel like a shared class vault where contributing knowledge is as easy as typing what you know.

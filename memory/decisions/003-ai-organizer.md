# 003 AI organizer strategy

Summary: User chose a deterministic organizer for the MVP, behind a provider interface so a real model (Claude API) can be wired in later with just an API key.

## The decision

Asked 2026-08-19 whether the AI organization step should call the Claude API (with or without fallback) or be deterministic for now. User chose: "Deterministic mock only for now." The SPEC independently says the full AI study assistant arrives later with an API key and only the framework should be wired.

## Implementation shape

- One interface, e.g. `OrganizerProvider.organize(raw, context) -> OrganizedResult` where context carries Pot sections and the contributor, and the result carries title, summary, structured body blocks, key takeaways, and a suggested section with confidence.
- `DeterministicOrganizer` implements it for the MVP: sentence and paragraph segmentation, title derivation from the strongest opening clause, bullet extraction, definition detection ("X is/means Y"), key-takeaway selection, keyword-overlap section suggestion. Honest and rule-based; no fabrication.
- `ClaudeOrganizer` is a stub selected by env var (e.g. `ORGANIZER_PROVIDER=claude` + `ANTHROPIC_API_KEY`); not implemented in MVP beyond the wiring point.
- The correction diff summary and maintainer review assistance go through the same provider layer.
- The organizing screen must stay honest: progress states reflect real steps, and the failure state ("We couldn't organize this contribution") is reachable and handled.

## Why it mattered

The hackathon requires meaningful AI integration, but the user explicitly deprioritized live model calls for the MVP. The provider seam keeps the demo working offline and makes the later upgrade a config change, not a refactor. Revisit before submission whether to flip the provider to Claude for the demo video.

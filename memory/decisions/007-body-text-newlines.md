# body_text joins blocks with newlines so selections never span blocks

Decision: note_versions.body_text is built by joining blocks, and bullet items within a block, with "\n" (blocksToBodyText in web/lib/organizer/edit.ts, also used by the deterministic organizer). selectableSentences splits on sentence terminators AND newlines.

Why: the correction picker selects sentences out of body_text, but replaceInBlocks applies the correction inside a single block or bullet item. With space-joined body_text, any block lacking terminal punctuation (headings, user-edited bullets) merged with the next into one "sentence" that no single block contained, so the proposal was born unacceptable with a false "note has changed" conflict. Newline joins guarantee every selectable sentence is a substring of exactly one block.

Invariant, locked by a unit test in web/lib/diff.test.ts: for any blocks, every string in selectableSentences(blocksToBodyText(blocks)) must be found by replaceInBlocks.

Consequences: renderers of body_text use whitespace-pre-line where line structure matters (review workspace in-context card); search excerpts are unaffected. decide_proposal's staleness check (selected_text occurring in body_text) relies on this same invariant. Notes stored before this change were dev seed data only; production launches clean.

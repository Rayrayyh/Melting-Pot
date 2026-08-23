-- 0030 added tightened SELECT policies under the names study_sets_select and
-- note_flashcards_select, but the existing ones are called
-- study_sets_select_members and note_flashcards_select_members. The drops were
-- therefore no-ops and the tightened policies landed *beside* the permissive
-- ones. Multiple permissive policies for the same command are OR'd, so a
-- member could still read removed rows and M-09 was not closed at all.
--
-- Dropping the originals leaves exactly one policy per table.

drop policy if exists study_sets_select_members on public.study_sets;
drop policy if exists note_flashcards_select_members on public.note_flashcards;

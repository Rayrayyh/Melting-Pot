-- A whole-note correction is organized on the proposer's screen before it is
-- sent, so the proposer sees the tidy note, the maintainer reviews that same
-- note, and accepting publishes exactly what was reviewed. Before this column
-- the organizer ran on the maintainer's accept click, which published a
-- structure nobody had read. Null for a sentence correction, which is spliced
-- into the existing blocks and never restructures the note.
alter table public.revision_proposals
  add column if not exists proposed_organized jsonb;

comment on column public.revision_proposals.proposed_organized is
  'Organized form of proposed_text for whole-note corrections: {title, summary, blocks, takeaways}. Null for sentence corrections, and null for whole-note proposals created before this column existed.';

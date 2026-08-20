-- Bug pass round 2: close every API verb the app does not use.
--
-- RLS remains the row-level layer; these revocations remove whole verbs
-- from the PostgREST surface so unused endpoints stop existing. The
-- anonymous role keeps no table access at all: its entire surface is
-- lookup_pot_by_code, register_student, and GoTrue sign-in.
--
-- The app's complete direct-write inventory (verified by code audit):
--   contributions: insert, update      attachments: insert, delete
--   memberships: delete + update(last_seen_note_id column grant)
--   pots: update, delete               sections: insert, update, delete
--   proposal_events: insert            revision_proposals: insert
-- Everything else goes through security-definer RPCs, which are unaffected.

revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

revoke insert, update, delete on public.shared_notes from authenticated;
revoke insert, update, delete on public.note_versions from authenticated;
revoke delete on public.contributions from authenticated;
revoke update on public.attachments from authenticated;
revoke insert on public.memberships from authenticated;
revoke insert on public.pots from authenticated;
revoke insert, update, delete on public.profiles from authenticated;
revoke update, delete on public.proposal_events from authenticated;
revoke update, delete on public.revision_proposals from authenticated;

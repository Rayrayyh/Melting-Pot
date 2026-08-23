-- 0024 gave a whole-note correction the organized note it was sent as, so the
-- maintainer publishes what they read. Revising a proposal rewrote
-- proposed_text and left that column untouched, which would have published the
-- organized form of the words the proposer had already replaced.
--
-- The parameter is added rather than the column cleared, because clearing it
-- would send revised corrections back to organizing on the accept click: the
-- exact thing 0024 removed. The proposer organizes again when they revise, and
-- passes the result through.
--
-- The old six-argument signature is dropped rather than left beside this one:
-- an overload would let a stale client keep writing text with no organized
-- note attached. This body is 0014's, rate limiting included, plus the column.

drop function if exists public.resubmit_proposal(uuid, text, text, text, text, text);

create or replace function public.resubmit_proposal(
  p_proposal_id uuid,
  p_selected_text text,
  p_proposed_text text,
  p_explanation text default null,
  p_source text default null,
  p_diff_summary text default null,
  p_proposed_organized jsonb default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_proposal revision_proposals%rowtype;
  v_was_revision boolean;
begin
  select * into v_proposal
  from revision_proposals
  where id = p_proposal_id and proposer_id = v_uid
  for update;

  if not found then
    raise exception 'proposal_not_found';
  end if;
  if not is_pot_member(v_proposal.pot_id) then
    raise exception 'not_pot_member';
  end if;
  perform consume_rate_limit('resubmit_proposal', 'user:' || v_uid::text, 60, interval '1 hour');
  if v_proposal.status not in ('pending', 'revision_requested') then
    raise exception 'proposal_not_editable';
  end if;

  v_was_revision := v_proposal.status = 'revision_requested';

  update revision_proposals
  set selected_text = p_selected_text,
      proposed_text = p_proposed_text,
      proposed_organized = p_proposed_organized,
      explanation = p_explanation,
      source = p_source,
      diff_summary = p_diff_summary,
      status = 'pending',
      decided_by = null,
      decided_at = null,
      decision_note = null
  where id = v_proposal.id;

  insert into proposal_events (proposal_id, actor_id, kind)
  values (v_proposal.id, v_uid, case when v_was_revision then 'resubmitted' else 'edited' end::proposal_event_kind);
end;
$$;

revoke execute on function public.resubmit_proposal(uuid, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.resubmit_proposal(uuid, text, text, text, text, text, jsonb) to authenticated;

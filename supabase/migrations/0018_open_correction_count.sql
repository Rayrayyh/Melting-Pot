-- Bug pass round 2: the "Open corrections" vitals number differed per role.
--
-- revision_proposals_select shows a plain member only their own proposals,
-- so a member's head-count of pending proposals was their personal count,
-- not the Pot's. This pot-wide metric now comes from a security-definer
-- function so every member sees the same true count; access is still gated
-- to Pot members, and no proposal content is exposed.

create or replace function public.open_correction_count(p_pot_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_pot_member(p_pot_id) then
    return 0;
  end if;
  return (
    select count(*)::int from revision_proposals
    where pot_id = p_pot_id and status = 'pending'
  );
end;
$$;
revoke execute on function public.open_correction_count(uuid) from public, anon;
grant execute on function public.open_correction_count(uuid) to authenticated;

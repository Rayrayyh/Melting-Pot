-- Where a person stands among their classmates, worked out here so that no
-- classmate's counts ever leave the database.
--
-- The owner lifted the "never compared" rule on 2026-09-02 (decision 031):
-- a student may see their own standing in a class, framed as what they are
-- ahead of. This function returns, for the caller only, the numbers that
-- sentence needs: how many classmates the Pot has, how many counted fewer
-- days than the caller, how many counted the same, the caller's rank, and
-- how many more counted days would pass the nearest classmate above. Names
-- and per person counts stay inside; there is no path to a list of people.
--
-- The comparison is between students: members with the member role, in the
-- Pots the caller belongs to as a member. Maintainers and owners run the
-- class; they are not its classmates, and they get no standing of their own.
-- The day rule is the private record's: a share, a study run, a correction
-- accepted, a correction reviewed, or a resource attached to a shared note.
-- Thirty UTC dates ending today, cut at midnight so two renders in one day
-- agree, and UTC for everyone alike, since one class compared across its
-- members' zones would not be one comparison.
--
-- Second cut after review: the first skipped the second factor gate every
-- other membership read carries, counted maintainers as classmates, counted
-- attachments on drafts, and let the window drift with the hour.

create index if not exists attachments_pot_created_idx on public.attachments (pot_id, created_at);

create or replace function public.own_standing()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_since date := current_date - 29;
  v_result jsonb;
begin
  if v_uid is null or not public.has_required_aal() then raise exception 'not_authenticated'; end if;

  with mine as (
    select m.pot_id
    from public.memberships m
    join public.pots p on p.id = m.pot_id
    where m.user_id = v_uid and m.role = 'member' and p.archived_at is null
  ),
  members as (
    select m.pot_id, m.user_id
    from public.memberships m
    where m.role = 'member' and m.pot_id in (select pot_id from mine)
  ),
  moments as (
    select sn.pot_id, sn.contributor_id as user_id, sn.shared_at as at
    from public.shared_notes sn
    where sn.pot_id in (select pot_id from mine)
    union all
    select a.pot_id, a.user_id, a.created_at
    from public.study_attempts a
    where a.pot_id in (select pot_id from mine)
    union all
    select r.pot_id, r.proposer_id, r.decided_at
    from public.revision_proposals r
    where r.status = 'accepted' and r.decided_at is not null and r.pot_id in (select pot_id from mine)
    union all
    select r.pot_id, r.decided_by, r.decided_at
    from public.revision_proposals r
    where r.decided_by is not null and r.decided_at is not null and r.pot_id in (select pot_id from mine)
    union all
    select t.pot_id, t.created_by, t.created_at
    from public.attachments t
    join public.contributions c on c.id = t.contribution_id and c.status = 'shared'
    where t.pot_id in (select pot_id from mine)
  ),
  days as (
    select mo.pot_id, mo.user_id, count(distinct (mo.at at time zone 'UTC')::date) as days
    from moments mo
    where (mo.at at time zone 'UTC')::date >= v_since
    group by mo.pot_id, mo.user_id
  ),
  scored as (
    select mb.pot_id, mb.user_id, coalesce(d.days, 0)::integer as days
    from members mb
    left join days d on d.pot_id = mb.pot_id and d.user_id = mb.user_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'potId', s.pot_id,
    'title', p.title,
    'days', s.days,
    'size', (select count(*) from scored x where x.pot_id = s.pot_id),
    'rank', 1 + (select count(*) from scored x where x.pot_id = s.pot_id and x.days > s.days),
    'behind', (select count(*) from scored x where x.pot_id = s.pot_id and x.days < s.days),
    'level', (select count(*) from scored x where x.pot_id = s.pot_id and x.days = s.days and x.user_id <> s.user_id),
    'gap', (select min(x.days) from scored x where x.pot_id = s.pot_id and x.days > s.days) - s.days
  ) order by p.title), '[]'::jsonb)
  into v_result
  from scored s
  join public.pots p on p.id = s.pot_id
  where s.user_id = v_uid;

  return v_result;
end;
$$;

revoke execute on function public.own_standing() from public, anon;
grant execute on function public.own_standing() to authenticated;

-- The join preview said "6 notes" for a Pot whose feed shows 4, because
-- lookup_pot_by_code counted shared_notes that a maintainer had removed.
-- Count only notes still in the Pot. Everything else is the live body
-- unchanged (fetched and diffed before this was written).

create or replace function public.lookup_pot_by_code(p_code text)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_pot pots%rowtype;
  v_owner_name text;
  v_member_count int;
  v_note_count int;
  v_last_shared timestamptz;
begin
  perform consume_rate_limit('lookup_pot_by_code', 'ip:' || client_ip(), 400, interval '10 minutes');
  select * into v_pot
  from pots
  where class_code = upper(trim(p_code)) and archived_at is null;

  if not found then
    return null;
  end if;

  select display_name into v_owner_name from profiles where id = v_pot.owner_id;
  select count(*) into v_member_count from memberships where pot_id = v_pot.id;
  select count(*), max(shared_at) into v_note_count, v_last_shared
  from shared_notes where pot_id = v_pot.id and removed_at is null;

  return json_build_object(
    'title', v_pot.title,
    'description', v_pot.description,
    'owner_name', v_owner_name,
    'member_count', v_member_count,
    'note_count', v_note_count,
    'last_shared_at', v_last_shared,
    'is_member', exists (
      select 1 from memberships
      where pot_id = v_pot.id and user_id = (select auth.uid())
    )
  );
end;
$function$;

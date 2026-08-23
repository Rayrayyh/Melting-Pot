-- The rate limiter believed a header the caller writes.
--
-- client_ip() read `split_part(x-forwarded-for, ',', 1)`, the LEFTMOST entry of
-- that header. Supabase's edge APPENDS the true address to the right of
-- whatever arrived, so the leftmost entry is not the client: it is whatever
-- the client typed there. Sending `X-Forwarded-For: 203.0.113.77` made the
-- rate-limit bucket `ip:203.0.113.77`, and changing that string picked a fresh
-- bucket every request.
--
-- Probed against the live project on 2026-08-22 rather than assumed:
--   no header sent      -> x-forwarded-for: "35.253.77.88"
--   spoofed one value   -> x-forwarded-for: "203.0.113.77,35.253.77.88"
--   spoofed a chain     -> x-forwarded-for: "203.0.113.77, 198.51.100.1,35.253.77.88"
--   trailing comma      -> x-forwarded-for: "203.0.113.7,,34.135.11.159"
-- and in every case cf-connecting-ip held only the true address. Attempting to
-- set cf-connecting-ip from the client is refused by the edge with a 403
-- before the request ever reaches PostgREST, which is what makes that header
-- worth trusting and the left of x-forwarded-for worth ignoring.
--
-- Two anonymous limits were bypassable: lookup_pot_by_code (class-code
-- enumeration) and register_student (unlimited account creation). Both are
-- keyed on this function, so both are fixed by fixing it.

create or replace function public.client_ip()
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_headers json;
  v_ip text;
  v_parts text[];
  v_part text;
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;

    -- The edge overwrites this one and refuses the request outright when a
    -- caller tries to supply it, so it is the address to prefer.
    v_ip := trim(coalesce(v_headers ->> 'cf-connecting-ip', ''));

    if v_ip = '' then
      -- Otherwise take the RIGHTMOST non-empty entry: each proxy appends, so
      -- the last one was written by the hop nearest this database, and
      -- anything the caller invented sits to the left of it. Empty segments
      -- are skipped because a caller can send a trailing comma.
      v_parts := string_to_array(coalesce(v_headers ->> 'x-forwarded-for', ''), ',');
      if v_parts is not null then
        for i in reverse array_length(v_parts, 1) .. 1 loop
          v_part := trim(v_parts[i]);
          if v_part <> '' then
            v_ip := v_part;
            exit;
          end if;
        end loop;
      end if;
    end if;
  exception when others then
    v_ip := null;
  end;

  -- A shared bucket is the safe default: when the address cannot be
  -- established, callers share one limit rather than each getting their own.
  return coalesce(nullif(trim(v_ip), ''), 'unknown');
end;
$$;

revoke execute on function public.client_ip() from public, anon, authenticated;

-- Direct anonymous inserts into analytics_events are hitting the same
-- unexplained RLS gap that showed up with the waitlist feature earlier —
-- a passing "with check (true)" policy plus a table GRANT still isn't
-- enough for some anon/authenticated writes in this project. Switching to
-- a security-definer function sidesteps it entirely (it runs as the
-- function owner, bypassing RLS internally) — the same fix that worked for
-- join_area_waitlist and broadcast_to_buyers. Safe to re-run.

create or replace function public.log_page_view(p_screen text, p_user_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.analytics_events (event_type, user_id, metadata)
  values ('page_view', p_user_id, jsonb_build_object('screen', p_screen));
end;
$$;

grant execute on function public.log_page_view(text, uuid) to anon, authenticated;

-- writes only go through the function above now — close off the direct
-- table insert path it replaces, same posture as area_waitlist
drop policy if exists "Anyone can log an analytics event" on public.analytics_events;
revoke insert on public.analytics_events from anon, authenticated;

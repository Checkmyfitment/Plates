-- Lets the "notify me" waitlist card show a real number ("14 neighbors are
-- already waiting") instead of a vague appeal -- turns the cold-start
-- moment (a prospective seller wondering if there's any demand at all,
-- or a buyer wondering if anyone else wants this neighborhood served)
-- into something concrete. Count-only and neighborhood-only: no email or
-- other PII is exposed, so this is safe to grant to anon.
--
-- Standalone and safe to run — read-only, touches no existing data.

create function public.get_waitlist_count(p_neighborhood text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.area_waitlist
  where p_neighborhood is not null
    and trim(p_neighborhood) <> ''
    and neighborhood ilike '%' || trim(p_neighborhood) || '%';
$$;

grant execute on function public.get_waitlist_count(text) to anon, authenticated;

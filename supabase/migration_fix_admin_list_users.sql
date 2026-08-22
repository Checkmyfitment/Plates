-- Fixes a bug found live: Admin → Users search has been failing on every
-- search with "structure of query does not match function result type"
-- (Postgres error 42804). auth.users.email is varchar(255), not text, and
-- the function's declared return type didn't match — Postgres enforces an
-- exact type match for RETURNS TABLE columns, so this failed on every call
-- since the function was first created. Cast to text to match.

create or replace function public.admin_list_users(q text default null)
returns table(id uuid, name text, email text, is_admin boolean, banned boolean, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select p.id, p.name, u.email::text, p.is_admin, p.banned, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where q is null or q = '' or p.name ilike '%' || q || '%' or u.email ilike '%' || q || '%'
    order by p.created_at desc
    limit 50;
end;
$$;

grant execute on function public.admin_list_users(text) to authenticated;

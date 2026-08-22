-- Lightweight identity signal: lets a user verify their phone number via
-- Supabase Auth's built-in SMS OTP. Requires an SMS provider configured in
-- Supabase Dashboard -> Authentication -> Providers -> Phone (see
-- CHECKLIST.md "Phone verification setup") -- without that, sending a code
-- will fail with a clear error and nothing else breaks.
--
-- We only mirror a boolean onto the public profile (never the actual phone
-- number) so other users can see a "Phone verified" trust badge. The real
-- phone number stays in auth.users, which the client can't query directly.

alter table public.profiles add column if not exists phone_verified boolean not null default false;

create or replace function public.handle_phone_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.phone_confirmed_at is not null and old.phone_confirmed_at is null then
    update public.profiles set phone_verified = true where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_phone_verified on auth.users;
create trigger on_auth_user_phone_verified
  after update of phone_confirmed_at on auth.users
  for each row execute procedure public.handle_phone_verified();

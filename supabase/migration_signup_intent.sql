-- Captures whether someone signed up to buy, sell, or both, so the
-- Profile screen can show just the getting-started checklist that's
-- actually relevant instead of both tracks at once. Null for every
-- existing account (they signed up before this existed) and treated the
-- same as 'both' by the client -- nobody loses a checklist they already
-- had. Standalone and safe to run -- does not touch or delete existing
-- data.

alter table public.profiles
  add column signup_intent text check (signup_intent is null or signup_intent in ('buyer', 'seller', 'both'));

create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_referred_by uuid;
  v_signup_intent text;
begin
  begin
    v_referred_by := nullif(new.raw_user_meta_data->>'referred_by', '')::uuid;
  exception when others then
    v_referred_by := null;
  end;

  if v_referred_by is not null and not exists (select 1 from public.profiles where id = v_referred_by) then
    v_referred_by := null;
  end if;

  v_signup_intent := nullif(new.raw_user_meta_data->>'signup_intent', '');
  if v_signup_intent not in ('buyer', 'seller', 'both') then
    v_signup_intent := null;
  end if;

  insert into public.profiles (id, name, referred_by, signup_intent)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    v_referred_by,
    v_signup_intent
  );
  return new;
end;
$$ language plpgsql security definer;

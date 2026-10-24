-- Trust & safety tooling for admins: who is online, when and how often people
-- use the app, a per-user overview, related-account hints, and an automatic
-- "risk" list of senders whose messages match scam patterns.
--
-- Everything here is admin-only. The two new tables have RLS on with NO
-- policies, so nothing can read or write them directly -- the app only ever
-- touches them through the functions below, and every admin_* function checks
-- is_admin() itself. Message text is scanned on the server to compute flags,
-- but is never returned by these functions (reading a conversation is a
-- separate, audited step).
--
-- Standalone and safe to run -- does not touch or delete existing data.

-- ---------------------------------------------------------------------------
-- Presence + sessions
-- ---------------------------------------------------------------------------

-- one row per person: when the app last reported them as open
create table if not exists public.user_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

-- one row per visit ("session"): a new one starts after a 20+ minute gap.
-- This is what powers "how often" and "what times" -- one row per visit,
-- not one per heartbeat.
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists user_sessions_user_started_idx on public.user_sessions (user_id, started_at desc);
create index if not exists user_sessions_started_idx on public.user_sessions (started_at);

alter table public.user_presence enable row level security;
alter table public.user_sessions enable row level security;

-- Called by the app about once a minute while it's open and visible. Only
-- ever records the caller's own activity (auth.uid()), never a passed-in id.
create or replace function public.touch_presence()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_prev timestamptz;
begin
  if v_uid is null then
    return;
  end if;

  select last_seen_at into v_prev from public.user_presence where user_id = v_uid;

  insert into public.user_presence (user_id, last_seen_at)
  values (v_uid, now())
  on conflict (user_id) do update set last_seen_at = excluded.last_seen_at;

  if v_prev is null or v_prev < now() - interval '20 minutes' then
    insert into public.user_sessions (user_id, started_at, last_seen_at) values (v_uid, now(), now());
  else
    update public.user_sessions
    set last_seen_at = now()
    where id = (select id from public.user_sessions where user_id = v_uid order by started_at desc limit 1);
  end if;
end;
$$;

revoke all on function public.touch_presence() from public, anon;
grant execute on function public.touch_presence() to authenticated;

-- keep six months of visit history, no more
create extension if not exists pg_cron with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'prune-user-sessions';
select cron.schedule(
  'prune-user-sessions',
  '17 4 * * *',
  $cron$delete from public.user_sessions where started_at < now() - interval '180 days'$cron$
);

-- ---------------------------------------------------------------------------
-- Admin read functions
-- ---------------------------------------------------------------------------

-- who has been active recently (the Users list uses this for "online now" dots)
create or replace function public.admin_presence_snapshot()
returns table(user_id uuid, last_seen_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select up.user_id, up.last_seen_at
    from public.user_presence up
    order by up.last_seen_at desc
    limit 500;
end;
$$;

-- one person's visits over the last N days (the app buckets these by day and
-- time of day in the admin's own time zone)
create or replace function public.admin_user_sessions(p_user_id uuid, p_days integer default 30)
returns table(started_at timestamptz, last_seen_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select s.started_at, s.last_seen_at
    from public.user_sessions s
    where s.user_id = p_user_id
      and s.started_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 180)))
    order by s.started_at desc
    limit 1000;
end;
$$;

-- everything an admin wants on one screen about one person
create or replace function public.admin_user_overview(p_user_id uuid)
returns table(
  id uuid,
  name text,
  email text,
  signup_intent text,
  neighborhood text,
  is_admin boolean,
  is_pro boolean,
  banned boolean,
  joined_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed boolean,
  providers text[],
  listings_count bigint,
  orders_as_buyer bigint,
  orders_as_seller bigint,
  chats_started bigint,
  chats_received bigint,
  messages_sent bigint,
  first_message_at timestamptz,
  reports_against bigint,
  reports_filed bigint,
  last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select
      p.id,
      p.name,
      u.email::text,
      p.signup_intent,
      p.neighborhood,
      p.is_admin,
      p.is_pro,
      p.banned,
      p.created_at,
      u.last_sign_in_at,
      (u.email_confirmed_at is not null),
      coalesce((select array_agg(i.provider order by i.provider) from auth.identities i where i.user_id = p.id), '{}'::text[]),
      (select count(*) from public.listings l where l.seller_id = p.id),
      (select count(*) from public.orders o where o.buyer_id = p.id),
      (select count(*) from public.orders o where o.seller_id = p.id),
      (select count(*) from public.chats c where c.buyer_id = p.id),
      (select count(*) from public.chats c join public.listings l on l.id = c.listing_id where l.seller_id = p.id),
      (select count(*) from public.messages m where m.sender_id = p.id),
      (select min(m.created_at) from public.messages m where m.sender_id = p.id),
      (select count(*) from public.reports r where r.reported_user_id = p.id),
      (select count(*) from public.reports r where r.reporter_id = p.id),
      greatest(
        (select up.last_seen_at from public.user_presence up where up.user_id = p.id),
        (select max(e.created_at) from public.analytics_events e where e.user_id = p.id)
      )
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = p_user_id;
end;
$$;

-- other accounts that may be the same person: the same email once Gmail's
-- dots and "+tags" are ignored, the same display name, or signed up within
-- 15 minutes of this one. These are hints, not proof.
create or replace function public.admin_related_accounts(p_user_id uuid)
returns table(
  id uuid,
  name text,
  email text,
  banned boolean,
  joined_at timestamptz,
  reasons text[]
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  with norm as (
    select
      p.id,
      p.name,
      u.email::text as email,
      p.banned,
      p.created_at,
      lower(trim(p.name)) as name_key,
      -- gmail ignores dots and anything after a "+"; other providers just the "+tag"
      case
        when lower(split_part(u.email, '@', 2)) in ('gmail.com', 'googlemail.com')
          then replace(regexp_replace(lower(split_part(u.email, '@', 1)), '\+.*$', ''), '.', '') || '@gmail.com'
        else regexp_replace(lower(split_part(u.email, '@', 1)), '\+.*$', '') || '@' || lower(split_part(u.email, '@', 2))
      end as email_key
    from public.profiles p
    join auth.users u on u.id = p.id
  ),
  me as (select * from norm where norm.id = p_user_id)
  select
    n.id,
    n.name,
    n.email,
    n.banned,
    n.created_at,
    array_remove(array[
      case when n.email_key = me.email_key then 'same email address once dots and + tags are ignored' end,
      case when n.name_key = me.name_key and n.name_key <> 'new cook' then 'same display name' end,
      case when abs(extract(epoch from (n.created_at - me.created_at))) <= 900 then 'signed up within 15 minutes' end
    ], null) as reasons
  from norm n
  cross join me
  where n.id <> me.id
    and (
      n.email_key = me.email_key
      or (n.name_key = me.name_key and n.name_key <> 'new cook')
      or abs(extract(epoch from (n.created_at - me.created_at))) <= 900
    )
  order by n.created_at desc
  limit 20;
end;
$$;

-- People whose recent messages look like scam behavior. Computed fresh on each
-- call from the last p_days of messages -- nothing is stored and message text
-- is never returned, only which patterns matched. Banned people and admins
-- are left out.
--
-- Scoring (per distinct pattern, not per message):
--   scam-style payment (gift cards, wire/Western Union/MoneyGram, crypto)  +3
--   asks to move off-app (WhatsApp, Telegram, "text me", ...)              +2
--   payment app, phone number, link, email address                         +1
--   account under 3 days old                                               +2
--   messaged 3+ different people while under 7 days old                    +2
-- Shown at 3 or more; 6 or more is "high".
create or replace function public.admin_risk_senders(p_days integer default 14)
returns table(
  user_id uuid,
  name text,
  email text,
  joined_at timestamptz,
  account_age_hours numeric,
  total_messages bigint,
  flagged_messages bigint,
  people_messaged bigint,
  flags text[],
  last_flagged_at timestamptz,
  score integer,
  level text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  with msgs as (
    select
      m.sender_id,
      m.created_at,
      case when m.sender_id = c.buyer_id then l.seller_id else c.buyer_id end as recipient_id,
      array_remove(array[
        case when m.text ~* '\m(gift ?cards?|western union|moneygram|wire transfer|bitcoin|crypto|cashier''?s check)\M' then 'scam-style payment' end,
        case when m.text ~* '\m(whatsapp|telegram|signal|snapchat|instagram|text me|call me|email me|dm me)\M' then 'asks to move off-app' end,
        case when m.text ~* '\m(zelle|cash ?app|venmo|paypal|apple pay)\M' then 'payment app' end,
        case when m.text ~* '(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}' then 'phone number' end,
        case when m.text ~* '(https?://|www\.)' then 'link' end,
        case when m.text ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then 'email address' end
      ], null) as flags
    from public.messages m
    join public.chats c on c.id = m.chat_id
    join public.listings l on l.id = c.listing_id
    where m.created_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 14), 60)))
      and m.text is not null
  ),
  distinct_flags as (
    select distinct msgs.sender_id, f.flag
    from msgs, lateral unnest(msgs.flags) as f(flag)
  ),
  flag_rollup as (
    select
      d.sender_id,
      array_agg(d.flag order by d.flag) as flags,
      sum(case d.flag when 'scam-style payment' then 3 when 'asks to move off-app' then 2 else 1 end)::integer as flag_score
    from distinct_flags d
    group by d.sender_id
  ),
  activity as (
    select
      msgs.sender_id,
      count(*) as total_messages,
      count(*) filter (where cardinality(msgs.flags) > 0) as flagged_messages,
      count(distinct msgs.recipient_id) as people_messaged,
      max(msgs.created_at) filter (where cardinality(msgs.flags) > 0) as last_flagged_at
    from msgs
    group by msgs.sender_id
  ),
  scored as (
    select
      p.id,
      p.name,
      u.email::text as email,
      p.created_at,
      round((extract(epoch from (now() - p.created_at)) / 3600)::numeric, 1) as age_hours,
      a.total_messages,
      a.flagged_messages,
      a.people_messaged,
      coalesce(fr.flags, '{}'::text[]) as flags,
      a.last_flagged_at,
      (
        coalesce(fr.flag_score, 0)
        + case when p.created_at > now() - interval '3 days' then 2 else 0 end
        + case when a.people_messaged >= 3 and p.created_at > now() - interval '7 days' then 2 else 0 end
      )::integer as score
    from activity a
    join public.profiles p on p.id = a.sender_id
    join auth.users u on u.id = p.id
    left join flag_rollup fr on fr.sender_id = a.sender_id
    where not p.banned and not p.is_admin
  )
  select
    s.id,
    s.name,
    s.email,
    s.created_at,
    s.age_hours,
    s.total_messages,
    s.flagged_messages,
    s.people_messaged,
    s.flags,
    s.last_flagged_at,
    s.score,
    case when s.score >= 6 then 'high' else 'medium' end
  from scored s
  where s.score >= 3
  order by s.score desc, s.last_flagged_at desc nulls last
  limit 50;
end;
$$;

grant execute on function public.admin_presence_snapshot() to authenticated;
grant execute on function public.admin_user_sessions(uuid, integer) to authenticated;
grant execute on function public.admin_user_overview(uuid) to authenticated;
grant execute on function public.admin_related_accounts(uuid) to authenticated;
grant execute on function public.admin_risk_senders(integer) to authenticated;

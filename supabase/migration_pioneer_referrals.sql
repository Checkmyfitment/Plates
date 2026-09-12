-- Recognizes a referral that did more than add one more user -- it brought
-- an active seller into a neighborhood that had real, demonstrated demand
-- (someone already on the area waitlist there) but no seller yet. A plain
-- referral count already exists (Community Builder); this is a second,
-- narrower signal specifically about *where* the referral landed, not just
-- how many. Non-monetary recognition only, same as every other badge here
-- — no credits or payments involved.
--
-- area_waitlist itself is admin-only to read directly (it holds emails),
-- so this has to be a security-definer function rather than a client-side
-- join — it exposes only a count, scoped to the caller's own referrals via
-- auth.uid(), never another user's.
--
-- Standalone and safe to run — read-only, touches no existing data.

create function public.get_pioneer_referral_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct p.id)::integer
  from public.profiles p
  where p.referred_by = auth.uid()
    and p.neighborhood is not null
    and trim(p.neighborhood) <> ''
    and exists (select 1 from public.listings l where l.seller_id = p.id)
    and exists (
      select 1 from public.area_waitlist w
      where w.neighborhood ilike '%' || trim(p.neighborhood) || '%'
    );
$$;

grant execute on function public.get_pioneer_referral_count() to authenticated;

-- Lets a seller post one public reply to a review on their own kitchen —
-- useful for adding context next to a critical review instead of only
-- being able to respond privately in chat, where no one else sees it.
-- Goes through an RPC (not a direct update policy) so a seller can only
-- ever touch the reply columns on their own reviews, never the rating or
-- comment itself.

alter table public.reviews add column if not exists seller_reply text;
alter table public.reviews add column if not exists seller_reply_at timestamptz;

create or replace function public.reply_to_review(p_review_id uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
begin
  select seller_id into v_seller_id from public.reviews where id = p_review_id;
  if v_seller_id is null then
    raise exception 'Review not found.';
  end if;
  if v_seller_id <> auth.uid() then
    raise exception 'not authorized';
  end if;
  if public.is_banned(auth.uid()) then
    raise exception 'Your account is currently suspended.';
  end if;

  update public.reviews
  set seller_reply = nullif(trim(p_reply), ''),
      seller_reply_at = case when nullif(trim(p_reply), '') is null then null else now() end
  where id = p_review_id;
end;
$$;

grant execute on function public.reply_to_review(uuid, text) to authenticated;

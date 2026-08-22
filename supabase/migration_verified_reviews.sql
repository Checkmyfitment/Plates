-- Restricts leaving a new review to buyers who've actually completed an
-- order with that seller — prevents review-bombing or drive-by reviews
-- from someone who's never ordered. Existing reviews (left before this
-- migration) are untouched; this only gates new inserts going forward.
-- Standalone and safe to run — does not touch or delete existing data.

drop policy if exists "Users can leave reviews for other sellers" on public.reviews;
create policy "Users can leave reviews for other sellers"
  on public.reviews for insert
  with check (
    auth.uid() = reviewer_id
    and reviewer_id <> seller_id
    and not public.is_banned(auth.uid())
    and exists (
      select 1 from public.orders o
      where o.buyer_id = reviewer_id
        and o.seller_id = reviews.seller_id
        and o.status = 'completed'
    )
  );

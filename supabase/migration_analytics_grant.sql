-- analytics_events wasn't getting an anon/authenticated INSERT grant along
-- with its RLS policy — same two-independent-layers gotcha hit before with
-- area_waitlist (RLS policy alone isn't enough; the table-level GRANT is a
-- separate requirement). A passing "with check (true)" policy does nothing
-- without this. Safe to re-run.

grant insert on public.analytics_events to anon, authenticated;

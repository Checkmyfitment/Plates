-- Lets a buyer explicitly choose pickup vs delivery at checkout (instead of
-- just leaving a freeform note) whenever the seller has delivery enabled on
-- that listing. Standalone and safe to run.

alter table public.orders
  add column if not exists fulfillment_method text not null default 'pickup'
    check (fulfillment_method in ('pickup', 'delivery'));

alter table public.orders
  add column if not exists delivery_address text;

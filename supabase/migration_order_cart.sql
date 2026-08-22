-- Lets a buyer order multiple different listings from the same seller in
-- one checkout, instead of placing a separate order per item. Each line
-- item is still its own row in `orders` (so per-listing pricing/quantity
-- and existing status logic all keep working unchanged) — cart_id just
-- tags rows placed together in the same checkout so the UI can group and
-- act on them as one unit. Null cart_id (the existing default for every
-- row placed before this migration, and for any future single-item order)
-- just means "not part of a group" — nothing else changes for those.
-- Standalone and safe to run — does not touch or delete existing data.

alter table public.orders add column if not exists cart_id uuid;

create index if not exists orders_cart_id_idx on public.orders (cart_id);

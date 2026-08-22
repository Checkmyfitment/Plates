-- Structured buyer orders, replacing the informal "just message the seller"
-- flow with a real order record (quantity, note, status) while still using
-- the existing chat system to notify the seller — no payment processing,
-- buyers and sellers still arrange payment/pickup themselves.
-- Standalone and safe to run — does not touch or delete existing data.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  note text,
  price_at_order numeric not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_buyer_id_idx on public.orders (buyer_id);
create index if not exists orders_seller_id_idx on public.orders (seller_id);

alter table public.orders enable row level security;

drop policy if exists "Buyers and sellers can view their own orders" on public.orders;
create policy "Buyers and sellers can view their own orders"
  on public.orders for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "Buyers can place orders" on public.orders;
create policy "Buyers can place orders"
  on public.orders for insert
  with check (auth.uid() = buyer_id and buyer_id <> seller_id and not public.is_banned(auth.uid()));

drop policy if exists "Buyers can cancel their own pending orders" on public.orders;
create policy "Buyers can cancel their own pending orders"
  on public.orders for update
  using (auth.uid() = buyer_id and status = 'pending')
  with check (auth.uid() = buyer_id and status = 'cancelled');

drop policy if exists "Sellers can update status on their own orders" on public.orders;
create policy "Sellers can update status on their own orders"
  on public.orders for update
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

drop trigger if exists set_orders_updated_at on public.orders;
drop function if exists public.handle_orders_updated_at() cascade;
create function public.handle_orders_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.handle_orders_updated_at();

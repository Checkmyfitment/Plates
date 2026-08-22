-- Adds a short pickup code to orders so a seller can confirm the person
-- collecting an order is the actual buyer, not just whoever shows up and
-- claims it. The code is generated client-side (one shared code per cart
-- checkout, so a multi-item order only shows one code) and stored plainly --
-- this is a lightweight in-person trust check, not a security boundary, so
-- there's always a "mark picked up anyway" fallback in the UI for when a
-- buyer can't produce it.

alter table public.orders add column if not exists pickup_code text;

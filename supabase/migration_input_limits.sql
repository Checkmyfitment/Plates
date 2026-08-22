-- Stress-test hardening: the client already caps these fields with
-- maxLength, but that's trivially bypassed by anyone calling the API
-- directly, so the real backstop has to live here. Also closes a real gap:
-- listings.price had no floor, so a crafted request could set a negative
-- price today.
alter table public.listings
  add constraint listings_title_length check (char_length(title) <= 100),
  add constraint listings_description_length check (description is null or char_length(description) <= 1000),
  add constraint listings_unit_length check (char_length(unit) <= 30),
  add constraint listings_pickup_length check (pickup is null or char_length(pickup) <= 150),
  add constraint listings_price_range check (price >= 0 and price <= 10000),
  add constraint listings_delivery_notes_length check (delivery_notes is null or char_length(delivery_notes) <= 300);

alter table public.messages
  add constraint messages_text_length check (text is null or char_length(text) <= 1000);

alter table public.reviews
  add constraint reviews_comment_length check (comment is null or char_length(comment) <= 1000),
  add constraint reviews_seller_reply_length check (seller_reply is null or char_length(seller_reply) <= 500);

alter table public.orders
  add constraint orders_note_length check (note is null or char_length(note) <= 500),
  add constraint orders_quantity_max check (quantity <= 99),
  add constraint orders_cancellation_reason_length check (cancellation_reason is null or char_length(cancellation_reason) <= 140),
  add constraint orders_delivery_address_length check (delivery_address is null or char_length(delivery_address) <= 200);

alter table public.profiles
  add constraint profiles_kitchen_length check (kitchen is null or char_length(kitchen) <= 300),
  add constraint profiles_neighborhood_length check (neighborhood is null or char_length(neighborhood) <= 100),
  add constraint profiles_default_pickup_note_length check (default_pickup_note is null or char_length(default_pickup_note) <= 150);

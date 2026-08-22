-- Lets a seller save a "usual pickup" note once on their profile and have
-- it pre-fill every new listing's pickup note, instead of retyping the
-- same address/instructions on every single post.

alter table public.profiles add column if not exists default_pickup_note text;

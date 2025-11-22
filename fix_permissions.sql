-- Disable RLS on all tables to allow the app to read/write freely
-- (Since this is a solo app, this is acceptable for the MVP)

alter table public.menu_items disable row level security;
alter table public.ingredients disable row level security;
alter table public.recipes disable row level security;
alter table public.orders disable row level security;
alter table public.order_items disable row level security;

-- Verify permissions
grant all on all tables in schema public to anon;
grant all on all sequences in schema public to anon;

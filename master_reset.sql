-- MASTER RESET SCRIPT FOR KADE OS
-- WARNING: This script will DROP ALL DATA in the public schema.
-- Run this in the Supabase SQL Editor to reset your project.

-- 1. Clean Slate
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Base Tables (from schema.sql)
-- Menu Items
create table public.menu_items (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  category text not null, -- 'Base', 'Protein', 'Drink', 'Extra'
  price numeric not null,
  cost numeric,
  is_available boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ingredients
create table public.ingredients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  unit text not null, -- 'kg', 'L', 'count'
  current_stock numeric default 0,
  low_stock_threshold numeric default 5,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Recipes (Junction table for Menu -> Ingredients)
create table public.recipes (
  id uuid default uuid_generate_v4() primary key,
  menu_item_id uuid references public.menu_items(id) on delete cascade,
  ingredient_id uuid references public.ingredients(id) on delete cascade,
  quantity_required numeric not null
);

-- Orders
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  total_amount numeric not null,
  status text default 'completed', -- 'completed', 'cancelled', 'pending', 'in_progress', 'ready'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Order Items
create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id),
  quantity integer not null,
  price_at_time numeric not null
);

-- 3. Profiles & Auth (from create_profiles_table.sql & fix_profiles_and_triggers.sql)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  full_name text,
  role text default 'staff' check (role in ('admin', 'staff')),
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Trigger for new users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, role, full_name)
  values (
    new.id, 
    split_part(new.email, '@', 1), 
    'staff', 
    split_part(new.email, '@', 1)
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles
insert into public.profiles (id, username, role, full_name)
select 
  id, 
  split_part(email, '@', 1), 
  'staff', 
  split_part(email, '@', 1)
from auth.users
where id not in (select id from public.profiles);

-- 4. Additional Fields (from add_yield_fields.sql)
ALTER TABLE public.ingredients 
ADD COLUMN IF NOT EXISTS purchase_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS yield_percent numeric DEFAULT 100;

-- 5. Wastage Logs (from create_wastage_logs.sql)
create table public.wastage_logs (
  id uuid default gen_random_uuid() primary key,
  ingredient_id uuid references public.ingredients(id) not null,
  quantity numeric not null,
  reason text,
  cost_at_time numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.wastage_logs enable row level security;
create policy "Enable read access for all users" on public.wastage_logs for select using (true);
create policy "Enable insert access for all users" on public.wastage_logs for insert with check (true);

-- 6. Functions (from create_decrement_stock.sql)
create or replace function decrement_stock(row_id uuid, amount numeric)
returns void as $$
begin
  update public.ingredients
  set current_stock = current_stock - amount
  where id = row_id;
end;
$$ language plpgsql;

-- 7. Seed Data (from schema.sql & seed_recipes.sql)
insert into public.menu_items (name, category, price, cost) values
('Basmati Fried Rice', 'Base', 400, 150),
('Kottu', 'Base', 400, 120),
('Hot Butter Chicken', 'Protein', 590, 250),
('Devilled Chicken', 'Protein', 590, 230),
('Lime Juice', 'Drink', 490, 100),
('Woodapple Smoothie', 'Drink', 890, 300);

insert into public.ingredients (name, unit, current_stock, low_stock_threshold) values
('Basmati Rice', 'kg', 20, 5),
('Chicken', 'kg', 10, 2),
('Lime', 'count', 50, 10),
('Woodapple', 'count', 15, 5);

-- Seed Recipes
DO $$
DECLARE
  rice_id uuid;
  chicken_id uuid;
  lime_id uuid;
  woodapple_id uuid;
  
  fried_rice_id uuid;
  kottu_id uuid;
  hbc_id uuid;
  devilled_id uuid;
  lime_juice_id uuid;
  woodapple_smoothie_id uuid;
BEGIN
  -- Get Ingredient IDs
  SELECT id INTO rice_id FROM public.ingredients WHERE name = 'Basmati Rice';
  SELECT id INTO chicken_id FROM public.ingredients WHERE name = 'Chicken';
  SELECT id INTO lime_id FROM public.ingredients WHERE name = 'Lime';
  SELECT id INTO woodapple_id FROM public.ingredients WHERE name = 'Woodapple';

  -- Get Menu Item IDs
  SELECT id INTO fried_rice_id FROM public.menu_items WHERE name = 'Basmati Fried Rice';
  SELECT id INTO kottu_id FROM public.menu_items WHERE name = 'Kottu';
  SELECT id INTO hbc_id FROM public.menu_items WHERE name = 'Hot Butter Chicken';
  SELECT id INTO devilled_id FROM public.menu_items WHERE name = 'Devilled Chicken';
  SELECT id INTO lime_juice_id FROM public.menu_items WHERE name = 'Lime Juice';
  SELECT id INTO woodapple_smoothie_id FROM public.menu_items WHERE name = 'Woodapple Smoothie';

  -- Insert Recipes
  INSERT INTO public.recipes (menu_item_id, ingredient_id, quantity_required) VALUES (fried_rice_id, rice_id, 0.2);
  INSERT INTO public.recipes (menu_item_id, ingredient_id, quantity_required) VALUES (hbc_id, chicken_id, 0.15);
  INSERT INTO public.recipes (menu_item_id, ingredient_id, quantity_required) VALUES (devilled_id, chicken_id, 0.15);
  INSERT INTO public.recipes (menu_item_id, ingredient_id, quantity_required) VALUES (lime_juice_id, lime_id, 2);
  INSERT INTO public.recipes (menu_item_id, ingredient_id, quantity_required) VALUES (woodapple_smoothie_id, woodapple_id, 1);
END $$;

-- 8. Realtime (from enable_realtime.sql)
begin;
  -- Add tables to the publication
  -- We use 'alter publication' which assumes it exists. If not, create it.
  -- Supabase usually has 'supabase_realtime' by default.
  alter publication supabase_realtime add table orders;
  alter publication supabase_realtime add table wastage_logs;
commit;

-- 9. Permissions (from fix_permissions.sql)
alter table public.menu_items disable row level security;
alter table public.ingredients disable row level security;
alter table public.recipes disable row level security;
alter table public.orders disable row level security;
alter table public.order_items disable row level security;

grant all on all tables in schema public to anon;
grant all on all sequences in schema public to anon;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

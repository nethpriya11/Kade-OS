-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Menu Items
create table public.menu_items (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  category text not null, -- 'Base', 'Protein', 'Drink', 'Extra'
  price numeric not null,
  cost numeric,
  is_available boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Ingredients
create table public.ingredients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  unit text not null, -- 'kg', 'L', 'count'
  current_stock numeric default 0,
  low_stock_threshold numeric default 5,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Recipes (Junction table for Menu -> Ingredients)
create table public.recipes (
  id uuid default uuid_generate_v4() primary key,
  menu_item_id uuid references public.menu_items(id) on delete cascade,
  ingredient_id uuid references public.ingredients(id) on delete cascade,
  quantity_required numeric not null
);

-- 4. Orders
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  total_amount numeric not null,
  status text default 'completed', -- 'completed', 'cancelled'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Order Items
create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id),
  quantity integer not null,
  price_at_time numeric not null
);

-- Seed Data (Optional - for testing)
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

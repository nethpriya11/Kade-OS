-- ============================================
-- KADE OS - Complete Database Schema
-- Source of Truth: This file defines the
-- entire database schema for Kade OS.
-- Version: 1.0.0
-- ============================================

-- Track schema version for migration management
CREATE TABLE IF NOT EXISTS public.schema_version (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- 1. Menu Items
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Base', 'Protein', 'Drink', 'Extra')),
  price NUMERIC NOT NULL,
  cost NUMERIC,
  is_available BOOLEAN DEFAULT TRUE,
  has_portions BOOLEAN DEFAULT FALSE,
  large_price NUMERIC DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 2. Ingredients
CREATE TABLE IF NOT EXISTS public.ingredients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'g', 'l', 'ml', 'count')),
  current_stock NUMERIC DEFAULT 0,
  low_stock_threshold NUMERIC DEFAULT 5,
  purchase_price NUMERIC DEFAULT 0,
  yield_percent NUMERIC DEFAULT 100,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 3. Recipes (Junction: Menu Item <-> Ingredients)
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity_required NUMERIC NOT NULL
);

-- 4. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 5. Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  total_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'ready', 'completed', 'cancelled')),
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card')),
  table_number INT,
  customer_name TEXT,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  discount_type TEXT CHECK (discount_type IN ('percent', 'flat')),
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 6. Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id),
  quantity INTEGER NOT NULL,
  price_at_time NUMERIC NOT NULL,
  portion TEXT DEFAULT 'normal' CHECK (portion IN ('normal', 'large'))
);

-- 7. Restock Logs
CREATE TABLE IF NOT EXISTS public.restock_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id UUID REFERENCES public.ingredients(id) NOT NULL,
  quantity NUMERIC NOT NULL,
  cost_per_unit NUMERIC,
  total_cost NUMERIC,
  supplier_id UUID REFERENCES public.suppliers(id),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 8. Wastage Logs
CREATE TABLE IF NOT EXISTS public.wastage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id UUID REFERENCES public.ingredients(id) NOT NULL,
  quantity NUMERIC NOT NULL,
  reason TEXT CHECK (reason IN ('Spoiled / Expired', 'Spilled / Dropped', 'Overcooked / Burnt', 'Customer Return', 'Staff Meal', 'Other')),
  cost_at_time NUMERIC,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 9. Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('Rent', 'Utilities', 'Salaries', 'Ingredients', 'Equipment', 'Marketing', 'Repairs', 'Other')),
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Shifts
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  duration_minutes INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Restaurant Tables
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_number INT NOT NULL UNIQUE,
  capacity INT NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'reserved')),
  current_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Supplier Prices
CREATE TABLE IF NOT EXISTS public.supplier_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  min_order_qty NUMERIC(12, 2) DEFAULT 0,
  unit TEXT,
  UNIQUE(supplier_id, ingredient_id)
);

-- 14. Settings
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 16. Procurement Orders
CREATE TABLE IF NOT EXISTS public.procurement_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'needed' CHECK (status IN ('needed', 'ordered', 'received')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 17. Procurement Order Items
CREATE TABLE IF NOT EXISTS public.procurement_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  procurement_order_id UUID REFERENCES public.procurement_orders(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES public.ingredients(id) NOT NULL,
  quantity_to_buy NUMERIC NOT NULL,
  estimated_cost NUMERIC,
  supplier_note TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Decrement ingredient stock atomically
CREATE OR REPLACE FUNCTION public.decrement_stock(row_id UUID, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE public.ingredients
  SET current_stock = current_stock - amount
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role, full_name)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),
    'staff',
    SPLIT_PART(NEW.email, '@', 1)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-calculate shift duration on clock out
CREATE OR REPLACE FUNCTION public.calculate_shift_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out IS NOT NULL AND OLD.clock_out IS NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_clock_out ON public.shifts;
CREATE TRIGGER on_clock_out
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.calculate_shift_duration();

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Default restaurant tables (1-15)
INSERT INTO public.restaurant_tables (table_number, capacity) VALUES
  (1, 2), (2, 2), (3, 4), (4, 4), (5, 4),
  (6, 6), (7, 6), (8, 4), (9, 4), (10, 2),
  (11, 2), (12, 4), (13, 4), (14, 6), (15, 8)
ON CONFLICT (table_number) DO NOTHING;

-- Default settings
INSERT INTO public.settings (key, value) VALUES ('tax_rate', '0') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.settings (key, value) VALUES ('business_name', 'Kad') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.settings (key, value) VALUES ('business_address', '') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.settings (key, value) VALUES ('business_phone', '') ON CONFLICT (key) DO NOTHING;

-- ============================================
-- REALTIME PUBLICATION
-- ============================================

-- Supabase realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.wastage_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.restaurant_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.settings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.ingredients;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.restock_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.procurement_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.procurement_order_items;

-- ============================================
-- SEED DATA (for development/testing)
-- ============================================

-- Menu items
INSERT INTO public.menu_items (name, category, price, cost) VALUES
  ('Basmati Fried Rice', 'Base', 400, 150),
  ('Kottu', 'Base', 400, 120),
  ('Hot Butter Chicken', 'Protein', 590, 250),
  ('Devilled Chicken', 'Protein', 590, 230),
  ('Lime Juice', 'Drink', 490, 100),
  ('Woodapple Smoothie', 'Drink', 890, 300)
ON CONFLICT DO NOTHING;

-- Ingredients
INSERT INTO public.ingredients (name, unit, current_stock, low_stock_threshold) VALUES
  ('Basmati Rice', 'kg', 20, 5),
  ('Chicken', 'kg', 10, 2),
  ('Lime', 'count', 50, 10),
  ('Woodapple', 'count', 15, 5)
ON CONFLICT DO NOTHING;

-- Recipes (linking menu items to ingredients)
DO $$
DECLARE
  rice_id UUID; chicken_id UUID; lime_id UUID; woodapple_id UUID;
  fried_rice_id UUID; kottu_id UUID; hbc_id UUID;
  devilled_id UUID; lime_juice_id UUID; woodapple_smoothie_id UUID;
BEGIN
  SELECT id INTO rice_id FROM public.ingredients WHERE name = 'Basmati Rice';
  SELECT id INTO chicken_id FROM public.ingredients WHERE name = 'Chicken';
  SELECT id INTO lime_id FROM public.ingredients WHERE name = 'Lime';
  SELECT id INTO woodapple_id FROM public.ingredients WHERE name = 'Woodapple';

  SELECT id INTO fried_rice_id FROM public.menu_items WHERE name = 'Basmati Fried Rice';
  SELECT id INTO kottu_id FROM public.menu_items WHERE name = 'Kottu';
  SELECT id INTO hbc_id FROM public.menu_items WHERE name = 'Hot Butter Chicken';
  SELECT id INTO devilled_id FROM public.menu_items WHERE name = 'Devilled Chicken';
  SELECT id INTO lime_juice_id FROM public.menu_items WHERE name = 'Lime Juice';
  SELECT id INTO woodapple_smoothie_id FROM public.menu_items WHERE name = 'Woodapple Smoothie';

  INSERT INTO public.recipes (menu_item_id, ingredient_id, quantity_required) VALUES
    (fried_rice_id, rice_id, 0.2),
    (hbc_id, chicken_id, 0.15),
    (devilled_id, chicken_id, 0.15),
    (lime_juice_id, lime_id, 2),
    (woodapple_smoothie_id, woodapple_id, 1)
  ON CONFLICT DO NOTHING;
END $$;

-- Record schema version
INSERT INTO public.schema_version (version) VALUES ('1.0.0')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.schema_version (version) VALUES ('1.1.0')
ON CONFLICT (version) DO NOTHING;

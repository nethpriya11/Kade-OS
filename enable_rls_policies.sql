-- ============================================
-- Enable Row-Level Security on all tables
-- Creates granular policies for each table
-- Revokes excessive anon permissions
-- ============================================

-- 1. Revoke excessive permissions from anon role
-- anon should only have minimal access (read where needed)
REVOKE ALL ON public.ingredients FROM anon;
REVOKE ALL ON public.wastage_logs FROM anon;
REVOKE ALL ON public.menu_items FROM anon;
REVOKE ALL ON public.recipes FROM anon;
REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.order_items FROM anon;
REVOKE ALL ON public.expenses FROM anon;
REVOKE ALL ON public.suppliers FROM anon;
REVOKE ALL ON public.supplier_prices FROM anon;
REVOKE ALL ON public.restaurant_tables FROM anon;
REVOKE ALL ON public.shifts FROM anon;

-- 2. Grant basic read access to anon where needed
GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT ON public.ingredients TO anon;
GRANT SELECT ON public.recipes TO anon;
GRANT SELECT ON public.restaurant_tables TO anon;
GRANT SELECT ON public.settings TO anon;

-- 3. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wastage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 4. Profiles: users read own, admins read all
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ));

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 5. Menu items: all authenticated can read/manage
DROP POLICY IF EXISTS "menu_items_select" ON public.menu_items;
CREATE POLICY "menu_items_select" ON public.menu_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "menu_items_insert" ON public.menu_items;
CREATE POLICY "menu_items_insert" ON public.menu_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "menu_items_update" ON public.menu_items;
CREATE POLICY "menu_items_update" ON public.menu_items
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "menu_items_delete" ON public.menu_items;
CREATE POLICY "menu_items_delete" ON public.menu_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- 6. Ingredients: all authenticated can read/manage
DROP POLICY IF EXISTS "ingredients_select" ON public.ingredients;
CREATE POLICY "ingredients_select" ON public.ingredients
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "ingredients_insert" ON public.ingredients;
CREATE POLICY "ingredients_insert" ON public.ingredients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ingredients_update" ON public.ingredients;
CREATE POLICY "ingredients_update" ON public.ingredients
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ingredients_delete" ON public.ingredients;
CREATE POLICY "ingredients_delete" ON public.ingredients
  FOR DELETE USING (auth.role() = 'authenticated');

-- 7. Recipes: all authenticated can read/manage
DROP POLICY IF EXISTS "recipes_select" ON public.recipes;
CREATE POLICY "recipes_select" ON public.recipes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "recipes_insert" ON public.recipes;
CREATE POLICY "recipes_insert" ON public.recipes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "recipes_update" ON public.recipes;
CREATE POLICY "recipes_update" ON public.recipes
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "recipes_delete" ON public.recipes;
CREATE POLICY "recipes_delete" ON public.recipes
  FOR DELETE USING (auth.role() = 'authenticated');

-- 8. Orders: authenticated read/insert, admin update
DROP POLICY IF EXISTS "orders_select" ON public.orders;
CREATE POLICY "orders_select" ON public.orders
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "orders_insert" ON public.orders;
CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "orders_update" ON public.orders;
CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 9. Order items: authenticated read/insert
DROP POLICY IF EXISTS "order_items_select" ON public.order_items;
CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "order_items_insert" ON public.order_items;
CREATE POLICY "order_items_insert" ON public.order_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "order_items_update" ON public.order_items;
CREATE POLICY "order_items_update" ON public.order_items
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "order_items_delete" ON public.order_items;
CREATE POLICY "order_items_delete" ON public.order_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- 10. Restock logs: authenticated read/insert
DROP POLICY IF EXISTS "restock_logs_select" ON public.restock_logs;
CREATE POLICY "restock_logs_select" ON public.restock_logs
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "restock_logs_insert" ON public.restock_logs;
CREATE POLICY "restock_logs_insert" ON public.restock_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 11. Wastage logs: authenticated read/insert
DROP POLICY IF EXISTS "wastage_logs_select" ON public.wastage_logs;
CREATE POLICY "wastage_logs_select" ON public.wastage_logs
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "wastage_logs_insert" ON public.wastage_logs;
CREATE POLICY "wastage_logs_insert" ON public.wastage_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 12. Expenses: authenticated read/insert
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
CREATE POLICY "expenses_update" ON public.expenses
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
CREATE POLICY "expenses_delete" ON public.expenses
  FOR DELETE USING (auth.role() = 'authenticated');

-- 13. Shifts: users manage their own
DROP POLICY IF EXISTS "shifts_select" ON public.shifts;
CREATE POLICY "shifts_select" ON public.shifts
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ));

DROP POLICY IF EXISTS "shifts_insert" ON public.shifts;
CREATE POLICY "shifts_insert" ON public.shifts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "shifts_update" ON public.shifts;
CREATE POLICY "shifts_update" ON public.shifts
  FOR UPDATE USING (auth.uid() = user_id);

-- 14. Restaurant tables: all authenticated can read/update
DROP POLICY IF EXISTS "restaurant_tables_select" ON public.restaurant_tables;
CREATE POLICY "restaurant_tables_select" ON public.restaurant_tables
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "restaurant_tables_update" ON public.restaurant_tables;
CREATE POLICY "restaurant_tables_update" ON public.restaurant_tables
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 15. Suppliers: authenticated read/insert/update
DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;
CREATE POLICY "suppliers_select" ON public.suppliers
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "suppliers_insert" ON public.suppliers;
CREATE POLICY "suppliers_insert" ON public.suppliers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "suppliers_update" ON public.suppliers;
CREATE POLICY "suppliers_update" ON public.suppliers
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "suppliers_delete" ON public.suppliers;
CREATE POLICY "suppliers_delete" ON public.suppliers
  FOR DELETE USING (auth.role() = 'authenticated');

-- 16. Supplier prices: authenticated read/insert/update
DROP POLICY IF EXISTS "supplier_prices_select" ON public.supplier_prices;
CREATE POLICY "supplier_prices_select" ON public.supplier_prices
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "supplier_prices_insert" ON public.supplier_prices;
CREATE POLICY "supplier_prices_insert" ON public.supplier_prices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "supplier_prices_update" ON public.supplier_prices;
CREATE POLICY "supplier_prices_update" ON public.supplier_prices
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "supplier_prices_delete" ON public.supplier_prices;
CREATE POLICY "supplier_prices_delete" ON public.supplier_prices
  FOR DELETE USING (auth.role() = 'authenticated');

-- 17. Settings: all can read, only authenticated can update
DROP POLICY IF EXISTS "settings_select" ON public.settings;
CREATE POLICY "settings_select" ON public.settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "settings_update" ON public.settings;
CREATE POLICY "settings_update" ON public.settings
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 18. Audit logs: insert by authenticated, read by admins
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ));

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 19. Procurement orders: authenticated read/insert/update
ALTER TABLE public.procurement_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "procurement_orders_select" ON public.procurement_orders;
CREATE POLICY "procurement_orders_select" ON public.procurement_orders
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "procurement_orders_insert" ON public.procurement_orders;
CREATE POLICY "procurement_orders_insert" ON public.procurement_orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "procurement_orders_update" ON public.procurement_orders;
CREATE POLICY "procurement_orders_update" ON public.procurement_orders
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 20. Procurement order items: authenticated read/insert
ALTER TABLE public.procurement_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "procurement_order_items_select" ON public.procurement_order_items;
CREATE POLICY "procurement_order_items_select" ON public.procurement_order_items
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "procurement_order_items_insert" ON public.procurement_order_items;
CREATE POLICY "procurement_order_items_insert" ON public.procurement_order_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

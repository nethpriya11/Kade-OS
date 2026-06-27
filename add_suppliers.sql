-- Suppliers management
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supplier pricing per ingredient
CREATE TABLE IF NOT EXISTS supplier_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  min_order_qty NUMERIC(12, 2) DEFAULT 0,
  unit TEXT,
  UNIQUE(supplier_id, ingredient_id)
);

-- Link restock logs to supplier
ALTER TABLE restock_logs ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read suppliers" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read supplier_prices" ON supplier_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert suppliers" ON suppliers FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update suppliers" ON suppliers FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete suppliers" ON suppliers FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage supplier_prices" ON supplier_prices FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;

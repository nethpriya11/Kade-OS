-- Add tax columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12, 2) DEFAULT 0;

-- Settings table for global configuration (tax rate, business info, etc.)
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default tax rate (configurable via Settings page)
INSERT INTO settings (key, value) VALUES ('tax_rate', '0') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('business_name', 'Kadé') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('business_address', '') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('business_phone', '') ON CONFLICT (key) DO NOTHING;

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read settings" ON settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update settings" ON settings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

ALTER PUBLICATION supabase_realtime ADD TABLE settings;

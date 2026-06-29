-- ============================================
-- Migration: v1.0.0 -> v1.1.0
-- Adds: audit_logs, procurement_orders,
--        procurement_order_items tables
-- Fixes: wastage_logs reason CHECK constraint
-- ============================================

-- 1. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 2. Procurement Orders
CREATE TABLE IF NOT EXISTS public.procurement_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'needed' CHECK (status IN ('needed', 'ordered', 'received')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 3. Procurement Order Items
CREATE TABLE IF NOT EXISTS public.procurement_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  procurement_order_id UUID REFERENCES public.procurement_orders(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES public.ingredients(id) NOT NULL,
  quantity_to_buy NUMERIC NOT NULL,
  estimated_cost NUMERIC,
  supplier_note TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 4. Add CHECK constraint to wastage_logs.reason
ALTER TABLE public.wastage_logs
  ADD CONSTRAINT wastage_logs_reason_check
  CHECK (reason IN ('Spoiled / Expired', 'Spilled / Dropped', 'Overcooked / Burnt', 'Customer Return', 'Staff Meal', 'Other'));

-- 5. Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.procurement_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.procurement_order_items;

-- 6. Record schema version
INSERT INTO public.schema_version (version) VALUES ('1.1.0')
ON CONFLICT (version) DO NOTHING;

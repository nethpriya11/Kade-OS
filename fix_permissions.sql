-- Grant table permissions to standard Supabase roles
GRANT ALL ON public.restock_logs TO anon;
GRANT ALL ON public.restock_logs TO authenticated;
GRANT ALL ON public.restock_logs TO service_role;

-- Ensure RLS is enabled
ALTER TABLE public.restock_logs ENABLE ROW LEVEL SECURITY;

-- Re-apply policies to ensure access
DROP POLICY IF EXISTS "Enable read access for all users" ON public.restock_logs;
CREATE POLICY "Enable read access for all users" ON public.restock_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON public.restock_logs;
CREATE POLICY "Enable insert access for all users" ON public.restock_logs FOR INSERT WITH CHECK (true);

-- 1. Add missing columns to ingredients table
ALTER TABLE public.ingredients 
ADD COLUMN IF NOT EXISTS purchase_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS yield_percent numeric DEFAULT 100;

-- 2. Create wastage_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.wastage_logs (
  id uuid default gen_random_uuid() primary key,
  ingredient_id uuid references public.ingredients(id) not null,
  quantity numeric not null,
  reason text,
  cost_at_time numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Disable RLS on relevant tables to avoid permission issues
ALTER TABLE public.ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wastage_logs DISABLE ROW LEVEL SECURITY;

-- 4. Grant permissions to anon and authenticated roles
GRANT ALL ON public.ingredients TO anon, authenticated, service_role;
GRANT ALL ON public.wastage_logs TO anon, authenticated, service_role;

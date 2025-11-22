-- Add Yield and Purchase Price to Ingredients
ALTER TABLE public.ingredients 
ADD COLUMN IF NOT EXISTS purchase_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS yield_percent numeric DEFAULT 100;

-- Update existing data (optional defaults)
UPDATE public.ingredients SET yield_percent = 100 WHERE yield_percent IS NULL;

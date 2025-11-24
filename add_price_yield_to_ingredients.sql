-- Add purchase_price and yield_percent columns to ingredients table
ALTER TABLE public.ingredients 
ADD COLUMN IF NOT EXISTS purchase_price numeric DEFAULT 0;

ALTER TABLE public.ingredients 
ADD COLUMN IF NOT EXISTS yield_percent numeric DEFAULT 100;

-- Update existing rows to have defaults if they are null
UPDATE public.ingredients 
SET purchase_price = 0 
WHERE purchase_price IS NULL;

UPDATE public.ingredients 
SET yield_percent = 100 
WHERE yield_percent IS NULL;

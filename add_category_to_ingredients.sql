-- Add category column to ingredients table
ALTER TABLE public.ingredients 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'Other';

-- Update existing items to have a default category if null (though default handles new ones)
UPDATE public.ingredients 
SET category = 'Other' 
WHERE category IS NULL;

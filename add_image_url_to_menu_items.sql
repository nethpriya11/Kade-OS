-- Add image_url column to menu_items table
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT;

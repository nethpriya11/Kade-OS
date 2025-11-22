-- Seed Recipes (Linking Menu Items to Ingredients)

-- Helper function to get IDs (since UUIDs are random)
-- We'll use a DO block to insert data dynamically

DO $$
DECLARE
  rice_id uuid;
  chicken_id uuid;
  lime_id uuid;
  woodapple_id uuid;
  
  fried_rice_id uuid;
  kottu_id uuid;
  hbc_id uuid;
  devilled_id uuid;
  lime_juice_id uuid;
  woodapple_smoothie_id uuid;
BEGIN
  -- Get Ingredient IDs
  SELECT id INTO rice_id FROM public.ingredients WHERE name = 'Basmati Rice';
  SELECT id INTO chicken_id FROM public.ingredients WHERE name = 'Chicken';
  SELECT id INTO lime_id FROM public.ingredients WHERE name = 'Lime';
  SELECT id INTO woodapple_id FROM public.ingredients WHERE name = 'Woodapple';

  -- Get Menu Item IDs
  SELECT id INTO fried_rice_id FROM public.menu_items WHERE name = 'Basmati Fried Rice';
  SELECT id INTO kottu_id FROM public.menu_items WHERE name = 'Kottu';
  SELECT id INTO hbc_id FROM public.menu_items WHERE name = 'Hot Butter Chicken';
  SELECT id INTO devilled_id FROM public.menu_items WHERE name = 'Devilled Chicken';
  SELECT id INTO lime_juice_id FROM public.menu_items WHERE name = 'Lime Juice';
  SELECT id INTO woodapple_smoothie_id FROM public.menu_items WHERE name = 'Woodapple Smoothie';

  -- Insert Recipes
  
  -- Basmati Fried Rice uses 0.2kg Rice
  INSERT INTO public.recipes (menu_item_id, ingredient_id, quantity_required)
  VALUES (fried_rice_id, rice_id, 0.2);

  -- Hot Butter Chicken uses 0.15kg Chicken
  INSERT INTO public.recipes (menu_item_id, ingredient_id, quantity_required)
  VALUES (hbc_id, chicken_id, 0.15);

  -- Devilled Chicken uses 0.15kg Chicken
  INSERT INTO public.recipes (menu_item_id, ingredient_id, quantity_required)
  VALUES (devilled_id, chicken_id, 0.15);

  -- Lime Juice uses 2 Limes
  INSERT INTO public.recipes (menu_item_id, ingredient_id, quantity_required)
  VALUES (lime_juice_id, lime_id, 2);

  -- Woodapple Smoothie uses 1 Woodapple
  INSERT INTO public.recipes (menu_item_id, ingredient_id, quantity_required)
  VALUES (woodapple_smoothie_id, woodapple_id, 1);

END $$;

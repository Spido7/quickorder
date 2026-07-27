-- Add has_variants and variants to menu_items table
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS has_variants boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]'::jsonb;

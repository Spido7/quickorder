-- ============================================================
-- QR Menu — Verify Menu Relations & RLS Tenant Isolation
-- Ensures schema integrity and implements multi-tenant security
-- ============================================================

-- Step 1: Ensure menu_categories table exists with correct schema
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Ensure menu_items table has correct schema, add missing columns, and update constraints
-- Add description column if missing
ALTER TABLE public.menu_items 
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Add image_url column if missing
ALTER TABLE public.menu_items 
  ADD COLUMN IF NOT EXISTS image_url VARCHAR;

-- Drop existing category_id foreign key constraint if it exists (which is ON DELETE SET NULL)
ALTER TABLE public.menu_items
  DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;

-- Re-add category_id foreign key with ON DELETE CASCADE
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_category_id_fkey 
  FOREIGN KEY (category_id) 
  REFERENCES public.menu_categories(id) 
  ON DELETE CASCADE;

-- Step 3: Row Level Security (RLS) policies
-- Enable RLS on both tables
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on menu_categories
DROP POLICY IF EXISTS "Public select menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Master full access menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Owners manage own menu categories" ON public.menu_categories;

-- Create new policies on menu_categories
CREATE POLICY "Public select menu categories"
  ON public.menu_categories FOR SELECT
  USING (true);

CREATE POLICY "Owners manage own menu categories"
  ON public.menu_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cafe_profiles
      WHERE cafe_profiles.cafe_id = menu_categories.cafe_id
        AND cafe_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cafe_profiles
      WHERE cafe_profiles.cafe_id = menu_categories.cafe_id
        AND cafe_profiles.user_id = auth.uid()
    )
  );

-- Drop existing policies on menu_items
DROP POLICY IF EXISTS "Public menu read" ON public.menu_items;
DROP POLICY IF EXISTS "Owner menu write" ON public.menu_items;
DROP POLICY IF EXISTS "Public select menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners manage own menu items" ON public.menu_items;

-- Create new policies on menu_items
CREATE POLICY "Public select menu items"
  ON public.menu_items FOR SELECT
  USING (true);

CREATE POLICY "Owners manage own menu items"
  ON public.menu_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cafe_profiles
      WHERE cafe_profiles.cafe_id = menu_items.cafe_id
        AND cafe_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cafe_profiles
      WHERE cafe_profiles.cafe_id = menu_items.cafe_id
        AND cafe_profiles.user_id = auth.uid()
    )
  );

-- Step 4: Performance Indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_cafe_category 
  ON public.menu_items (cafe_id, category_id);

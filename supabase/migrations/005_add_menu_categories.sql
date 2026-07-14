-- ============================================================
-- QR Menu — Add Menu Categories infrastructure
-- Migration to support grouping menu items into categories
-- ============================================================

-- Step 1: Create menu_categories table
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Alter menu_items to add category_id column
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL;

-- Step 3: Enable RLS on menu_categories
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for menu_categories
CREATE POLICY "Public select menu categories"
  ON public.menu_categories FOR SELECT
  USING (true);

CREATE POLICY "Master full access menu categories"
  ON public.menu_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cafe_profiles
      WHERE cafe_profiles.cafe_id = menu_categories.cafe_id
        AND cafe_profiles.user_id = auth.uid()
        AND cafe_profiles.role = 'master'
    )
  );

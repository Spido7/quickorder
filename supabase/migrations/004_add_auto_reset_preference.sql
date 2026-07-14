-- ============================================================
-- QR Menu — Add Daily Menu Reset Preference and Profiles (RBAC)
-- Migration to add auto_reset_menu preference, cafe_profiles table, and update the cron job
-- ============================================================

-- Step 1: Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Alter cafes table to add auto_reset_menu preference
ALTER TABLE public.cafes 
  ADD COLUMN IF NOT EXISTS auto_reset_menu BOOLEAN NOT NULL DEFAULT true;

-- Step 3: Create cafe_profiles table for Role-Based Access Control (RBAC)
CREATE TABLE IF NOT EXISTS public.cafe_profiles (
  cafe_id UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('master', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cafe_id, user_id)
);

-- Step 4: Enable RLS on cafe_profiles
ALTER TABLE public.cafe_profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for cafe_profiles
CREATE POLICY "Users can read their own cafe profiles"
  ON public.cafe_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Cafe masters can manage all profiles for their cafe"
  ON public.cafe_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cafe_profiles
      WHERE cafe_profiles.cafe_id = cafe_profiles.cafe_id
        AND cafe_profiles.user_id = auth.uid()
        AND cafe_profiles.role = 'master'
    )
  );

-- Step 6: Populate initial master profiles for existing cafes
INSERT INTO public.cafe_profiles (cafe_id, user_id, role)
SELECT id, id, 'master'
FROM public.cafes
ON CONFLICT (cafe_id, user_id) DO NOTHING;

-- Step 7: Recreate the daily reset pg_cron job to respect auto_reset_menu
-- First unschedule the previous job to prevent duplicates/errors
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'reset-out-of-stock-midnight-ist';

-- Schedule the updated job with the preference filter subquery
-- Timezone context: 18:30 UTC corresponds to 00:00 (Midnight) IST (Indian Standard Time).
SELECT cron.schedule(
  'reset-out-of-stock-midnight-ist',
  '30 18 * * *',
  $$UPDATE public.menu_items 
    SET is_available = true 
    WHERE is_available = false 
      AND cafe_id IN (
        SELECT id FROM public.cafes WHERE auto_reset_menu = true
      );$$
);

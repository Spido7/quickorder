-- ============================================================
-- QR Menu — Fix cafe_profiles RLS Infinite Recursion
-- Fixes recursive policy evaluation by introducing a SECURITY DEFINER helper function.
-- ============================================================

-- Step 1: Drop the recursive policy
DROP POLICY IF EXISTS "Cafe masters can manage all profiles for their cafe" ON public.cafe_profiles;

-- Step 2: Create helper function to check if a user is a master for a cafe
-- Run with SECURITY DEFINER to bypass RLS and break the recursion loop
CREATE OR REPLACE FUNCTION public.is_cafe_master(check_cafe_id UUID, check_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.cafe_profiles
    WHERE cafe_profiles.cafe_id = check_cafe_id
      AND cafe_profiles.user_id = check_user_id
      AND cafe_profiles.role = 'master'
  );
END;
$$;

-- Step 3: Recreate the policy using the helper function
CREATE POLICY "Cafe masters can manage all profiles for their cafe"
  ON public.cafe_profiles FOR ALL
  USING (
    public.is_cafe_master(cafe_id, auth.uid())
  );

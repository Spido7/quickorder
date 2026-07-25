-- ============================================================
-- QR Menu — Allow Owners to Insert Their Own Profile
-- Resolves RLS violation on cafe_profiles when setting up a new cafe
-- ============================================================

CREATE POLICY "Users can create their own cafe profile" 
ON public.cafe_profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

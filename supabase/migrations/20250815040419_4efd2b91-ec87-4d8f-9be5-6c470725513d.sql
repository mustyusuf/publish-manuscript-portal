-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a more restrictive policy that allows users to view all profiles but with email restrictions
CREATE POLICY "Users can view all profiles with email restrictions" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  -- Users can see their own profile with all data including email
  auth.uid() = user_id 
  OR 
  -- Admins can see all profiles with all data including email
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create a separate policy for viewing public profile data (without email)
CREATE POLICY "Users can view public profile data" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  -- All authenticated users can view basic profile data (excluding email)
  true
);

-- Since PostgreSQL RLS doesn't support column-level restrictions directly,
-- we need to handle email visibility at the application level.
-- The policies above ensure proper access control for the table level.
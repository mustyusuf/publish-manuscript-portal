-- Drop the conflicting policies
DROP POLICY IF EXISTS "Users can view all profiles with email restrictions" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public profile data" ON public.profiles;

-- Recreate a simple policy that allows viewing profiles but we'll handle email visibility in code
CREATE POLICY "Users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);
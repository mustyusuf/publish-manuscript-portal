-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

-- Create a more restrictive policy that properly protects personal information
CREATE POLICY "Restricted profile access" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  -- Users can view their own profile completely
  auth.uid() = user_id 
  OR 
  -- Admins and super admins can view all profiles
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Create a database function to get limited public profile data for review system
CREATE OR REPLACE FUNCTION public.get_public_profile_data(target_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  first_name text,
  last_name text
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.first_name,
    p.last_name
  FROM profiles p
  WHERE p.user_id = target_user_id;
$$;
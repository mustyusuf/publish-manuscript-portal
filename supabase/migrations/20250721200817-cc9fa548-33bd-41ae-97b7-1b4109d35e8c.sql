-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Update user_roles RLS policies to handle super admin visibility
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

CREATE POLICY "Users can view appropriate roles" ON public.user_roles
FOR SELECT 
TO authenticated
USING (
  -- Super admins can see all roles
  is_super_admin(auth.uid()) OR
  -- Regular admins can see non-super-admin roles
  (has_role(auth.uid(), 'admin') AND role != 'super_admin') OR
  -- Everyone can see their own role
  user_id = auth.uid()
);

-- Assign super admin role to the specified email
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find the user ID for the email
  SELECT au.id INTO target_user_id
  FROM auth.users au
  WHERE au.email = 'yusufmohammadmustapha4@gmail.com';
  
  IF target_user_id IS NOT NULL THEN
    -- Remove any existing roles for this user
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    
    -- Add super_admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'super_admin');
  END IF;
END $$;
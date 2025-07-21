-- Change yusufmohammadmustapha4@gmail.com back to regular admin
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find the user ID for the email
  SELECT au.id INTO target_user_id
  FROM auth.users au
  WHERE au.email = 'yusufmohammadmustapha4@gmail.com';
  
  IF target_user_id IS NOT NULL THEN
    -- Update role from super_admin to admin
    UPDATE public.user_roles 
    SET role = 'admin'
    WHERE user_id = target_user_id AND role = 'super_admin';
  END IF;
END $$;
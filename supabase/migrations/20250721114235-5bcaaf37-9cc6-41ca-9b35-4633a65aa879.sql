-- Remove editor role completely and implement super admin system

-- First, ensure all editors are converted to reviewers
UPDATE user_roles SET role = 'reviewer'::app_role WHERE role = 'editor'::app_role;

-- Add super admin designation to user_roles table
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Make yusufmohammadmustapha4@gmail.com a super admin
UPDATE user_roles 
SET is_super_admin = TRUE 
WHERE user_id = (
  SELECT user_id 
  FROM profiles 
  WHERE email = 'yusufmohammadmustapha4@gmail.com'
);

-- Drop and recreate app_role enum without editor
ALTER TYPE app_role RENAME TO app_role_old;
CREATE TYPE app_role AS ENUM ('admin', 'reviewer', 'author');
ALTER TABLE user_roles ALTER COLUMN role TYPE app_role USING role::text::app_role;
DROP TYPE app_role_old;

-- Update has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create super admin check function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin 
     FROM public.user_roles 
     WHERE user_id = _user_id AND role = 'admin'
     LIMIT 1), 
    FALSE
  )
$$;

-- Drop and recreate all policies with super admin restrictions

-- User roles policies
DROP POLICY IF EXISTS "Only admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view all roles" ON user_roles;

CREATE POLICY "Super admins can manage all roles" 
ON user_roles 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Regular admins can only change author to reviewer" 
ON user_roles 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin') AND 
  NOT is_super_admin(auth.uid()) AND
  auth.uid() != user_id AND -- Can't change their own role
  role = 'author' -- Can only change authors
)
WITH CHECK (
  has_role(auth.uid(), 'admin') AND 
  NOT is_super_admin(auth.uid()) AND
  auth.uid() != user_id AND -- Can't change their own role
  role = 'reviewer' -- Can only change to reviewer
);

CREATE POLICY "Users can view all roles" 
ON user_roles 
FOR SELECT 
USING (true);
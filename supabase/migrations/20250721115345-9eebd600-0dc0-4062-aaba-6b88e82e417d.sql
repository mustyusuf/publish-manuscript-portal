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

-- Drop all existing policies to avoid dependency issues
DROP POLICY IF EXISTS "Only admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Admins can update all manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Authors can view their own manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Authors can create their own manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Authors can update their own manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Reviewers can view assigned manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Admins can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can create reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can update all reviews" ON reviews;
DROP POLICY IF EXISTS "Reviewers can view their own reviews" ON reviews;
DROP POLICY IF EXISTS "Reviewers can update their own reviews" ON reviews;
DROP POLICY IF EXISTS "Authors can view reviews of their manuscripts" ON reviews;

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

-- Recreate policies with super admin restrictions

-- User roles policies
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

-- Manuscript policies
CREATE POLICY "Admins can view all manuscripts" 
ON manuscripts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all manuscripts" 
ON manuscripts 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authors can view their own manuscripts" 
ON manuscripts 
FOR SELECT 
USING (auth.uid() = author_id);

CREATE POLICY "Authors can create their own manuscripts" 
ON manuscripts 
FOR INSERT 
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own manuscripts" 
ON manuscripts 
FOR UPDATE 
USING (auth.uid() = author_id AND status = 'submitted');

CREATE POLICY "Reviewers can view assigned manuscripts" 
ON manuscripts 
FOR SELECT 
USING (
  has_role(auth.uid(), 'reviewer') AND 
  EXISTS (
    SELECT 1 FROM reviews 
    WHERE manuscript_id = manuscripts.id AND reviewer_id = auth.uid()
  )
);

-- Review policies
CREATE POLICY "Admins can view all reviews" 
ON reviews 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create reviews" 
ON reviews 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all reviews" 
ON reviews 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Reviewers can view their own reviews" 
ON reviews 
FOR SELECT 
USING (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can update their own reviews" 
ON reviews 
FOR UPDATE 
USING (auth.uid() = reviewer_id);

CREATE POLICY "Authors can view reviews of their manuscripts" 
ON reviews 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM manuscripts 
    WHERE id = reviews.manuscript_id AND author_id = auth.uid()
  )
);
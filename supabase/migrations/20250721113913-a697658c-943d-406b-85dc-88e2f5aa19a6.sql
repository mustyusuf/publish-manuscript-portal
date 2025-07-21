-- Remove editor role completely and implement super admin system

-- First, ensure all editors are converted to reviewers
UPDATE user_roles SET role = 'reviewer' WHERE role = 'editor';

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

-- Recreate app_role enum without editor
DROP TYPE IF EXISTS app_role CASCADE;
CREATE TYPE app_role AS ENUM ('admin', 'reviewer', 'author');

-- Update user_roles table to use new enum
ALTER TABLE user_roles ALTER COLUMN role TYPE app_role USING role::text::app_role;

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

-- Manuscript policies (keep existing ones)
DROP POLICY IF EXISTS "Admins can view all manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Admins can update all manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Authors can view their own manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Authors can create their own manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Authors can update their own manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Reviewers can view assigned manuscripts" ON manuscripts;

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
DROP POLICY IF EXISTS "Admins can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can create reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can update all reviews" ON reviews;
DROP POLICY IF EXISTS "Reviewers can view their own reviews" ON reviews;
DROP POLICY IF EXISTS "Reviewers can update their own reviews" ON reviews;
DROP POLICY IF EXISTS "Authors can view reviews of their manuscripts" ON reviews;

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

-- Storage policies
DROP POLICY IF EXISTS "Users can upload manuscripts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own manuscripts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all manuscripts" ON storage.objects;

CREATE POLICY "Users can upload manuscripts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'manuscripts' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own manuscripts" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'manuscripts' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all manuscripts" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'manuscripts' AND 
  has_role(auth.uid(), 'admin')
);
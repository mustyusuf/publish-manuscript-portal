-- Create app_role enum if it doesn't exist (without editor)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('admin', 'reviewer', 'author');
  END IF;
END$$;

-- Ensure user_roles has the role column with correct type
DO $$
BEGIN
  -- Check if role column exists and add/fix if needed
  IF NOT EXISTS (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name='user_roles' AND column_name='role'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN role app_role;
  END IF;
END$$;

-- First, ensure all editors are converted to reviewers (handle any remaining)
UPDATE user_roles SET role = 'reviewer'::app_role WHERE role::text = 'editor';

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

-- Recreate has_role function
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

-- Recreate get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
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

-- Storage policies
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
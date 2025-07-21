-- Drop storage policies that depend on has_role function
DROP POLICY IF EXISTS "Users can view manuscripts they have access to" ON storage.objects;

-- Drop ALL remaining policies that depend on role column
DROP POLICY IF EXISTS "Only admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Admins can update all manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Authors can create their own manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Authors can update their own manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Authors can view their own manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Reviewers can view assigned manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Admins can create reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can update all reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Authors can view reviews of their manuscripts" ON reviews;
DROP POLICY IF EXISTS "Reviewers can update their own reviews" ON reviews;
DROP POLICY IF EXISTS "Reviewers can view their own reviews" ON reviews;

-- Drop the function
DROP FUNCTION IF EXISTS has_role(uuid, app_role) CASCADE;

-- Update any existing editor users to reviewer role  
UPDATE user_roles SET role = 'reviewer' WHERE role = 'editor';

-- Create new enum without editor
CREATE TYPE app_role_new AS ENUM ('admin', 'reviewer', 'author');

-- Update the column to use the new enum
ALTER TABLE user_roles ALTER COLUMN role TYPE app_role_new USING role::text::app_role_new;

-- Drop old enum and rename new one
DROP TYPE app_role;
ALTER TYPE app_role_new RENAME TO app_role;

-- Recreate the has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Recreate user_roles policies
CREATE POLICY "Only admins can manage roles" 
ON user_roles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Recreate manuscript policies with reviewers having editor privileges
CREATE POLICY "Admins can view all manuscripts" 
ON manuscripts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all manuscripts" 
ON manuscripts 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authors can create their own manuscripts" 
ON manuscripts 
FOR INSERT 
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own manuscripts" 
ON manuscripts 
FOR UPDATE 
USING (auth.uid() = author_id AND status = 'submitted'::manuscript_status);

CREATE POLICY "Authors can view their own manuscripts" 
ON manuscripts 
FOR SELECT 
USING (auth.uid() = author_id);

-- Reviewers now have full manuscript access (previously editor privileges)
CREATE POLICY "Reviewers can view all manuscripts" 
ON manuscripts 
FOR SELECT 
USING (has_role(auth.uid(), 'reviewer'::app_role));

CREATE POLICY "Reviewers can create manuscripts" 
ON manuscripts 
FOR INSERT 
WITH CHECK (
  auth.uid() = author_id AND 
  has_role(auth.uid(), 'reviewer'::app_role)
);

CREATE POLICY "Reviewers can update all manuscripts" 
ON manuscripts 
FOR UPDATE 
USING (has_role(auth.uid(), 'reviewer'::app_role));

-- Recreate review policies with reviewers having full access
CREATE POLICY "Admins can create reviews" 
ON reviews 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all reviews" 
ON reviews 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all reviews" 
ON reviews 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authors can view reviews of their manuscripts" 
ON reviews 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM manuscripts 
  WHERE manuscripts.id = reviews.manuscript_id AND manuscripts.author_id = auth.uid()
));

CREATE POLICY "Reviewers can update their own reviews" 
ON reviews 
FOR UPDATE 
USING (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can view their own reviews" 
ON reviews 
FOR SELECT 
USING (auth.uid() = reviewer_id);

-- Reviewers now have full review management privileges (previously editor privileges)
CREATE POLICY "Reviewers can create reviews" 
ON reviews 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'reviewer'::app_role));

CREATE POLICY "Reviewers can view all reviews" 
ON reviews 
FOR SELECT 
USING (has_role(auth.uid(), 'reviewer'::app_role));

CREATE POLICY "Reviewers can update all reviews" 
ON reviews 
FOR UPDATE 
USING (has_role(auth.uid(), 'reviewer'::app_role));

-- Recreate storage policy
CREATE POLICY "Users can view manuscripts they have access to" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'manuscripts' AND 
  (
    -- Admins can access all files
    has_role(auth.uid(), 'admin'::app_role) OR
    -- Reviewers can access all files (previously editor privilege)
    has_role(auth.uid(), 'reviewer'::app_role) OR
    -- Authors can access their own files
    (storage.foldername(name))[1] = auth.uid()::text
  )
);
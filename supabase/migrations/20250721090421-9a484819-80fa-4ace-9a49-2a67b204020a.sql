-- Drop ALL remaining policies that depend on role column
DROP POLICY "Only admins can manage roles" ON user_roles;
DROP POLICY "Admins can view all manuscripts" ON manuscripts;
DROP POLICY "Admins can update all manuscripts" ON manuscripts;
DROP POLICY "Authors can create their own manuscripts" ON manuscripts;
DROP POLICY "Authors can update their own manuscripts" ON manuscripts;
DROP POLICY "Authors can view their own manuscripts" ON manuscripts;
DROP POLICY "Reviewers can view assigned manuscripts" ON manuscripts;
DROP POLICY "Admins can create reviews" ON reviews;
DROP POLICY "Admins can update all reviews" ON reviews;
DROP POLICY "Admins can view all reviews" ON reviews;
DROP POLICY "Authors can view reviews of their manuscripts" ON reviews;
DROP POLICY "Reviewers can update their own reviews" ON reviews;
DROP POLICY "Reviewers can view their own reviews" ON reviews;

-- Also drop the function to avoid conflicts
DROP FUNCTION IF EXISTS has_role(uuid, app_role);

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

-- Recreate manuscript policies with reviewers having full privileges
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

-- Reviewers now have full manuscript access (like editors previously had)
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

-- Reviewers now have full review management privileges (like editors)
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
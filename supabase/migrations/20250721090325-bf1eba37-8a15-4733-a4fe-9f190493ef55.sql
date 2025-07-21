-- Remove editor role and consolidate privileges into reviewer role

-- First, update any existing editor users to reviewer role
UPDATE user_roles SET role = 'reviewer' WHERE role = 'editor';

-- Drop ALL policies that depend on the role column
DROP POLICY IF EXISTS "Only admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Authors can create their own manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Authors can update their own manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Authors can view their own manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Reviewers can view assigned manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Reviewers can view all manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Reviewers can create manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Reviewers can update manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Admins can create reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can update all reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Authors can view reviews of their manuscripts" ON reviews;
DROP POLICY IF EXISTS "Reviewers can update their own reviews" ON reviews;
DROP POLICY IF EXISTS "Reviewers can view their own reviews" ON reviews;
DROP POLICY IF EXISTS "Reviewers can create reviews" ON reviews;
DROP POLICY IF EXISTS "Reviewers can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Reviewers can update all reviews" ON reviews;

-- Create new enum without editor
CREATE TYPE app_role_new AS ENUM ('admin', 'reviewer', 'author');

-- Update the column to use the new enum
ALTER TABLE user_roles ALTER COLUMN role TYPE app_role_new USING role::text::app_role_new;

-- Drop old enum and rename new one
DROP TYPE app_role;
ALTER TYPE app_role_new RENAME TO app_role;

-- Recreate user_roles policies
CREATE POLICY "Only admins can manage roles" 
ON user_roles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view all roles" 
ON user_roles 
FOR SELECT 
USING (true);

-- Recreate manuscript policies
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

-- Recreate review policies
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

CREATE POLICY "Reviewers can create reviews" 
ON reviews 
FOR INSERT 
WITH CHECK (
  auth.uid() = reviewer_id AND 
  has_role(auth.uid(), 'reviewer'::app_role)
);

CREATE POLICY "Reviewers can view all reviews" 
ON reviews 
FOR SELECT 
USING (has_role(auth.uid(), 'reviewer'::app_role));

CREATE POLICY "Reviewers can update all reviews" 
ON reviews 
FOR UPDATE 
USING (has_role(auth.uid(), 'reviewer'::app_role));
-- Remove editor role and consolidate privileges into reviewer role

-- First, update any existing editor users to reviewer role
UPDATE user_roles SET role = 'reviewer' WHERE role = 'editor';

-- Drop and recreate the enum without editor
DROP TYPE IF EXISTS app_role CASCADE;
CREATE TYPE app_role AS ENUM ('admin', 'reviewer', 'author');

-- Recreate the user_roles table with the new enum
ALTER TABLE user_roles ALTER COLUMN role TYPE app_role USING role::text::app_role;

-- Update RLS policies to remove editor references and give reviewers full access

-- Update manuscript policies
DROP POLICY IF EXISTS "Reviewers can view assigned manuscripts" ON manuscripts;

CREATE POLICY "Reviewers can view all manuscripts" 
ON manuscripts 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'reviewer'
));

CREATE POLICY "Reviewers can create manuscripts" 
ON manuscripts 
FOR INSERT 
WITH CHECK (
  auth.uid() = author_id AND 
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = ANY(ARRAY['reviewer', 'author'])
  )
);

CREATE POLICY "Reviewers can update manuscripts" 
ON manuscripts 
FOR UPDATE 
USING (
  (auth.uid() = author_id AND status = 'submitted') OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'reviewer'
  )
);

-- Update review policies to remove editor references
DROP POLICY IF EXISTS "Reviewers and editors can update assigned reviews" ON reviews;
DROP POLICY IF EXISTS "Reviewers and editors can view assigned reviews" ON reviews;

CREATE POLICY "Reviewers can create reviews" 
ON reviews 
FOR INSERT 
WITH CHECK (
  auth.uid() = reviewer_id AND 
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'reviewer'
  )
);

CREATE POLICY "Reviewers can view all reviews" 
ON reviews 
FOR SELECT 
USING (
  auth.uid() = reviewer_id OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'reviewer'
  ) OR
  EXISTS (
    SELECT 1 FROM manuscripts 
    WHERE manuscripts.id = reviews.manuscript_id AND manuscripts.author_id = auth.uid()
  )
);

CREATE POLICY "Reviewers can update all reviews" 
ON reviews 
FOR UPDATE 
USING (
  auth.uid() = reviewer_id OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'reviewer'
  )
);
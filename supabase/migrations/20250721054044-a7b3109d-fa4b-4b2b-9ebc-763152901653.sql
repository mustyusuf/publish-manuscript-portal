-- Update manuscripts policies to allow editors to submit and view manuscripts
DROP POLICY IF EXISTS "Editors can create manuscripts" ON public.manuscripts;
DROP POLICY IF EXISTS "Editors can view their own manuscripts" ON public.manuscripts;
DROP POLICY IF EXISTS "Editors can update their own manuscripts" ON public.manuscripts;

-- Allow editors and authors to create manuscripts
CREATE POLICY "Authors and editors can create manuscripts" 
ON public.manuscripts 
FOR INSERT 
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('author'::app_role, 'editor'::app_role)
  )
);

-- Allow editors and authors to view their own manuscripts
CREATE POLICY "Authors and editors can view their own manuscripts" 
ON public.manuscripts 
FOR SELECT 
USING (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('author'::app_role, 'editor'::app_role)
  )
);

-- Allow editors and authors to update their own manuscripts
CREATE POLICY "Authors and editors can update their own manuscripts" 
ON public.manuscripts 
FOR UPDATE 
USING (
  auth.uid() = author_id AND 
  status = 'submitted'::manuscript_status AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('author'::app_role, 'editor'::app_role)
  )
);

-- Update review policies to allow editors to review assigned manuscripts
DROP POLICY IF EXISTS "Editors can view assigned reviews" ON public.reviews;
DROP POLICY IF EXISTS "Editors can update assigned reviews" ON public.reviews;

-- Allow editors and reviewers to view their assigned reviews
CREATE POLICY "Reviewers and editors can view assigned reviews" 
ON public.reviews 
FOR SELECT 
USING (
  auth.uid() = reviewer_id AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('reviewer'::app_role, 'editor'::app_role)
  )
);

-- Allow editors and reviewers to update their assigned reviews
CREATE POLICY "Reviewers and editors can update assigned reviews" 
ON public.reviews 
FOR UPDATE 
USING (
  auth.uid() = reviewer_id AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('reviewer'::app_role, 'editor'::app_role)
  )
);
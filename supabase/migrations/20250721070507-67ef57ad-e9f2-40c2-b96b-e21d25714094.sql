-- Update manuscript policies to allow reviewers to also submit manuscripts

-- Drop existing policies
DROP POLICY IF EXISTS "Authors and editors can create manuscripts" ON public.manuscripts;
DROP POLICY IF EXISTS "Authors and editors can view their own manuscripts" ON public.manuscripts;
DROP POLICY IF EXISTS "Authors and editors can update their own manuscripts" ON public.manuscripts;

-- Create new policies that include reviewers
CREATE POLICY "Authors, editors, and reviewers can create manuscripts" 
ON public.manuscripts 
FOR INSERT 
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('author'::app_role, 'editor'::app_role, 'reviewer'::app_role)
  )
);

CREATE POLICY "Authors, editors, and reviewers can view their own manuscripts" 
ON public.manuscripts 
FOR SELECT 
USING (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('author'::app_role, 'editor'::app_role, 'reviewer'::app_role)
  )
);

CREATE POLICY "Authors, editors, and reviewers can update their own manuscripts" 
ON public.manuscripts 
FOR UPDATE 
USING (
  auth.uid() = author_id AND 
  status = 'submitted'::manuscript_status AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('author'::app_role, 'editor'::app_role, 'reviewer'::app_role)
  )
);
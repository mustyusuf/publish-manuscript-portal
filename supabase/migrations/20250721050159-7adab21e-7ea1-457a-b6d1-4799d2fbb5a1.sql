-- First, let's drop the problematic policies and recreate them properly
DROP POLICY IF EXISTS "Authors can view their own manuscripts" ON public.manuscripts;
DROP POLICY IF EXISTS "Authors can create manuscripts" ON public.manuscripts;
DROP POLICY IF EXISTS "Authors can update their own manuscripts" ON public.manuscripts;
DROP POLICY IF EXISTS "Admins can view all manuscripts" ON public.manuscripts;
DROP POLICY IF EXISTS "Admins can update manuscripts" ON public.manuscripts;
DROP POLICY IF EXISTS "Reviewers can view assigned manuscripts" ON public.manuscripts;

-- Create simple, non-recursive policies for manuscripts
CREATE POLICY "Authors can view their own manuscripts" 
ON public.manuscripts 
FOR SELECT 
USING (auth.uid() = author_id);

CREATE POLICY "Authors can create their own manuscripts" 
ON public.manuscripts 
FOR INSERT 
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own manuscripts" 
ON public.manuscripts 
FOR UPDATE 
USING (auth.uid() = author_id AND status = 'submitted'::manuscript_status);

-- Simple admin policies without using has_role function
CREATE POLICY "Admins can view all manuscripts" 
ON public.manuscripts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can update all manuscripts" 
ON public.manuscripts 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Simple reviewer policy without recursion
CREATE POLICY "Reviewers can view assigned manuscripts" 
ON public.manuscripts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'reviewer'::app_role
  ) 
  AND EXISTS (
    SELECT 1 FROM public.reviews 
    WHERE manuscript_id = manuscripts.id AND reviewer_id = auth.uid()
  )
);
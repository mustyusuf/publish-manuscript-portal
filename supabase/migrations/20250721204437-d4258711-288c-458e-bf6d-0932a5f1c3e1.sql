-- Disable RLS temporarily to clear all policies
ALTER TABLE public.manuscripts DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.manuscripts ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
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

CREATE POLICY "Admins can view all manuscripts" 
ON public.manuscripts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all manuscripts" 
ON public.manuscripts 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Reviewers can view assigned manuscripts" 
ON public.manuscripts 
FOR SELECT 
USING (
  has_role(auth.uid(), 'reviewer'::app_role) AND 
  EXISTS (
    SELECT 1 FROM reviews 
    WHERE reviews.manuscript_id = manuscripts.id 
    AND reviews.reviewer_id = auth.uid()
  )
);
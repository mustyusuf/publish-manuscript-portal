-- Drop ALL existing policies on manuscripts table
DROP POLICY IF EXISTS "Authors can view their own manuscripts" ON public.manuscripts;
DROP POLICY IF EXISTS "Authors can create their own manuscripts" ON public.manuscripts;
DROP POLICY IF EXISTS "Authors can update their own manuscripts" ON public.manuscripts;
DROP POLICY IF EXISTS "Admins can view all manuscripts" ON public.manuscripts;
DROP POLICY IF EXISTS "Admins can update all manuscripts" ON public.manuscripts;
DROP POLICY IF EXISTS "Reviewers can view assigned manuscripts" ON public.manuscripts;

-- Create fresh policies with clear, non-recursive logic
CREATE POLICY "manuscripts_authors_select" 
ON public.manuscripts 
FOR SELECT 
USING (auth.uid() = author_id);

CREATE POLICY "manuscripts_authors_insert" 
ON public.manuscripts 
FOR INSERT 
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "manuscripts_authors_update" 
ON public.manuscripts 
FOR UPDATE 
USING (auth.uid() = author_id AND status = 'submitted'::manuscript_status);

CREATE POLICY "manuscripts_admins_select" 
ON public.manuscripts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "manuscripts_admins_update" 
ON public.manuscripts 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "manuscripts_reviewers_select" 
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
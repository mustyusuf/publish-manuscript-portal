-- Add 'editor' to the app_role enum
ALTER TYPE app_role ADD VALUE 'editor';

-- Update manuscripts policies to allow editors to submit
CREATE POLICY "Editors can create manuscripts" 
ON public.manuscripts 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('author'::app_role, 'editor'::app_role)
  )
);

CREATE POLICY "Editors can view their own manuscripts" 
ON public.manuscripts 
FOR SELECT 
USING (
  (auth.uid() = author_id) OR
  (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'editor'::app_role
  ) AND auth.uid() = author_id)
);

CREATE POLICY "Editors can update their own manuscripts" 
ON public.manuscripts 
FOR UPDATE 
USING (
  (auth.uid() = author_id) AND 
  (status = 'submitted'::manuscript_status) AND
  (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('author'::app_role, 'editor'::app_role)
  ))
);

-- Update review policies to allow editors to review assigned manuscripts
CREATE POLICY "Editors can view assigned reviews" 
ON public.reviews 
FOR SELECT 
USING (
  (auth.uid() = reviewer_id) OR
  (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'editor'::app_role
  ) AND auth.uid() = reviewer_id)
);

CREATE POLICY "Editors can update assigned reviews" 
ON public.reviews 
FOR UPDATE 
USING (
  (auth.uid() = reviewer_id) AND
  (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('reviewer'::app_role, 'editor'::app_role)
  ))
);
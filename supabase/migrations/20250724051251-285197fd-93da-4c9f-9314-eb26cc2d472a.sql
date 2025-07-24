-- Create table for final documents uploaded by admin
CREATE TABLE public.final_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manuscript_id UUID NOT NULL REFERENCES public.manuscripts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.final_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for final_documents
-- Authors can view final documents for their manuscripts
CREATE POLICY "Authors can view final documents for their manuscripts" 
ON public.final_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.manuscripts 
    WHERE manuscripts.id = final_documents.manuscript_id 
    AND manuscripts.author_id = auth.uid()
  )
);

-- Admins can view all final documents
CREATE POLICY "Admins can view all final documents" 
ON public.final_documents 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert final documents
CREATE POLICY "Admins can insert final documents" 
ON public.final_documents 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update final documents
CREATE POLICY "Admins can update final documents" 
ON public.final_documents 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete final documents
CREATE POLICY "Admins can delete final documents" 
ON public.final_documents 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_final_documents_updated_at
BEFORE UPDATE ON public.final_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
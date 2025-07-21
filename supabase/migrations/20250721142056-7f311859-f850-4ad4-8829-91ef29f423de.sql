-- Create storage policies for manuscripts bucket to allow file uploads

-- Policy for uploading files to manuscripts bucket
CREATE POLICY "Users can upload manuscript files" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'manuscripts' AND 
  auth.uid() IS NOT NULL
);

-- Policy for viewing files in manuscripts bucket  
CREATE POLICY "Users can view manuscript files" ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'manuscripts' AND 
  auth.uid() IS NOT NULL
);

-- Policy for updating files in manuscripts bucket
CREATE POLICY "Users can update manuscript files" ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'manuscripts' AND 
  auth.uid() IS NOT NULL
);

-- Policy for deleting files in manuscripts bucket
CREATE POLICY "Users can delete manuscript files" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'manuscripts' AND 
  auth.uid() IS NOT NULL
);
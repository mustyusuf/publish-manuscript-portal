-- Update the recommendation field to support the new options
-- We'll store the recommendation as text to accommodate all the new options

-- No need to create a new enum, we'll just update the validation in the application layer
-- The current text field in reviews.recommendation can handle all the new values

-- Add any additional columns if needed for file tracking
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS assessment_file_path TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewed_manuscript_path TEXT;
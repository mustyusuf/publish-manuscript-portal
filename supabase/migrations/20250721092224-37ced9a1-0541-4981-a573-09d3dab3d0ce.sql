-- Add cover letter file path to manuscripts table
ALTER TABLE public.manuscripts
ADD COLUMN cover_letter_path text,
ADD COLUMN cover_letter_name text,
ADD COLUMN cover_letter_size integer;
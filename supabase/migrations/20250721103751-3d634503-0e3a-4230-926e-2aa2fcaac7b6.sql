-- Add new status values to the manuscript_status enum
ALTER TYPE manuscript_status ADD VALUE 'internal_review';
ALTER TYPE manuscript_status ADD VALUE 'external_review';
ALTER TYPE manuscript_status ADD VALUE 'accept_without_correction';
ALTER TYPE manuscript_status ADD VALUE 'accept_minor_corrections';
ALTER TYPE manuscript_status ADD VALUE 'accept_major_corrections';
ALTER TYPE manuscript_status ADD VALUE 'published';
ALTER TYPE manuscript_status ADD VALUE 'reject';
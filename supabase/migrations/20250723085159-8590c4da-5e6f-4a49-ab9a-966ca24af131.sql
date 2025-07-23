-- Add admin approval status to review_status enum
-- First, check what values exist in the enum
DO $$
BEGIN
    -- Add pending_admin_approval status to the review_status enum
    ALTER TYPE review_status ADD VALUE IF NOT EXISTS 'pending_admin_approval';
    
    -- Add admin_approved status to the review_status enum  
    ALTER TYPE review_status ADD VALUE IF NOT EXISTS 'admin_approved';
    
    -- Add admin_rejected status to the review_status enum
    ALTER TYPE review_status ADD VALUE IF NOT EXISTS 'admin_rejected';
END$$;
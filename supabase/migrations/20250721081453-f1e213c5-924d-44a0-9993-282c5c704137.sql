-- Fix infinite recursion in RLS policies by removing duplicate/conflicting policies

-- Drop conflicting manuscript policies
DROP POLICY IF EXISTS "Authors, editors, and reviewers can view their own manuscripts" ON manuscripts;
DROP POLICY IF EXISTS "Authors, editors, and reviewers can update their own manuscript" ON manuscripts;
DROP POLICY IF EXISTS "Authors, editors, and reviewers can create manuscripts" ON manuscripts;

-- Drop conflicting review policies that cause recursion
DROP POLICY IF EXISTS "Reviewers and editors can view assigned reviews" ON reviews;
DROP POLICY IF EXISTS "Reviewers and editors can update assigned reviews" ON reviews;
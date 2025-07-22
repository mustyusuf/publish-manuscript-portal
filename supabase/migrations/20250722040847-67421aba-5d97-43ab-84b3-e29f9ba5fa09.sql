-- Completely disable RLS and drop all policies
ALTER TABLE public.manuscripts DISABLE ROW LEVEL SECURITY;

-- Drop any remaining policies
DROP POLICY IF EXISTS "manuscripts_authors_select" ON public.manuscripts;
DROP POLICY IF EXISTS "manuscripts_authors_insert" ON public.manuscripts;
DROP POLICY IF EXISTS "manuscripts_authors_update" ON public.manuscripts;
DROP POLICY IF EXISTS "manuscripts_admins_select" ON public.manuscripts;
DROP POLICY IF EXISTS "manuscripts_admins_update" ON public.manuscripts;
DROP POLICY IF EXISTS "manuscripts_reviewers_select" ON public.manuscripts;

-- Re-enable RLS
ALTER TABLE public.manuscripts ENABLE ROW LEVEL SECURITY;

-- Create simple policies that definitely won't cause recursion
CREATE POLICY "enable_read_access_for_authenticated_users" ON public.manuscripts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "enable_insert_for_authenticated_users" ON public.manuscripts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "enable_update_for_authenticated_users" ON public.manuscripts
    FOR UPDATE USING (auth.role() = 'authenticated');
-- Revert user to normal admin and remove super_admin (idempotent)
-- Target user by email
WITH target AS (
  SELECT id AS user_id
  FROM auth.users
  WHERE lower(email) = lower('yusufmohammadmustapha4@gmail.com')
  LIMIT 1
)
-- Ensure admin role exists
INSERT INTO public.user_roles (user_id, role)
SELECT t.user_id, 'admin'::app_role
FROM target t
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = t.user_id AND ur.role = 'admin'::app_role
);

-- Remove super_admin role if present
WITH target AS (
  SELECT id AS user_id
  FROM auth.users
  WHERE lower(email) = lower('yusufmohammadmustapha4@gmail.com')
  LIMIT 1
)
DELETE FROM public.user_roles ur
USING target t
WHERE ur.user_id = t.user_id AND ur.role = 'super_admin'::app_role;

-- Optional: keep a single role by removing other roles (author/reviewer)
WITH target AS (
  SELECT id AS user_id
  FROM auth.users
  WHERE lower(email) = lower('yusufmohammadmustapha4@gmail.com')
  LIMIT 1
)
DELETE FROM public.user_roles ur
USING target t
WHERE ur.user_id = t.user_id AND ur.role IN ('author'::app_role, 'reviewer'::app_role);

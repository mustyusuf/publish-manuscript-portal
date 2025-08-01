-- Fix remaining function (if there's a trigger function)
-- Check if there's a trigger that needs the function to be fixed
-- The function should be attached to auth.users table as a trigger

-- First, let's check and fix the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger with the fixed function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
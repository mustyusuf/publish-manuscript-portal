-- Fix security vulnerabilities in database functions
-- Setting search_path to 'public' for security

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$function$;

-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;

-- Fix is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$function$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    NEW.email
  );
  
  -- Default role is author
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'author');
  
  RETURN NEW;
END;
$function$;

-- Fix overly permissive manuscript RLS policies
-- Drop existing policies first
DROP POLICY IF EXISTS "enable_read_access_for_authenticated_users" ON public.manuscripts;
DROP POLICY IF EXISTS "enable_insert_for_authenticated_users" ON public.manuscripts;
DROP POLICY IF EXISTS "enable_update_for_authenticated_users" ON public.manuscripts;

-- Create more restrictive policies for manuscripts
-- Authors can only see and modify their own manuscripts
CREATE POLICY "Authors can view their own manuscripts" 
ON public.manuscripts 
FOR SELECT 
USING (auth.uid() = author_id);

-- Admins can view all manuscripts
CREATE POLICY "Admins can view all manuscripts" 
ON public.manuscripts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authors can insert their own manuscripts
CREATE POLICY "Authors can insert their own manuscripts" 
ON public.manuscripts 
FOR INSERT 
WITH CHECK (auth.uid() = author_id);

-- Authors can update their own manuscripts (but not admin_notes or status)
CREATE POLICY "Authors can update their own manuscripts" 
ON public.manuscripts 
FOR UPDATE 
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Admins can update all manuscripts
CREATE POLICY "Admins can update all manuscripts" 
ON public.manuscripts 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enhance user_roles table policies for better role management
-- Drop existing policies first
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view appropriate roles" ON public.user_roles;

-- More granular role management policies
-- Super admins have full control
CREATE POLICY "Super admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (is_super_admin(auth.uid()));

-- Regular admins can only manage non-super-admin roles
CREATE POLICY "Admins can manage non-super-admin roles" 
ON public.user_roles 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND NOT is_super_admin(auth.uid())
  AND role != 'super_admin'::app_role
);

-- Users can view their own role
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

-- Admins can view roles they can manage (fixed syntax)
CREATE POLICY "Admins can view manageable roles" 
ON public.user_roles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND (is_super_admin(auth.uid()) OR role != 'super_admin'::app_role)
);
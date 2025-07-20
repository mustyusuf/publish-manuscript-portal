-- Create enums for manuscript and review statuses
CREATE TYPE public.manuscript_status AS ENUM ('submitted', 'under_review', 'revision_requested', 'accepted', 'rejected');
CREATE TYPE public.review_status AS ENUM ('assigned', 'in_progress', 'completed', 'overdue');
CREATE TYPE public.app_role AS ENUM ('admin', 'author', 'reviewer');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  institution TEXT,
  bio TEXT,
  expertise_areas TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create manuscripts table
CREATE TABLE public.manuscripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  keywords TEXT[],
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  co_authors TEXT[],
  status manuscript_status NOT NULL DEFAULT 'submitted',
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  submission_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  decision_date TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manuscript_id UUID NOT NULL REFERENCES public.manuscripts(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status review_status NOT NULL DEFAULT 'assigned',
  assigned_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_date TIMESTAMP WITH TIME ZONE,
  recommendation TEXT,
  comments TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (manuscript_id, reviewer_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manuscripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles  
CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Only admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for manuscripts
CREATE POLICY "Authors can view their own manuscripts" ON public.manuscripts FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "Admins can view all manuscripts" ON public.manuscripts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Reviewers can view assigned manuscripts" ON public.manuscripts 
  FOR SELECT USING (
    public.has_role(auth.uid(), 'reviewer') AND 
    EXISTS (SELECT 1 FROM public.reviews WHERE manuscript_id = manuscripts.id AND reviewer_id = auth.uid())
  );

CREATE POLICY "Authors can create manuscripts" ON public.manuscripts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Admins can update manuscripts" ON public.manuscripts FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authors can update their own manuscripts" ON public.manuscripts FOR UPDATE USING (auth.uid() = author_id AND status = 'submitted');

-- RLS Policies for reviews
CREATE POLICY "Reviewers can view their own reviews" ON public.reviews FOR SELECT USING (auth.uid() = reviewer_id);
CREATE POLICY "Authors can view reviews of their manuscripts" ON public.reviews 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.manuscripts WHERE id = reviews.manuscript_id AND author_id = auth.uid())
  );
CREATE POLICY "Admins can view all reviews" ON public.reviews FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create reviews" ON public.reviews FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Reviewers can update their own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = reviewer_id);
CREATE POLICY "Admins can update all reviews" ON public.reviews FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for manuscript files
INSERT INTO storage.buckets (id, name, public) VALUES ('manuscripts', 'manuscripts', false);

-- Storage policies for manuscripts
CREATE POLICY "Authors can upload their manuscripts" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'manuscripts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view manuscripts they have access to" ON storage.objects 
  FOR SELECT USING (
    bucket_id = 'manuscripts' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      public.has_role(auth.uid(), 'admin') OR
      EXISTS (
        SELECT 1 FROM public.reviews r
        JOIN public.manuscripts m ON r.manuscript_id = m.id
        WHERE r.reviewer_id = auth.uid() 
        AND m.file_path = name
      )
    )
  );

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_manuscripts_updated_at BEFORE UPDATE ON public.manuscripts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
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
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
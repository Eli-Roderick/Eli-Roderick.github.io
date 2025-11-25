-- Supabase Database Schema for Search Results Application
-- Run these commands in your Supabase SQL Editor

-- Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom search pages
CREATE TABLE public.custom_search_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  query_key TEXT NOT NULL, -- lowercase query used as key
  search_key TEXT NOT NULL, -- sanitized key for URL
  query TEXT NOT NULL, -- original search query
  display_name TEXT, -- custom display name for search bar
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, query_key)
);

-- AI Overviews
CREATE TABLE public.ai_overviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search result assignments (which AI overview is assigned to which search type)
CREATE TABLE public.search_result_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  search_type TEXT NOT NULL, -- the search key/type
  ai_overview_id UUID REFERENCES public.ai_overviews(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, search_type)
);

-- Custom search results
CREATE TABLE public.custom_search_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  search_type TEXT NOT NULL, -- which search page this belongs to
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  snippet TEXT,
  favicon TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Result images (images assigned to search results)
CREATE TABLE public.result_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  result_url TEXT NOT NULL, -- the search result URL this image belongs to
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deleted built-in pages (pages user has hidden)
CREATE TABLE public.deleted_builtin_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, page_key)
);

-- Click tracking logs
CREATE TABLE public.click_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  result_url TEXT NOT NULL,
  result_title TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings (AI overview enabled, etc.)
CREATE TABLE public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, setting_key)
);

-- Row Level Security Policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_search_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_overviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_result_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_builtin_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.click_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage own custom pages" ON public.custom_search_pages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own AI overviews" ON public.ai_overviews FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own assignments" ON public.search_result_assignments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own search results" ON public.custom_search_results FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own result images" ON public.result_images FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own deleted pages" ON public.deleted_builtin_pages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own click logs" ON public.click_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_custom_search_pages_user_id ON public.custom_search_pages(user_id);
CREATE INDEX idx_custom_search_pages_query_key ON public.custom_search_pages(user_id, query_key);
CREATE INDEX idx_ai_overviews_user_id ON public.ai_overviews(user_id);
CREATE INDEX idx_search_result_assignments_user_search ON public.search_result_assignments(user_id, search_type);
CREATE INDEX idx_custom_search_results_user_search ON public.custom_search_results(user_id, search_type);
CREATE INDEX idx_result_images_user_url ON public.result_images(user_id, result_url);
CREATE INDEX idx_click_logs_user_id ON public.click_logs(user_id);
CREATE INDEX idx_user_settings_user_key ON public.user_settings(user_id, setting_key);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.custom_search_pages FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.ai_overviews FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.custom_search_results FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

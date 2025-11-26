-- Complete Supabase Schema - Replaces ALL localStorage
-- This captures every piece of data your brother creates

-- Drop existing tables
DROP TABLE IF EXISTS public.search_result_assignments CASCADE;
DROP TABLE IF EXISTS public.custom_search_results CASCADE;
DROP TABLE IF EXISTS public.result_images CASCADE;
DROP TABLE IF EXISTS public.deleted_builtin_pages CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.click_logs CASCADE;
DROP TABLE IF EXISTS public.custom_search_pages CASCADE;
DROP TABLE IF EXISTS public.ai_overviews CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Users table (simple username-based system)
CREATE TABLE public.user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom search pages (each "experiment" your brother creates)
CREATE TABLE public.custom_search_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  query_key TEXT NOT NULL, -- lowercase query used as key
  search_key TEXT NOT NULL, -- sanitized key for URL
  query TEXT NOT NULL, -- original search query he typed
  display_name TEXT, -- custom display name for search bar
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, query_key)
);

-- AI Overviews (the text he writes in the AI overview section)
CREATE TABLE public.ai_overviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- the actual AI overview text
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search result assignments (which AI overview is assigned to which search)
CREATE TABLE public.search_result_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  search_type TEXT NOT NULL, -- the search key/type
  ai_overview_id UUID REFERENCES public.ai_overviews(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, search_type)
);

-- Custom search results (the result cards he creates/edits)
CREATE TABLE public.custom_search_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  search_type TEXT NOT NULL, -- which search page this belongs to
  title TEXT NOT NULL, -- result title
  url TEXT NOT NULL, -- result URL
  snippet TEXT, -- result description/snippet
  favicon TEXT, -- favicon URL
  display_order INTEGER DEFAULT 0, -- order in the results list
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Result images (images assigned to search results)
CREATE TABLE public.result_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  result_url TEXT NOT NULL, -- the search result URL this image belongs to
  image_url TEXT NOT NULL, -- the image URL
  display_order INTEGER DEFAULT 0, -- order of images for this result
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deleted built-in pages (pages he has hidden)
CREATE TABLE public.deleted_builtin_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL, -- the page key that was deleted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, page_key)
);

-- User settings (AI overview enabled/disabled, page-specific settings, etc.)
CREATE TABLE public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL, -- e.g., 'ai_overview_enabled', 'page_ai_overview_settings'
  setting_value JSONB NOT NULL, -- the setting value (can be any JSON)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, setting_key)
);

-- Click tracking logs (analytics data)
CREATE TABLE public.click_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL, -- what search was active
  result_url TEXT NOT NULL, -- what link was clicked
  result_title TEXT, -- title of the clicked result
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Current AI text (the active AI overview text being edited)
CREATE TABLE public.current_ai_text (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL, -- current AI text content
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id) -- only one current AI text per user
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_search_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_overviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_result_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_builtin_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.click_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_ai_text ENABLE ROW LEVEL SECURITY;

-- Permissive policies (allow all operations for now)
CREATE POLICY "Allow all operations" ON public.user_profiles FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.custom_search_pages FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.ai_overviews FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.search_result_assignments FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.custom_search_results FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.result_images FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.deleted_builtin_pages FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.user_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.click_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.current_ai_text FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX idx_custom_search_pages_user_id ON public.custom_search_pages(user_id);
CREATE INDEX idx_custom_search_pages_query_key ON public.custom_search_pages(user_id, query_key);
CREATE INDEX idx_ai_overviews_user_id ON public.ai_overviews(user_id);
CREATE INDEX idx_search_result_assignments_user_search ON public.search_result_assignments(user_id, search_type);
CREATE INDEX idx_custom_search_results_user_search ON public.custom_search_results(user_id, search_type);
CREATE INDEX idx_custom_search_results_order ON public.custom_search_results(user_id, search_type, display_order);
CREATE INDEX idx_result_images_user_url ON public.result_images(user_id, result_url);
CREATE INDEX idx_deleted_builtin_pages_user ON public.deleted_builtin_pages(user_id);
CREATE INDEX idx_user_settings_user_key ON public.user_settings(user_id, setting_key);
CREATE INDEX idx_click_logs_user_id ON public.click_logs(user_id);
CREATE INDEX idx_click_logs_search ON public.click_logs(user_id, search_query);
CREATE INDEX idx_current_ai_text_user ON public.current_ai_text(user_id);

-- Function for updated_at timestamps
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
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.custom_search_results FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.current_ai_text FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

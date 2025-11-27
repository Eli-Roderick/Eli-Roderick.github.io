-- Simple Username-Based Schema for Search Results Application
-- This works with the localStorage-based username system (no Supabase auth required)

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.search_result_assignments CASCADE;
DROP TABLE IF EXISTS public.custom_search_results CASCADE;
DROP TABLE IF EXISTS public.result_images CASCADE;
DROP TABLE IF EXISTS public.deleted_builtin_pages CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.click_logs CASCADE;
DROP TABLE IF EXISTS public.custom_search_pages CASCADE;
DROP TABLE IF EXISTS public.ai_overviews CASCADE;

-- Custom search pages (uses username directly)
CREATE TABLE public.custom_search_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL, -- simple username from localStorage
  query_key TEXT NOT NULL, -- lowercase query used as key
  search_key TEXT NOT NULL, -- sanitized key for URL
  query TEXT NOT NULL, -- original search query
  display_name TEXT, -- custom display name for search bar
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(username, query_key)
);

-- AI Overviews (uses username directly)
CREATE TABLE public.ai_overviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL, -- simple username from localStorage
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- the actual AI overview text
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search result assignments (uses username directly)
CREATE TABLE public.search_result_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL, -- simple username from localStorage
  search_type TEXT NOT NULL, -- the search key/type
  ai_overview_id UUID REFERENCES public.ai_overviews(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(username, search_type)
);

-- Custom search results (uses username directly)
CREATE TABLE public.custom_search_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL, -- simple username from localStorage
  search_type TEXT NOT NULL, -- which search page this belongs to
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  snippet TEXT NOT NULL,
  favicon TEXT,
  position INTEGER NOT NULL, -- order in results
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Result images (uses username directly)
CREATE TABLE public.result_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL, -- simple username from localStorage
  search_type TEXT NOT NULL,
  result_id TEXT NOT NULL, -- ID of the search result
  image_url TEXT NOT NULL,
  position INTEGER NOT NULL, -- order of images for this result
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(username, search_type, result_id, position)
);

-- Deleted builtin pages (uses username directly)
CREATE TABLE public.deleted_builtin_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL, -- simple username from localStorage
  page_key TEXT NOT NULL, -- the key of the deleted builtin page
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(username, page_key)
);

-- User settings (uses username directly)
CREATE TABLE public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL, -- simple username from localStorage
  setting_key TEXT NOT NULL, -- e.g., 'ai_overview_enabled', 'current_ai_text'
  setting_value JSONB NOT NULL, -- flexible JSON storage for any setting
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(username, setting_key)
);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE public.custom_search_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_overviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_result_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_builtin_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (since we're using simple usernames)
-- In production, you'd want more restrictive policies

CREATE POLICY "Allow all operations on custom_search_pages" ON public.custom_search_pages FOR ALL USING (true);
CREATE POLICY "Allow all operations on ai_overviews" ON public.ai_overviews FOR ALL USING (true);
CREATE POLICY "Allow all operations on search_result_assignments" ON public.search_result_assignments FOR ALL USING (true);
CREATE POLICY "Allow all operations on custom_search_results" ON public.custom_search_results FOR ALL USING (true);
CREATE POLICY "Allow all operations on result_images" ON public.result_images FOR ALL USING (true);
CREATE POLICY "Allow all operations on deleted_builtin_pages" ON public.deleted_builtin_pages FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_settings" ON public.user_settings FOR ALL USING (true);

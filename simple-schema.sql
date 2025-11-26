-- Simple Supabase Schema (without auth dependency)
-- Run this in your Supabase SQL Editor

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.custom_search_pages CASCADE;
DROP TABLE IF EXISTS public.ai_overviews CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Users table (standalone, not dependent on auth.users)
CREATE TABLE public.user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom search pages
CREATE TABLE public.custom_search_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  query_key TEXT NOT NULL,
  search_key TEXT NOT NULL,
  query TEXT NOT NULL,
  display_name TEXT,
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

-- Enable Row Level Security (optional for now)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_search_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_overviews ENABLE ROW LEVEL SECURITY;

-- Simple policies that allow all operations (we'll secure this later)
CREATE POLICY "Allow all operations on user_profiles" ON public.user_profiles FOR ALL USING (true);
CREATE POLICY "Allow all operations on custom_search_pages" ON public.custom_search_pages FOR ALL USING (true);
CREATE POLICY "Allow all operations on ai_overviews" ON public.ai_overviews FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX idx_custom_search_pages_user_id ON public.custom_search_pages(user_id);
CREATE INDEX idx_custom_search_pages_query_key ON public.custom_search_pages(user_id, query_key);
CREATE INDEX idx_ai_overviews_user_id ON public.ai_overviews(user_id);

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

-- IMMEDIATE FIX for missing user profiles
-- Run this in your Supabase SQL Editor

-- 1. Create missing profile for eli.roderick@gmail.com
INSERT INTO public.user_profiles (id, username, created_at, updated_at)
VALUES (
  'd62188fa-f2b6-4172-9eb5-01a4fb79d643',
  'eli.roderick@gmail.com',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create profiles for any other users missing them
INSERT INTO public.user_profiles (id, username, created_at, updated_at)
SELECT 
  u.id,
  COALESCE(u.email, 'user_' || substr(u.id::text, 1, 8)),
  NOW(),
  NOW()
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 3. Create automatic profile creation function (if not exists)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, created_at, updated_at)
  VALUES (NEW.id, COALESCE(NEW.email, 'user_' || substr(NEW.id::text, 1, 8)), NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger for automatic profile creation (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Verify the fix worked
SELECT 
  u.id,
  u.email,
  u.created_at as user_created,
  p.id as profile_id,
  p.created_at as profile_created,
  p.username,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ Profile exists' 
    ELSE '❌ Profile missing' 
  END as status
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
WHERE u.created_at > NOW() - INTERVAL '7 days'
ORDER BY u.created_at DESC;

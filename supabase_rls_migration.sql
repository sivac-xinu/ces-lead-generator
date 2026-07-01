-- ============================================================
-- Supabase RLS Migration: leads & call_logs
-- ============================================================
-- Run this entire script in the Supabase SQL Editor.
-- It is idempotent (safe to re-run).

-- 1. Add user_id columns (idempotent)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Backfill existing rows with the admin user UUID
--    REPLACE 'YOUR_ADMIN_UUID_HERE' with the actual UUID from Supabase Auth > Users.
--    If you don't know it yet, run:  SELECT id FROM auth.users LIMIT 1;
UPDATE leads SET user_id = 'YOUR_ADMIN_UUID_HERE' WHERE user_id IS NULL;
UPDATE call_logs SET user_id = 'YOUR_ADMIN_UUID_HERE' WHERE user_id IS NULL;

-- 3. (Optional) After backfill, make future rows require user_id
-- ALTER TABLE leads ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE call_logs ALTER COLUMN user_id SET NOT NULL;

-- 4. Helper function: check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 5. Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies first (so this script is safe to re-run)
DROP POLICY IF EXISTS "Users can view their own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert their own leads" ON leads;
DROP POLICY IF EXISTS "Users can update their own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete their own leads" ON leads;
DROP POLICY IF EXISTS "Users can view their own call_logs" ON call_logs;
DROP POLICY IF EXISTS "Users can insert their own call_logs" ON call_logs;
DROP POLICY IF EXISTS "Users can update their own call_logs" ON call_logs;
DROP POLICY IF EXISTS "Users can delete their own call_logs" ON call_logs;

-- 7. RLS policies for leads
CREATE POLICY "Users can view their own leads"
  ON leads FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert their own leads"
  ON leads FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can update their own leads"
  ON leads FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete their own leads"
  ON leads FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- 8. RLS policies for call_logs
CREATE POLICY "Users can view their own call_logs"
  ON call_logs FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert their own call_logs"
  ON call_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can update their own call_logs"
  ON call_logs FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete their own call_logs"
  ON call_logs FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

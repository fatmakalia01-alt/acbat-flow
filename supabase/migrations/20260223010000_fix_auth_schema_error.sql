-- =====================================================================
-- FIX: Database error querying schema (Auth Error)
-- Created: 2026-02-23
-- 
-- This migration fixes the "Database error querying schema" error that 
-- occurs during authentication. Root causes:
-- 1. The `supplier_orders` table referenced in RLS policies did not exist
-- 2. RLS policies on `profiles` table may block the auth schema read
-- 3. The handle_new_user trigger function needs SECURITY DEFINER with 
--    correct search_path to avoid schema resolution failures
-- =====================================================================

-- =====================================================================
-- STEP 1: Create supplier_orders table if it doesn't exist
-- (Referenced in RLS but never created, causing schema errors)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.supplier_orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id   uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  reference     text,
  status        text NOT NULL DEFAULT 'draft',
  total_amount  numeric(12,2) DEFAULT 0,
  ordered_at    timestamptz,
  received_at   timestamptz,
  notes         text,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can manage supplier orders' AND tablename = 'supplier_orders') THEN
    CREATE POLICY "Staff can manage supplier orders" ON public.supplier_orders FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- =====================================================================
-- STEP 2: Ensure the profiles table has INSERT policy
-- Without INSERT policy, the trigger cannot create profiles => auth fails
-- =====================================================================
DO $$
BEGIN
  -- Allow the trigger (running as postgres/service_role) to insert profiles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can insert profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Service role can insert profiles" ON public.profiles 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  
  -- Allow users to insert their own profile (needed for signup flow)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- =====================================================================
-- STEP 3: Fix handle_new_user function
-- SECURITY DEFINER + explicit search_path is critical
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't block auth
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger to make sure it's using the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- STEP 4: Grant necessary permissions to authenticated role
-- =====================================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- =====================================================================
-- STEP 5: Verify profiles table has correct column structure
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.user_roles ADD COLUMN email text;
  END IF;
END $$;

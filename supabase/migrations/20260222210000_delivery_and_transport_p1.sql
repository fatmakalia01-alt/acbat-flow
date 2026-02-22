-- Phase 3: Part 1 - Add 'livraison' to app_role enum
-- IMPORTANT: This migration must be executed and committed BEFORE Part 2.

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'livraison') THEN
    ALTER TYPE public.app_role ADD VALUE 'livraison';
  END IF;
END $$;

-- =====================================================================
-- STEP 1 OF 2 — Run this FIRST, wait for "Success", then run step 2
-- Adds missing enum values using bare ALTER TYPE (no DO block)
-- ALTER TYPE ADD VALUE must be a top-level statement to commit properly
-- =====================================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'livraison';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'responsable_showroom';

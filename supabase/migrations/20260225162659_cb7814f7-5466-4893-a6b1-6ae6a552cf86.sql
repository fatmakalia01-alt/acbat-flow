
-- Fix the "Service role full access to roles" policy on user_roles - this is too permissive
-- Service role already bypasses RLS, so this policy is redundant and flagged as always-true
DROP POLICY IF EXISTS "Service role full access to roles" ON public.user_roles;

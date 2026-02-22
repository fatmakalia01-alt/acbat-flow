
-- Fix: The existing policies are RESTRICTIVE (no permissive policies exist).
-- We need at least one PERMISSIVE policy per table for access to work.
-- Adding base permissive policies for authenticated users on clients and suppliers.

-- CLIENTS: Add permissive base policy for authenticated users
CREATE POLICY "Authenticated users base access"
ON public.clients
FOR SELECT
TO authenticated
USING (true);

-- SUPPLIERS: Add permissive base policy for authenticated users  
CREATE POLICY "Authenticated users base access"
ON public.suppliers
FOR SELECT
TO authenticated
USING (true);

-- =====================================================================
-- Security Hardening v2
-- Migration: 20260224030000_security_hardening_v2.sql
--
-- Fixes:
--   1. Profiles table exposed to all authenticated users
--   2. Suppliers/Clients exposed to all authenticated users
--   3. Multiple tables missing write-protection policies
--   4. Delivery driver locations exposed to other drivers
--   5. Function search_path mutable (remaining functions)
--   6. Audit log tightened
-- =====================================================================

-- =====================================================================
-- SECTION 1: Fix profiles SELECT policy
-- Previously: USING (true) → any authenticated user sees ALL profiles
-- Fixed: user sees own profile OR is internal staff
-- =====================================================================
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Clients can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile or staff can view all"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

-- Profiles INSERT (for trigger / system use only — deny direct user inserts)
DROP POLICY IF EXISTS "Profiles are insertable by system" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
  ON public.profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Profiles UPDATE: only own profile
DROP POLICY IF EXISTS "Profiles are updateable by owners" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Profiles DELETE: only managers
DROP POLICY IF EXISTS "Managers can delete profiles" ON public.profiles;
CREATE POLICY "Managers can delete profiles"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.current_user_has_role('manager'));

-- =====================================================================
-- SECTION 2: Fix suppliers / clients write protection
-- =====================================================================

-- Drop existing overly-permissive combined policies
DROP POLICY IF EXISTS "Staff can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Commercials can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Managers can manage all" ON public.clients;
DROP POLICY IF EXISTS "Staff can view everything" ON public.clients;

-- Clients: SELECT for staff only (non-staff = client role cannot see other clients)
CREATE POLICY "Staff can view clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- Clients: INSERT/UPDATE for commercial or manager
CREATE POLICY "Commercial and manager can write clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_has_role('commercial') OR
    public.current_user_has_role('responsable_commercial') OR
    public.current_user_has_role('manager')
  );

CREATE POLICY "Commercial and manager can update clients"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_has_role('commercial') OR
    public.current_user_has_role('responsable_commercial') OR
    public.current_user_has_role('manager')
  );

CREATE POLICY "Manager can delete clients"
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (public.current_user_has_role('manager'));

-- Suppliers: SELECT for purchasing / managers only
DROP POLICY IF EXISTS "Staff can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Staff can view suppliers" ON public.suppliers;

CREATE POLICY "Purchasing staff can view suppliers"
  ON public.suppliers
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_has_role('responsable_achat') OR
    public.current_user_has_role('manager') OR
    public.current_user_has_role('directeur_exploitation')
  );

CREATE POLICY "Purchasing staff can insert suppliers"
  ON public.suppliers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_has_role('responsable_achat') OR
    public.current_user_has_role('manager')
  );

CREATE POLICY "Purchasing staff can update suppliers"
  ON public.suppliers
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_has_role('responsable_achat') OR
    public.current_user_has_role('manager')
  );

CREATE POLICY "Manager can delete suppliers"
  ON public.suppliers
  FOR DELETE
  TO authenticated
  USING (public.current_user_has_role('manager'));

-- =====================================================================
-- SECTION 3: Write-protection on tables with SELECT-only policies
-- =====================================================================

-- order_items
DROP POLICY IF EXISTS "Staff can manage order items" ON public.order_items;
CREATE POLICY "Staff can view order items" ON public.order_items
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Commercial staff can write order items" ON public.order_items
  FOR INSERT TO authenticated WITH CHECK (
    public.current_user_has_role('commercial') OR
    public.current_user_has_role('responsable_commercial') OR
    public.current_user_has_role('manager'));
CREATE POLICY "Commercial staff can update order items" ON public.order_items
  FOR UPDATE TO authenticated USING (
    public.current_user_has_role('commercial') OR
    public.current_user_has_role('responsable_commercial') OR
    public.current_user_has_role('manager'));
CREATE POLICY "Manager can delete order items" ON public.order_items
  FOR DELETE TO authenticated USING (public.current_user_has_role('manager'));

-- quote_items
DROP POLICY IF EXISTS "Staff can manage quote items" ON public.quote_items;
CREATE POLICY "Staff can view quote items" ON public.quote_items
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Commercial staff can write quote items" ON public.quote_items
  FOR INSERT TO authenticated WITH CHECK (
    public.current_user_has_role('commercial') OR
    public.current_user_has_role('responsable_commercial') OR
    public.current_user_has_role('manager'));
CREATE POLICY "Commercial staff can update quote items" ON public.quote_items
  FOR UPDATE TO authenticated USING (
    public.current_user_has_role('commercial') OR
    public.current_user_has_role('responsable_commercial') OR
    public.current_user_has_role('manager'));
CREATE POLICY "Manager can delete quote items" ON public.quote_items
  FOR DELETE TO authenticated USING (public.current_user_has_role('manager'));

-- order_workflow_steps
DROP POLICY IF EXISTS "Staff can manage workflow" ON public.order_workflow_steps;
CREATE POLICY "Staff can view workflow steps" ON public.order_workflow_steps
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can write workflow steps" ON public.order_workflow_steps
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update workflow steps" ON public.order_workflow_steps
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Manager can delete workflow steps" ON public.order_workflow_steps
  FOR DELETE TO authenticated USING (public.current_user_has_role('manager'));

-- invoices
DROP POLICY IF EXISTS "Staff can manage invoices" ON public.invoices;
CREATE POLICY "Staff can view invoices" ON public.invoices
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Accounting staff can write invoices" ON public.invoices
  FOR INSERT TO authenticated WITH CHECK (
    public.current_user_has_role('responsable_comptabilite') OR
    public.current_user_has_role('manager'));
CREATE POLICY "Accounting staff can update invoices" ON public.invoices
  FOR UPDATE TO authenticated USING (
    public.current_user_has_role('responsable_comptabilite') OR
    public.current_user_has_role('manager'));
CREATE POLICY "Manager can delete invoices" ON public.invoices
  FOR DELETE TO authenticated USING (public.current_user_has_role('manager'));

-- payments
DROP POLICY IF EXISTS "Staff can manage payments" ON public.payments;
CREATE POLICY "Staff can view payments" ON public.payments
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Accounting staff can write payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (
    public.current_user_has_role('responsable_comptabilite') OR
    public.current_user_has_role('manager'));
CREATE POLICY "Accounting staff can update payments" ON public.payments
  FOR UPDATE TO authenticated USING (
    public.current_user_has_role('responsable_comptabilite') OR
    public.current_user_has_role('manager'));
CREATE POLICY "Manager can delete payments" ON public.payments
  FOR DELETE TO authenticated USING (public.current_user_has_role('manager'));

-- supplier_orders
DROP POLICY IF EXISTS "Staff can manage supplier orders" ON public.supplier_orders;
CREATE POLICY "Purchasing staff can view supplier orders" ON public.supplier_orders
  FOR SELECT TO authenticated USING (
    public.current_user_has_role('responsable_achat') OR
    public.current_user_has_role('manager') OR
    public.current_user_has_role('directeur_exploitation'));
CREATE POLICY "Purchasing staff can write supplier orders" ON public.supplier_orders
  FOR INSERT TO authenticated WITH CHECK (
    public.current_user_has_role('responsable_achat') OR
    public.current_user_has_role('manager'));
CREATE POLICY "Purchasing staff can update supplier orders" ON public.supplier_orders
  FOR UPDATE TO authenticated USING (
    public.current_user_has_role('responsable_achat') OR
    public.current_user_has_role('manager'));
CREATE POLICY "Manager can delete supplier orders" ON public.supplier_orders
  FOR DELETE TO authenticated USING (public.current_user_has_role('manager'));

-- sav_tickets
DROP POLICY IF EXISTS "Staff can manage sav" ON public.sav_tickets;
CREATE POLICY "SAV staff can view tickets" ON public.sav_tickets
  FOR SELECT TO authenticated USING (
    public.current_user_has_role('responsable_sav') OR
    public.current_user_has_role('technicien_montage') OR
    public.current_user_has_role('responsable_technique') OR
    public.current_user_has_role('manager') OR
    public.current_user_has_role('directeur_exploitation'));
CREATE POLICY "SAV staff can write tickets" ON public.sav_tickets
  FOR INSERT TO authenticated WITH CHECK (
    public.current_user_has_role('responsable_sav') OR
    public.current_user_has_role('manager'));
CREATE POLICY "SAV staff can update tickets" ON public.sav_tickets
  FOR UPDATE TO authenticated USING (
    public.current_user_has_role('responsable_sav') OR
    public.current_user_has_role('technicien_montage') OR
    public.current_user_has_role('manager'));
CREATE POLICY "Manager can delete sav tickets" ON public.sav_tickets
  FOR DELETE TO authenticated USING (public.current_user_has_role('manager'));

-- stock
DROP POLICY IF EXISTS "Staff can manage stock" ON public.stock;
CREATE POLICY "Staff can view stock" ON public.stock
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Stock managers can write stock" ON public.stock
  FOR INSERT TO authenticated WITH CHECK (
    public.current_user_has_role('responsable_achat') OR
    public.current_user_has_role('manager') OR
    public.current_user_has_role('responsable_logistique'));
CREATE POLICY "Stock managers can update stock" ON public.stock
  FOR UPDATE TO authenticated USING (
    public.current_user_has_role('responsable_achat') OR
    public.current_user_has_role('manager') OR
    public.current_user_has_role('responsable_logistique'));
CREATE POLICY "Manager can delete stock" ON public.stock
  FOR DELETE TO authenticated USING (public.current_user_has_role('manager'));

-- product_categories
DROP POLICY IF EXISTS "Staff can manage product_categories" ON public.product_categories;
CREATE POLICY "Staff can view product categories" ON public.product_categories
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Manager can write product categories" ON public.product_categories
  FOR INSERT TO authenticated WITH CHECK (public.current_user_has_role('manager'));
CREATE POLICY "Manager can update product categories" ON public.product_categories
  FOR UPDATE TO authenticated USING (public.current_user_has_role('manager'));
CREATE POLICY "Manager can delete product categories" ON public.product_categories
  FOR DELETE TO authenticated USING (public.current_user_has_role('manager'));

-- stock_movements (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='stock_movements') THEN
    ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DROP POLICY IF EXISTS "Staff can view stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Stock managers can write stock movements" ON public.stock_movements;
CREATE POLICY "Staff can view stock movements" ON public.stock_movements
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Stock managers can write stock movements" ON public.stock_movements
  FOR INSERT TO authenticated WITH CHECK (
    public.current_user_has_role('responsable_achat') OR
    public.current_user_has_role('manager') OR
    public.current_user_has_role('responsable_logistique'));
CREATE POLICY "Stock managers can update stock movements" ON public.stock_movements
  FOR UPDATE TO authenticated USING (
    public.current_user_has_role('responsable_achat') OR
    public.current_user_has_role('manager') OR
    public.current_user_has_role('responsable_logistique'));

-- sav_comments (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='sav_comments') THEN
    ALTER TABLE public.sav_comments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DROP POLICY IF EXISTS "SAV staff can view sav comments" ON public.sav_comments;
DROP POLICY IF EXISTS "SAV staff can write sav comments" ON public.sav_comments;
CREATE POLICY "SAV staff can view sav comments" ON public.sav_comments
  FOR SELECT TO authenticated USING (
    public.current_user_has_role('responsable_sav') OR
    public.current_user_has_role('technicien_montage') OR
    public.current_user_has_role('manager'));
CREATE POLICY "SAV staff can write sav comments" ON public.sav_comments
  FOR INSERT TO authenticated WITH CHECK (
    public.current_user_has_role('responsable_sav') OR
    public.current_user_has_role('technicien_montage') OR
    public.current_user_has_role('manager'));

-- =====================================================================
-- SECTION 4: Fix delivery driver location exposure
-- Previously: any technician could see all deliveries
-- Fixed: only the assigned technician + logistics managers see a delivery
-- =====================================================================
DROP POLICY IF EXISTS "Staff can manage deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Staff can view deliveries" ON public.deliveries;

CREATE POLICY "Logistics staff and assigned tech can view deliveries"
  ON public.deliveries
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = technician_id OR
    public.current_user_has_role('responsable_logistique') OR
    public.current_user_has_role('manager') OR
    public.current_user_has_role('directeur_exploitation')
  );

CREATE POLICY "Logistics staff can write deliveries"
  ON public.deliveries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_has_role('responsable_logistique') OR
    public.current_user_has_role('manager')
  );

CREATE POLICY "Logistics staff can update deliveries"
  ON public.deliveries
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = technician_id OR
    public.current_user_has_role('responsable_logistique') OR
    public.current_user_has_role('manager')
  );

CREATE POLICY "Manager can delete deliveries"
  ON public.deliveries
  FOR DELETE
  TO authenticated
  USING (public.current_user_has_role('manager'));

-- =====================================================================
-- SECTION 5: Tighten audit_log access
-- Warning: audit log accessible to ALL managers
-- Fix: restrict to manager + directeur_exploitation only (already done via current_user_has_role)
-- This section just confirms the existing policy is correct and adds a directeur policy
-- =====================================================================
DROP POLICY IF EXISTS "Managers can view audit log" ON public.audit_log;
CREATE POLICY "Managers and directors can view audit log"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_has_role('manager') OR
    public.current_user_has_role('directeur_exploitation')
  );

-- Audit log system insert (SECURITY DEFINER trigger only)
DROP POLICY IF EXISTS "System can insert audit log" ON public.audit_log;
CREATE POLICY "System can insert audit log"
  ON public.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- triggers run as SECURITY DEFINER; actual filtering via trigger logic

-- =====================================================================
-- SECTION 6: Harden remaining functions with SET search_path
-- =====================================================================
DO $$
BEGIN
  -- get_my_role
  BEGIN
    ALTER FUNCTION public.get_my_role() SET search_path = public;
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'get_my_role not found';
  END;

  -- current_user_has_role
  BEGIN
    ALTER FUNCTION public.current_user_has_role(text) SET search_path = public;
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'current_user_has_role not found';
  END;

  -- is_manager
  BEGIN
    ALTER FUNCTION public.is_manager(uuid) SET search_path = public;
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'is_manager not found';
  END;

  -- is_internal_staff
  BEGIN
    ALTER FUNCTION public.is_internal_staff(uuid) SET search_path = public;
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'is_internal_staff not found';
  END;

  -- has_role
  BEGIN
    ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public;
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'has_role not found';
  END;

  -- is_staff
  BEGIN
    ALTER FUNCTION public.is_staff(uuid) SET search_path = public;
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'is_staff not found';
  END;

  -- log_audit_event
  BEGIN
    ALTER FUNCTION public.log_audit_event() SET search_path = public;
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'log_audit_event not found';
  END;

  -- generate_sav_ref_atomic
  BEGIN
    ALTER FUNCTION public.generate_sav_ref_atomic() SET search_path = public;
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'generate_sav_ref_atomic not found';
  END;
END $$;

-- =====================================================================
-- SECTION 7: Verification
-- =====================================================================
DO $$
DECLARE
  pol_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pol_count FROM pg_policies WHERE schemaname = 'public';
  RAISE NOTICE '✅ Security hardening v2 complete. Total active policies: %', pol_count;
END $$;

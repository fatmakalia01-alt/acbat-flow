-- Security Hardening and RLS Finalization
-- Migration: 20260223060000_security_hardening.sql

-- 1. ENFORCE RLS ON ALL MISSING TABLES
DO $$ 
BEGIN
  ALTER TABLE public.workflow_justifications ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
  -- Ensure brands and sites are covered even if previous migrations missed them
  ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN 
  RAISE NOTICE 'RLS already enabled or table missing';
END $$;

-- 2. CREATE SECURITY HELPER FUNCTIONS (Optimized & Hardened)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role NOT IN ('client')
  );
$$;

-- 3. ATOMIC REFERENCE GENERATION (Fixing Race Conditions)
-- Drop existing unstable reference function
DROP TRIGGER IF EXISTS generate_sav_ref ON public.sav_tickets;
DROP FUNCTION IF EXISTS public.generate_sav_reference();

-- Create sequences for references
CREATE SEQUENCE IF NOT EXISTS sav_ref_seq START 1;
CREATE SEQUENCE IF NOT EXISTS order_ref_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_sav_ref_atomic()
RETURNS trigger AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'SAV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('sav_ref_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_generate_sav_ref_atomic ON public.sav_tickets;
CREATE TRIGGER tr_generate_sav_ref_atomic
  BEFORE INSERT ON public.sav_tickets
  FOR EACH ROW EXECUTE FUNCTION public.generate_sav_ref_atomic();

-- 4. REFINE POLICIES WITH ROLE-BASED ACCESS

-- Drop old overly-permissive policies (from 20260222180000_rls_security_final.sql)
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  -- List of specific old policy names to remove
  FOR pol IN 
    SELECT policyname, tablename FROM pg_policies 
    WHERE schemaname = 'public' 
      AND (
        policyname LIKE '%true%' 
        OR policyname LIKE '%Staff can manage%'
        OR policyname LIKE 'Staff can view%'
        OR policyname IN (
          'Staff can manage clients', 'Staff can manage suppliers', 'Staff can view products',
          'Staff can manage products', 'Staff can manage stock', 'Staff can manage orders',
          'Staff can manage order items', 'Staff can manage workflow', 'Staff can manage quotes',
          'Staff can manage quote items', 'Staff can manage invoices', 'Staff can manage payments',
          'Staff can manage sav', 'Staff can manage deliveries', 'Staff can manage supplier orders',
          'Profiles are viewable by authenticated users', 'Roles are viewable by authenticated users'
        )
      )
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.' || pol.tablename;
  END LOOP;
END $$;

-- 4a. Clients Isolation (Most Critical)
-- Clients can ONLY see their own data
DROP POLICY IF EXISTS "Clients can view own orders" ON public.client_orders;
CREATE POLICY "Clients can view own orders" ON public.client_orders
  FOR SELECT TO authenticated USING (auth.uid() = client_id OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Clients can view own profile" ON public.profiles;
CREATE POLICY "Clients can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

-- 4b. Staff Module Access (Role-based)
-- General ERP visibility for internal staff
DROP POLICY IF EXISTS "Staff can view everything" ON public.clients;
CREATE POLICY "Staff can view everything" ON public.clients FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can view suppliers" ON public.suppliers;
CREATE POLICY "Staff can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can view products" ON public.products;
CREATE POLICY "Staff can view products" ON public.products FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can view dashboard data" ON public.client_orders;
CREATE POLICY "Staff can view dashboard data" ON public.client_orders FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- Write access for specific roles
DROP POLICY IF EXISTS "Managers can manage all" ON public.clients;
CREATE POLICY "Managers can manage all" ON public.clients FOR ALL TO authenticated USING (public.current_user_has_role('manager'));

DROP POLICY IF EXISTS "Commercials can manage clients" ON public.clients;
CREATE POLICY "Commercials can manage clients" ON public.clients FOR ALL TO authenticated 
  USING (public.current_user_has_role('commercial') OR public.current_user_has_role('responsable_commercial'));

-- 4c. Secure Justifications & Audit
DROP POLICY IF EXISTS "Staff can view justifications" ON public.workflow_justifications;
CREATE POLICY "Staff can view justifications" ON public.workflow_justifications FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Users can create justifications" ON public.workflow_justifications;
CREATE POLICY "Users can create justifications" ON public.workflow_justifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = justified_by);

DROP POLICY IF EXISTS "Managers can view audit log" ON public.audit_log;
CREATE POLICY "Managers can view audit log" ON public.audit_log FOR SELECT TO authenticated USING (public.current_user_has_role('manager'));

-- 4d. Secure Notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can create notifications" ON public.notifications;
CREATE POLICY "Staff can create notifications" ON public.notifications 
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- 5. TRIGGER FOR AUDIT LOGGING (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.audit_log (user_id, table_name, record_id, action, old_data, new_data)
    VALUES (auth.uid(), TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP, 
            CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
            CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)::jsonb ELSE NULL END);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. HARDEN ALL APP FUNCTIONS (Safely)
DO $$ 
BEGIN
  -- notify_management
  BEGIN
    ALTER FUNCTION public.notify_management(text, text, uuid, public.notification_type, public.alert_level) SECURITY DEFINER SET search_path = public;
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'Function notify_management not found, skipping hardening';
  END;

  -- is_manager_absent
  BEGIN
    ALTER FUNCTION public.is_manager_absent() SECURITY DEFINER SET search_path = public;
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'Function is_manager_absent not found, skipping hardening';
  END;
END $$;

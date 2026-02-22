-- Migration: Sécurité RLS complète pour tous les modules ERP

-- Tables à sécuriser
DO $$ 
BEGIN
  ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.client_orders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.order_workflow_steps ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.sav_tickets ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN 
  RAISE NOTICE 'RLS already enabled or table missing';
END $$;

-- Drop existing policies to avoid conflicts
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename;
  END LOOP;
END $$;

-- 1. Politiques de base pour le personnel interne (Manager, Directeur, Commercial, etc.)
-- Pour la simplicité de cette phase, tout utilisateur authentifié a un accès de base.
-- Dans une phase ultérieure, nous pourrons filtrer par rôle via la table user_roles.

-- Clients & Suppliers
CREATE POLICY "Staff can manage clients" ON public.clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff can manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (true);

-- Products & Stock
CREATE POLICY "Staff can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage products" ON public.products FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff can manage stock" ON public.stock FOR ALL TO authenticated USING (true);

-- Orders, Items & Workflow
CREATE POLICY "Staff can manage orders" ON public.client_orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff can manage order items" ON public.order_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff can manage workflow" ON public.order_workflow_steps FOR ALL TO authenticated USING (true);

-- Quotes, Invoices & Payments
CREATE POLICY "Staff can manage quotes" ON public.quotes FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff can manage quote items" ON public.quote_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff can manage invoices" ON public.invoices FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff can manage payments" ON public.payments FOR ALL TO authenticated USING (true);

-- SAV, Logistics & Deliveries
CREATE POLICY "Staff can manage sav" ON public.sav_tickets FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff can manage deliveries" ON public.deliveries FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff can manage supplier orders" ON public.supplier_orders FOR ALL TO authenticated USING (true);

-- Notifications (Chacun voit les siennes)
CREATE POLICY "Users can view their own notifications" ON public.notifications 
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications 
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Profiles & Roles
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles are updateable by owners" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Roles are viewable by authenticated users" ON public.user_roles FOR SELECT TO authenticated USING (true);

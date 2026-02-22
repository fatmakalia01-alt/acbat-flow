
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sav_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delegations ENABLE ROW LEVEL SECURITY;

-- Security definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT public.has_role(_user_id, 'manager');
$$;

CREATE OR REPLACE FUNCTION public.is_internal_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role != 'client');
$$;

-- Utility functions
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_order_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
DECLARE seq_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num FROM public.client_orders WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());
  NEW.reference := 'CMD-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_quote_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
DECLARE seq_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num FROM public.quotes WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());
  NEW.reference := 'DEV-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_sav_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
DECLARE seq_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num FROM public.sav_tickets WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());
  NEW.reference := 'SAV-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.create_workflow_steps()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
DECLARE
  steps workflow_step_name[] := ARRAY['creation_commande','validation_commerciale','commande_fournisseur','reception_marchandises','preparation_technique','livraison_installation','validation_client','facturation_paiement','cloture_archivage']::workflow_step_name[];
  delays INTEGER[] := ARRAY[2,1,30,2,3,1,0,7,0];
  i INTEGER;
BEGIN
  FOR i IN 1..9 LOOP
    INSERT INTO public.order_workflow_steps (order_id, step_name, step_order, status, due_date)
    VALUES (NEW.id, steps[i], i,
      CASE WHEN i = 1 THEN 'in_progress'::workflow_step_status ELSE 'pending'::workflow_step_status END,
      CASE WHEN delays[i] > 0 THEN now() + (delays[i] || ' days')::INTERVAL ELSE NULL END);
  END LOOP;
  RETURN NEW;
END; $$;

-- Triggers
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER generate_order_ref BEFORE INSERT ON public.client_orders FOR EACH ROW EXECUTE FUNCTION public.generate_order_reference();
CREATE TRIGGER generate_quote_ref BEFORE INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.generate_quote_reference();
CREATE TRIGGER generate_sav_ref BEFORE INSERT ON public.sav_tickets FOR EACH ROW EXECUTE FUNCTION public.generate_sav_reference();
CREATE TRIGGER create_workflow AFTER INSERT ON public.client_orders FOR EACH ROW EXECUTE FUNCTION public.create_workflow_steps();

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_client_orders_updated_at BEFORE UPDATE ON public.client_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_sav_tickets_updated_at BEFORE UPDATE ON public.sav_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_supplier_orders_updated_at BEFORE UPDATE ON public.supplier_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_workflow_steps_updated_at BEFORE UPDATE ON public.order_workflow_steps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies

-- Profiles: users see own, managers see all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Managers can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "Internal staff can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Managers can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role insert profiles" ON public.profiles FOR INSERT TO service_role WITH CHECK (true);

-- User roles: managers can manage, users can see own
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Managers can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "Managers can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_manager(auth.uid()));
CREATE POLICY "Managers can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "Managers can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_manager(auth.uid()));

-- Clients: internal staff can see all, clients see own
CREATE POLICY "Internal staff can view clients" ON public.clients FOR SELECT TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Clients can view own record" ON public.clients FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Internal staff can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.is_internal_staff(auth.uid()));
CREATE POLICY "Internal staff can update clients" ON public.clients FOR UPDATE TO authenticated USING (public.is_internal_staff(auth.uid()));

-- Products & categories: all authenticated can read
CREATE POLICY "Authenticated can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can manage products" ON public.products FOR ALL TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "Authenticated can view categories" ON public.product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can manage categories" ON public.product_categories FOR ALL TO authenticated USING (public.is_manager(auth.uid()));

-- Stock: internal staff
CREATE POLICY "Internal staff can view stock" ON public.stock FOR SELECT TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Internal staff can manage stock" ON public.stock FOR ALL TO authenticated USING (public.is_internal_staff(auth.uid()));

-- Orders: internal staff see all, clients see own
CREATE POLICY "Internal staff can view orders" ON public.client_orders FOR SELECT TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Clients can view own orders" ON public.client_orders FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid())
);
CREATE POLICY "Internal staff can insert orders" ON public.client_orders FOR INSERT TO authenticated WITH CHECK (public.is_internal_staff(auth.uid()));
CREATE POLICY "Internal staff can update orders" ON public.client_orders FOR UPDATE TO authenticated USING (public.is_internal_staff(auth.uid()));

-- Order items
CREATE POLICY "Internal staff can view order items" ON public.order_items FOR SELECT TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Clients can view own order items" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.client_orders co JOIN public.clients c ON c.id = co.client_id WHERE co.id = order_id AND c.user_id = auth.uid())
);
CREATE POLICY "Internal staff can manage order items" ON public.order_items FOR ALL TO authenticated USING (public.is_internal_staff(auth.uid()));

-- Workflow steps
CREATE POLICY "Internal staff can view workflow" ON public.order_workflow_steps FOR SELECT TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Clients can view own workflow" ON public.order_workflow_steps FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.client_orders co JOIN public.clients c ON c.id = co.client_id WHERE co.id = order_id AND c.user_id = auth.uid())
);
CREATE POLICY "Internal staff can manage workflow" ON public.order_workflow_steps FOR ALL TO authenticated USING (public.is_internal_staff(auth.uid()));

-- Quotes
CREATE POLICY "Internal staff can view quotes" ON public.quotes FOR SELECT TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Internal staff can manage quotes" ON public.quotes FOR ALL TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Quote items viewable by staff" ON public.quote_items FOR SELECT TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Quote items manageable by staff" ON public.quote_items FOR ALL TO authenticated USING (public.is_internal_staff(auth.uid()));

-- Suppliers
CREATE POLICY "Internal staff can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Internal staff can manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Internal staff can view supplier orders" ON public.supplier_orders FOR SELECT TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Internal staff can manage supplier orders" ON public.supplier_orders FOR ALL TO authenticated USING (public.is_internal_staff(auth.uid()));

-- Invoices & Payments
CREATE POLICY "Internal staff can view invoices" ON public.invoices FOR SELECT TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Internal staff can manage invoices" ON public.invoices FOR ALL TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Internal staff can view payments" ON public.payments FOR SELECT TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Internal staff can manage payments" ON public.payments FOR ALL TO authenticated USING (public.is_internal_staff(auth.uid()));

-- Deliveries
CREATE POLICY "Internal staff can view deliveries" ON public.deliveries FOR SELECT TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Internal staff can manage deliveries" ON public.deliveries FOR ALL TO authenticated USING (public.is_internal_staff(auth.uid()));

-- SAV
CREATE POLICY "Internal staff can view sav" ON public.sav_tickets FOR SELECT TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Clients can view own sav" ON public.sav_tickets FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid())
);
CREATE POLICY "Internal staff can manage sav" ON public.sav_tickets FOR ALL TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Clients can insert sav" ON public.sav_tickets FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid())
);

-- Notifications: users see own
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Audit log: managers only
CREATE POLICY "Managers can view audit log" ON public.audit_log FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "System can insert audit log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Delegations
CREATE POLICY "Internal staff can view delegations" ON public.delegations FOR SELECT TO authenticated USING (public.is_internal_staff(auth.uid()));
CREATE POLICY "Managers can manage delegations" ON public.delegations FOR ALL TO authenticated USING (public.is_manager(auth.uid()));

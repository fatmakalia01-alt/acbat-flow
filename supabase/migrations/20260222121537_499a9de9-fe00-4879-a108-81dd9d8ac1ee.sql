
-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM (
  'manager', 'directeur_exploitation', 'responsable_achat', 'responsable_logistique',
  'responsable_commercial', 'commercial', 'responsable_technique', 'technicien_montage',
  'responsable_sav', 'responsable_comptabilite', 'client'
);

CREATE TYPE public.order_status AS ENUM (
  'brouillon', 'en_validation', 'validee', 'en_commande_fournisseur', 'en_reception',
  'en_preparation', 'en_livraison', 'livree', 'en_facturation', 'payee', 'cloturee', 'annulee'
);

CREATE TYPE public.workflow_step_name AS ENUM (
  'creation_commande', 'validation_commerciale', 'commande_fournisseur', 'reception_marchandises',
  'preparation_technique', 'livraison_installation', 'validation_client', 'facturation_paiement', 'cloture_archivage'
);

CREATE TYPE public.workflow_step_status AS ENUM ('pending', 'in_progress', 'completed', 'delayed', 'blocked');
CREATE TYPE public.invoice_status AS ENUM ('brouillon', 'emise', 'payee_partiel', 'payee', 'impayee', 'annulee');
CREATE TYPE public.payment_method AS ENUM ('especes', 'cheque', 'virement', 'carte_bancaire', 'traite_bancaire');
CREATE TYPE public.payment_status AS ENUM ('en_attente', 'confirme', 'rejete');
CREATE TYPE public.quote_status AS ENUM ('brouillon', 'en_validation', 'accepte', 'refuse', 'expire');
CREATE TYPE public.sav_status AS ENUM ('ouvert', 'en_cours', 'resolu', 'ferme');
CREATE TYPE public.notification_type AS ENUM ('info', 'alerte_delai', 'depassement', 'transition', 'urgente');
CREATE TYPE public.alert_level AS ENUM ('jaune', 'rouge', 'bleue', 'rouge_clignotant');

-- 2. TABLES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  company_name text,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  access_instructions text,
  notes text,
  commercial_id uuid,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  country text DEFAULT 'Italie',
  notes text,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sku text,
  image_url text,
  price_ht numeric NOT NULL DEFAULT 0,
  tva_rate numeric DEFAULT 19.00,
  category_id uuid REFERENCES public.product_categories(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 0,
  min_quantity integer DEFAULT 5,
  location text DEFAULT 'Entrepôt principal',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.client_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL DEFAULT '',
  client_id uuid NOT NULL REFERENCES public.clients(id),
  status order_status NOT NULL DEFAULT 'brouillon',
  total_ht numeric DEFAULT 0,
  tva_amount numeric DEFAULT 0,
  total_ttc numeric DEFAULT 0,
  advance_amount numeric DEFAULT 0,
  notes text,
  created_by uuid,
  validated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.client_orders(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price_ht numeric NOT NULL DEFAULT 0,
  tva_rate numeric DEFAULT 19.00,
  total_ht numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.client_orders(id),
  step_name workflow_step_name NOT NULL,
  step_order integer NOT NULL,
  status workflow_step_status NOT NULL DEFAULT 'pending',
  assigned_to uuid,
  started_at timestamptz,
  completed_at timestamptz,
  due_date timestamptz,
  delay_days integer DEFAULT 0,
  delay_reason text,
  delay_justified_by uuid,
  delay_justified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL DEFAULT '',
  client_id uuid NOT NULL REFERENCES public.clients(id),
  order_id uuid REFERENCES public.client_orders(id),
  status quote_status NOT NULL DEFAULT 'brouillon',
  total_ht numeric DEFAULT 0,
  tva_amount numeric DEFAULT 0,
  total_ttc numeric DEFAULT 0,
  valid_until date,
  pdf_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id),
  product_id uuid REFERENCES public.products(id),
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_ht numeric NOT NULL DEFAULT 0,
  tva_rate numeric DEFAULT 19.00,
  total_ht numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL,
  order_id uuid NOT NULL REFERENCES public.client_orders(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  status invoice_status NOT NULL DEFAULT 'brouillon',
  total_ht numeric DEFAULT 0,
  tva_amount numeric DEFAULT 0,
  total_ttc numeric DEFAULT 0,
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  pdf_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  amount numeric NOT NULL,
  method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'en_attente',
  payment_date date DEFAULT CURRENT_DATE,
  reference_number text,
  notes text,
  unpaid_reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.client_orders(id),
  technician_id uuid,
  scheduled_date date,
  actual_date date,
  status text NOT NULL DEFAULT 'planifiee',
  latitude double precision,
  longitude double precision,
  photo_before_url text,
  photo_after_url text,
  pv_url text,
  pv_signed boolean DEFAULT false,
  tech_notes text,
  client_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.supplier_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  client_order_id uuid REFERENCES public.client_orders(id),
  status text NOT NULL DEFAULT 'en_attente',
  total_amount numeric DEFAULT 0,
  order_date date DEFAULT CURRENT_DATE,
  expected_delivery date,
  actual_delivery date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sav_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL DEFAULT '',
  client_id uuid NOT NULL REFERENCES public.clients(id),
  order_id uuid REFERENCES public.client_orders(id),
  subject text NOT NULL,
  description text,
  status sav_status NOT NULL DEFAULT 'ouvert',
  priority text DEFAULT 'normal',
  assigned_to uuid,
  created_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type notification_type NOT NULL DEFAULT 'info',
  alert_level alert_level,
  related_order_id uuid REFERENCES public.client_orders(id),
  read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  table_name text,
  record_id uuid,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id uuid NOT NULL,
  delegatee_id uuid NOT NULL,
  reason text,
  active boolean DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Migration: 20260222221500_brands_and_sites.sql
-- Description: Adds brands and sites tables, links them to existing entities, and adds necessary roles.

-- 1. Update app_role enum (Note: ALTER TYPE ... ADD VALUE cannot be run inside a transaction block in some Postgres versions, but Supabase migrations usually handle this)
-- We'll use a DO block to make it safer if needed, but ALTER TYPE is standard.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'responsable_showroom';

-- 2. Create brands table
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  description text,
  official_website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create sites table
CREATE TABLE IF NOT EXISTS public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Update products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id);

-- 5. Update client_orders
ALTER TABLE public.client_orders ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id);

-- 6. Update deliveries
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id);

-- 7. Insert initial data (from real ACBAT info)
INSERT INTO public.sites (name, address, city, phone) VALUES
('Siège Social', '0. Rue des usines Zone Industrielle, Le Kram 2015 Tunis', 'Tunis', '+216 71 180 219'),
('Showroom Tunis', '05 Rue Omar Khayem lac 3 (Z.I La Goulette) Tunis 2060', 'Tunis', '+216 23 636 323'),
('Bureau Sfax', 'Route Ain km 1,5 ceinture N°5 vers Menzel Chaker, Sfax', 'Sfax', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO public.brands (name, description) VALUES
('ICA Porte Blindate', 'Marque italienne spécialisée dans les portes blindées (gamme Defender)'),
('Ermetika', 'Fabricant italien de systèmes à galandage et châssis pour portes coulissantes')
ON CONFLICT DO NOTHING;

-- 8. Enable RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- 9. Policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read for brands') THEN
    CREATE POLICY "Public read for brands" ON public.brands FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read for sites') THEN
    CREATE POLICY "Public read for sites" ON public.sites FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage brands') THEN
    CREATE POLICY "Staff manage brands" ON public.brands FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage sites') THEN
    CREATE POLICY "Staff manage sites" ON public.sites FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- =====================================================================
-- STEP -1: THE NUCLEAR CLEANUP (Clean the Slate)
-- =====================================================================
-- This will delete EVERYTHING in all tables to prevent FK errors.
-- WARNING: This wipes all orders, products, etc.
DO $$ 
BEGIN
    -- 1. Clean public schema tables (order matters for FKs)
    TRUNCATE 
        public.audit_log,
        public.notifications,
        public.delegations,
        public.sav_tickets,
        public.payments,
        public.invoices,
        public.quote_items,
        public.quotes,
        public.order_workflow_steps,
        public.order_items,
        public.client_orders,
        public.chantiers,
        public.purchase_order_items,
        public.purchase_orders,
        public.stock,
        public.products,
        public.product_categories,
        public.suppliers,
        public.clients,
        public.brands,
        public.sites,
        public.user_roles,
        public.profiles
        RESTART IDENTITY CASCADE;

    -- 2. Wipe Auth Schema
    DELETE FROM auth.users;
    DELETE FROM auth.identities;
END $$;

-- =====================================================================
-- STEP 0: Trigger and Function Cleanup
-- =====================================================================
-- Ensure the trigger function is perfect
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

-- Drop and recreate trigger to ensure it's clean
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- STEP 1: Fresh Seeding (v15)
-- Password for all accounts: 54372272Hk
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  pwd_hash text := crypt('54372272Hk', gen_salt('bf'));
  v_instance_id uuid := '00000000-0000-0000-0000-000000000000';
  has_is_anon boolean;
  has_is_sso boolean;
  u_id uuid;
  u_email text;
  u_name text;
  u_role public.app_role;
BEGIN
  -- 1. Detect columns
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'is_anonymous') INTO has_is_anon;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'is_sso_user') INTO has_is_sso;

  -- 2. Define Seed Data
  CREATE TEMP TABLE user_seed_data (id uuid, email text, full_name text, role public.app_role) ON COMMIT DROP;
  INSERT INTO user_seed_data (id, email, full_name, role) VALUES
    ('a8d71ae3-7fc2-4983-9d9b-134791daa304', 'haithem.kalia@gmail.com',  'Haithem Kalia',           'manager'),
    ('30f36fca-8193-4a7b-99f0-651acf5b8651', 'haithem.kalia1@gmail.com', 'Responsable Commercial',  'responsable_commercial'),
    ('de41f058-8752-4f8c-a50d-359783189cb9', 'haithem.kalia2@gmail.com', 'Responsable Achat',       'responsable_achat'),
    ('cbdd0a5a-f7ee-47dd-8755-2ad67a6e9d90', 'haithem.kalia3@gmail.com', 'Directeur Exploitation',  'directeur_exploitation'),
    ('bbb02b84-bd21-4f95-9ff7-46a4fc851939', 'haithem.kalia4@gmail.com', 'Responsable Logistique',  'responsable_logistique'),
    ('1ff36aa6-1aa5-4c8e-9bff-8dd9e776016f', 'haithem.kalia5@gmail.com', 'Commercial',              'commercial'),
    ('a1918b8f-14b8-4f9f-97fb-0f14159eae56', 'haithem.kalia6@gmail.com', 'Responsable Technique',   'responsable_technique'),
    ('8237473c-20d2-4af7-8b9d-d933e967a3ba', 'haithem.kalia7@gmail.com', 'Technicien Montage',      'technicien_montage'),
    ('51f3a911-748f-44f7-a50d-359783189cb9', 'haithem.kalia8@gmail.com', 'Responsable SAV',         'responsable_sav'),
    ('0e262b5c-3d78-4fb3-a29f-f950b1f93a7b', 'haithem.kalia9@gmail.com', 'Responsable Comptabilite', 'responsable_comptabilite'),
    ('1ddb2c31-a98a-4ed0-83ae-c4c8c4cced53', 'haithem.kalia10@gmail.com','Responsable Showroom',    'responsable_showroom'),
    ('d8439fd5-3394-4ae8-8444-ccb36f6c8220', 'haithem.kalia11@gmail.com','Client Test',             'client'),
    ('28526da3-a290-43c4-b7a0-07057e6f61cd', 'haithem.kalia12@gmail.com','Livreur',                 'livraison');

  -- 3. Perform Insertions
  FOR u_id, u_email, u_name, u_role IN SELECT * FROM user_seed_data LOOP
    -- Insert auth record (confirmed_at is excluded as it is generated)
    EXECUTE format('
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data,
        is_super_admin, %s %s
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, %s %s now(), now())',
      CASE WHEN has_is_anon THEN 'is_anonymous,' ELSE '' END,
      CASE WHEN has_is_sso THEN 'is_sso_user,' ELSE '' END,
      CASE WHEN has_is_anon THEN 'false,' ELSE '' END,
      CASE WHEN has_is_sso THEN 'false,' ELSE '' END
    ) USING 
      u_id, v_instance_id, 'authenticated', 'authenticated', 
      u_email, pwd_hash, 
      now(),
      jsonb_build_object('provider','email','providers',array['email']),
      jsonb_build_object('full_name', u_name),
      false;

    -- Identity
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), u_id, u_email,
      jsonb_build_object('sub', u_id::text, 'email', u_email, 'email_verified', true, 'provider', 'email'),
      'email', now(), now(), now());

    -- Role (Profile is auto-created by trigger)
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (u_id, u_role) 
    ON CONFLICT (user_id, role) DO NOTHING;

  END LOOP;
END $$;

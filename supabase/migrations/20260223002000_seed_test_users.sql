-- =====================================================================
-- STEP 2 OF 2 — Run AFTER 20260223001900_add_role_enum_values.sql
-- Seed: Test users – one per role (v7 – all required auth fields)
-- Password for all accounts: 54372272Hk
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  pwd_hash text := crypt('54372272Hk', gen_salt('bf'));
  uid      uuid;
BEGIN

  -- ── 1. responsable_commercial ────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'haithem.kalia1@gmail.com') THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmed_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      phone_change, phone_change_token,
      email_change_token_current, reauthentication_token,
      email_change_confirm_status, is_super_admin, is_sso_user,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'haithem.kalia1@gmail.com', pwd_hash, now(), now(),
      '','','','','','','','', 0, false, false,
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Responsable Commercial"}', now(), now());
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid, 'haithem.kalia1@gmail.com',
      jsonb_build_object('sub',uid::text,'email','haithem.kalia1@gmail.com','email_verified',true,'provider','email'),
      'email', now(), now(), now()) ON CONFLICT DO NOTHING;
  ELSE SELECT id INTO uid FROM auth.users WHERE email = 'haithem.kalia1@gmail.com';
  END IF;
  INSERT INTO public.profiles (id, user_id, full_name, created_at, updated_at) VALUES (gen_random_uuid(), uid, 'Responsable Commercial', now(), now()) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'responsable_commercial') ON CONFLICT DO NOTHING;

  -- ── 2. responsable_achat ─────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'haithem.kalia2@gmail.com') THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmed_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      phone_change, phone_change_token,
      email_change_token_current, reauthentication_token,
      email_change_confirm_status, is_super_admin, is_sso_user,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'haithem.kalia2@gmail.com', pwd_hash, now(), now(),
      '','','','','','','','', 0, false, false,
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Responsable Achat"}', now(), now());
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid, 'haithem.kalia2@gmail.com',
      jsonb_build_object('sub',uid::text,'email','haithem.kalia2@gmail.com','email_verified',true,'provider','email'),
      'email', now(), now(), now()) ON CONFLICT DO NOTHING;
  ELSE SELECT id INTO uid FROM auth.users WHERE email = 'haithem.kalia2@gmail.com';
  END IF;
  INSERT INTO public.profiles (id, user_id, full_name, created_at, updated_at) VALUES (gen_random_uuid(), uid, 'Responsable Achat', now(), now()) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'responsable_achat') ON CONFLICT DO NOTHING;

  -- ── 3. directeur_exploitation ────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'haithem.kalia3@gmail.com') THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmed_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      phone_change, phone_change_token,
      email_change_token_current, reauthentication_token,
      email_change_confirm_status, is_super_admin, is_sso_user,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'haithem.kalia3@gmail.com', pwd_hash, now(), now(),
      '','','','','','','','', 0, false, false,
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Directeur Exploitation"}', now(), now());
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid, 'haithem.kalia3@gmail.com',
      jsonb_build_object('sub',uid::text,'email','haithem.kalia3@gmail.com','email_verified',true,'provider','email'),
      'email', now(), now(), now()) ON CONFLICT DO NOTHING;
  ELSE SELECT id INTO uid FROM auth.users WHERE email = 'haithem.kalia3@gmail.com';
  END IF;
  INSERT INTO public.profiles (id, user_id, full_name, created_at, updated_at) VALUES (gen_random_uuid(), uid, 'Directeur Exploitation', now(), now()) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'directeur_exploitation') ON CONFLICT DO NOTHING;

  -- ── 4. responsable_logistique ────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'haithem.kalia4@gmail.com') THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmed_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      phone_change, phone_change_token,
      email_change_token_current, reauthentication_token,
      email_change_confirm_status, is_super_admin, is_sso_user,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'haithem.kalia4@gmail.com', pwd_hash, now(), now(),
      '','','','','','','','', 0, false, false,
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Responsable Logistique"}', now(), now());
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid, 'haithem.kalia4@gmail.com',
      jsonb_build_object('sub',uid::text,'email','haithem.kalia4@gmail.com','email_verified',true,'provider','email'),
      'email', now(), now(), now()) ON CONFLICT DO NOTHING;
  ELSE SELECT id INTO uid FROM auth.users WHERE email = 'haithem.kalia4@gmail.com';
  END IF;
  INSERT INTO public.profiles (id, user_id, full_name, created_at, updated_at) VALUES (gen_random_uuid(), uid, 'Responsable Logistique', now(), now()) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'responsable_logistique') ON CONFLICT DO NOTHING;

  -- ── 5. commercial ────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'haithem.kalia5@gmail.com') THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmed_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      phone_change, phone_change_token,
      email_change_token_current, reauthentication_token,
      email_change_confirm_status, is_super_admin, is_sso_user,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'haithem.kalia5@gmail.com', pwd_hash, now(), now(),
      '','','','','','','','', 0, false, false,
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Commercial"}', now(), now());
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid, 'haithem.kalia5@gmail.com',
      jsonb_build_object('sub',uid::text,'email','haithem.kalia5@gmail.com','email_verified',true,'provider','email'),
      'email', now(), now(), now()) ON CONFLICT DO NOTHING;
  ELSE SELECT id INTO uid FROM auth.users WHERE email = 'haithem.kalia5@gmail.com';
  END IF;
  INSERT INTO public.profiles (id, user_id, full_name, created_at, updated_at) VALUES (gen_random_uuid(), uid, 'Commercial', now(), now()) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'commercial') ON CONFLICT DO NOTHING;

  -- ── 6. responsable_technique ─────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'haithem.kalia6@gmail.com') THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmed_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      phone_change, phone_change_token,
      email_change_token_current, reauthentication_token,
      email_change_confirm_status, is_super_admin, is_sso_user,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'haithem.kalia6@gmail.com', pwd_hash, now(), now(),
      '','','','','','','','', 0, false, false,
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Responsable Technique"}', now(), now());
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid, 'haithem.kalia6@gmail.com',
      jsonb_build_object('sub',uid::text,'email','haithem.kalia6@gmail.com','email_verified',true,'provider','email'),
      'email', now(), now(), now()) ON CONFLICT DO NOTHING;
  ELSE SELECT id INTO uid FROM auth.users WHERE email = 'haithem.kalia6@gmail.com';
  END IF;
  INSERT INTO public.profiles (id, user_id, full_name, created_at, updated_at) VALUES (gen_random_uuid(), uid, 'Responsable Technique', now(), now()) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'responsable_technique') ON CONFLICT DO NOTHING;

  -- ── 7. technicien_montage ────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'haithem.kalia7@gmail.com') THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmed_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      phone_change, phone_change_token,
      email_change_token_current, reauthentication_token,
      email_change_confirm_status, is_super_admin, is_sso_user,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'haithem.kalia7@gmail.com', pwd_hash, now(), now(),
      '','','','','','','','', 0, false, false,
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Technicien Montage"}', now(), now());
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid, 'haithem.kalia7@gmail.com',
      jsonb_build_object('sub',uid::text,'email','haithem.kalia7@gmail.com','email_verified',true,'provider','email'),
      'email', now(), now(), now()) ON CONFLICT DO NOTHING;
  ELSE SELECT id INTO uid FROM auth.users WHERE email = 'haithem.kalia7@gmail.com';
  END IF;
  INSERT INTO public.profiles (id, user_id, full_name, created_at, updated_at) VALUES (gen_random_uuid(), uid, 'Technicien Montage', now(), now()) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'technicien_montage') ON CONFLICT DO NOTHING;

  -- ── 8. responsable_sav ───────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'haithem.kalia8@gmail.com') THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmed_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      phone_change, phone_change_token,
      email_change_token_current, reauthentication_token,
      email_change_confirm_status, is_super_admin, is_sso_user,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'haithem.kalia8@gmail.com', pwd_hash, now(), now(),
      '','','','','','','','', 0, false, false,
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Responsable SAV"}', now(), now());
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid, 'haithem.kalia8@gmail.com',
      jsonb_build_object('sub',uid::text,'email','haithem.kalia8@gmail.com','email_verified',true,'provider','email'),
      'email', now(), now(), now()) ON CONFLICT DO NOTHING;
  ELSE SELECT id INTO uid FROM auth.users WHERE email = 'haithem.kalia8@gmail.com';
  END IF;
  INSERT INTO public.profiles (id, user_id, full_name, created_at, updated_at) VALUES (gen_random_uuid(), uid, 'Responsable SAV', now(), now()) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'responsable_sav') ON CONFLICT DO NOTHING;

  -- ── 9. responsable_comptabilite ──────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'haithem.kalia9@gmail.com') THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmed_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      phone_change, phone_change_token,
      email_change_token_current, reauthentication_token,
      email_change_confirm_status, is_super_admin, is_sso_user,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'haithem.kalia9@gmail.com', pwd_hash, now(), now(),
      '','','','','','','','', 0, false, false,
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Responsable Comptabilite"}', now(), now());
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid, 'haithem.kalia9@gmail.com',
      jsonb_build_object('sub',uid::text,'email','haithem.kalia9@gmail.com','email_verified',true,'provider','email'),
      'email', now(), now(), now()) ON CONFLICT DO NOTHING;
  ELSE SELECT id INTO uid FROM auth.users WHERE email = 'haithem.kalia9@gmail.com';
  END IF;
  INSERT INTO public.profiles (id, user_id, full_name, created_at, updated_at) VALUES (gen_random_uuid(), uid, 'Responsable Comptabilite', now(), now()) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'responsable_comptabilite') ON CONFLICT DO NOTHING;

  -- ── 10. responsable_showroom ─────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'haithem.kalia10@gmail.com') THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmed_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      phone_change, phone_change_token,
      email_change_token_current, reauthentication_token,
      email_change_confirm_status, is_super_admin, is_sso_user,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'haithem.kalia10@gmail.com', pwd_hash, now(), now(),
      '','','','','','','','', 0, false, false,
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Responsable Showroom"}', now(), now());
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid, 'haithem.kalia10@gmail.com',
      jsonb_build_object('sub',uid::text,'email','haithem.kalia10@gmail.com','email_verified',true,'provider','email'),
      'email', now(), now(), now()) ON CONFLICT DO NOTHING;
  ELSE SELECT id INTO uid FROM auth.users WHERE email = 'haithem.kalia10@gmail.com';
  END IF;
  INSERT INTO public.profiles (id, user_id, full_name, created_at, updated_at) VALUES (gen_random_uuid(), uid, 'Responsable Showroom', now(), now()) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'responsable_showroom') ON CONFLICT DO NOTHING;

  -- ── 11. client ───────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'haithem.kalia11@gmail.com') THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmed_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      phone_change, phone_change_token,
      email_change_token_current, reauthentication_token,
      email_change_confirm_status, is_super_admin, is_sso_user,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'haithem.kalia11@gmail.com', pwd_hash, now(), now(),
      '','','','','','','','', 0, false, false,
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Client Test"}', now(), now());
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid, 'haithem.kalia11@gmail.com',
      jsonb_build_object('sub',uid::text,'email','haithem.kalia11@gmail.com','email_verified',true,'provider','email'),
      'email', now(), now(), now()) ON CONFLICT DO NOTHING;
  ELSE SELECT id INTO uid FROM auth.users WHERE email = 'haithem.kalia11@gmail.com';
  END IF;
  INSERT INTO public.profiles (id, user_id, full_name, created_at, updated_at) VALUES (gen_random_uuid(), uid, 'Client Test', now(), now()) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'client') ON CONFLICT DO NOTHING;

  -- ── 12. livraison ────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'haithem.kalia12@gmail.com') THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmed_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      phone_change, phone_change_token,
      email_change_token_current, reauthentication_token,
      email_change_confirm_status, is_super_admin, is_sso_user,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'haithem.kalia12@gmail.com', pwd_hash, now(), now(),
      '','','','','','','','', 0, false, false,
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Livreur"}', now(), now());
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid, 'haithem.kalia12@gmail.com',
      jsonb_build_object('sub',uid::text,'email','haithem.kalia12@gmail.com','email_verified',true,'provider','email'),
      'email', now(), now(), now()) ON CONFLICT DO NOTHING;
  ELSE SELECT id INTO uid FROM auth.users WHERE email = 'haithem.kalia12@gmail.com';
  END IF;
  INSERT INTO public.profiles (id, user_id, full_name, created_at, updated_at) VALUES (gen_random_uuid(), uid, 'Livreur', now(), now()) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'livraison') ON CONFLICT DO NOTHING;

END $$;

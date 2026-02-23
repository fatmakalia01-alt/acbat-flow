-- =====================================================================
-- RÉPARATION DÉFINITIVE - "Database error querying schema"
-- À exécuter dans : Supabase Dashboard → SQL Editor
-- =====================================================================
-- CAUSES IDENTIFIÉES :
-- 1. La migration 20260222180000_rls_security_final.sql supprime TOUTES
--    les politiques RLS puis en recrée, mais rate les politiques INSERT
--    sur public.profiles (nécessaires au trigger handle_new_user)
-- 2. Double trigger sav_reference_trigger sur sav_tickets
-- 3. La migration 20260222180000 bloque le INSERT sur user_roles pour 
--    les nouveaux utilisateurs (pas de politique INSERT)
-- =====================================================================

-- =====================================================================
-- ÉTAPE 1 : Corriger les triggers dupliqués sur sav_tickets
-- (deux triggers essaient de générer la référence SAV → conflit)
-- =====================================================================
DROP TRIGGER IF EXISTS sav_reference_trigger ON public.sav_tickets;
DROP TRIGGER IF EXISTS generate_sav_ref ON public.sav_tickets;
DROP TRIGGER IF EXISTS tr_set_sav_reference ON public.sav_tickets;

-- Recréer UN SEUL trigger SAV propre
CREATE OR REPLACE FUNCTION public.generate_sav_reference()
RETURNS trigger LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE seq_num INTEGER;
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    SELECT COUNT(*) + 1 INTO seq_num 
    FROM public.sav_tickets 
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());
    NEW.reference := 'SAV-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(seq_num::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER generate_sav_ref 
  BEFORE INSERT ON public.sav_tickets 
  FOR EACH ROW EXECUTE FUNCTION public.generate_sav_reference();

-- =====================================================================
-- ÉTAPE 2 : Recréer la fonction handle_new_user avec gestion d'erreur
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'handle_new_user() failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW; -- Ne pas bloquer l'inscription
END;
$$;

-- S'assurer qu'il n'y a qu'UN SEUL trigger on_auth_user_created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- ÉTAPE 3 : Supprimer TOUTES les politiques conflictuelles sur profiles
--           et user_roles, puis recréer un ensemble cohérent
-- =====================================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.profiles';
  END LOOP;
  
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.user_roles';
  END LOOP;
END $$;

-- Politiques pour public.profiles
-- SELECT : tout utilisateur authentifié voit les profils (requis pour l'app)
CREATE POLICY "Authenticated can view profiles" 
  ON public.profiles FOR SELECT 
  TO authenticated USING (true);

-- INSERT : via trigger (service_role) ou l'utilisateur lui-même
CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert profiles" 
  ON public.profiles FOR INSERT 
  TO service_role 
  WITH CHECK (true);

-- UPDATE : l'utilisateur peut modifier son profil, le manager peut tout modifier  
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can update all profiles" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'manager'
    )
  );

-- Politiques pour public.user_roles
-- SELECT : chacun voit son rôle, les managers voient tout
CREATE POLICY "Users can view own roles" 
  ON public.user_roles FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all roles" 
  ON public.user_roles FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'manager'
    )
  );

-- INSERT/UPDATE/DELETE : service_role (pour seed) et managers
CREATE POLICY "Service role can manage roles" 
  ON public.user_roles FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Managers can manage roles" 
  ON public.user_roles FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'manager'
    )
  );

-- =====================================================================
-- ÉTAPE 4 : S'assurer que les permissions de base sont correctes
-- =====================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated, service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- =====================================================================
-- ÉTAPE 5 : Vérification - lister les utilisateurs et leurs profils
-- =====================================================================
-- (Décommentez pour vérifier après exécution)
-- SELECT 
--   au.email,
--   p.full_name,
--   ur.role
-- FROM auth.users au
-- LEFT JOIN public.profiles p ON p.user_id = au.id
-- LEFT JOIN public.user_roles ur ON ur.user_id = au.id
-- ORDER BY au.email;

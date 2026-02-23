-- =====================================================================
-- FIX CRITIQUE : 42P17 - Récursion infinie dans les politiques RLS
-- de la table public.user_roles
-- 
-- CAUSE : Les politiques RLS sur user_roles vérifient user_roles pour
-- savoir si l'utilisateur est manager → boucle infinie :
--   policy → SELECT user_roles → policy → SELECT user_roles → ∞
--
-- SOLUTION : 
--   1. Supprimer TOUTES les politiques sur user_roles
--   2. Créer une fonction SECURITY DEFINER (bypasse le RLS) pour
--      vérifier le rôle manager sans récursion
--   3. Remplacer les politiques recursives par des politiques simples
--      basées uniquement sur auth.uid() = user_id
-- =====================================================================

-- =====================================================================
-- ÉTAPE 1 : Supprimer TOUTES les politiques existantes sur user_roles
-- (elles contiennent toutes la récursion)
-- =====================================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_roles'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.user_roles';
  END LOOP;
  RAISE NOTICE '✅ Toutes les politiques user_roles supprimées.';
END $$;

-- =====================================================================
-- ÉTAPE 2 : Créer une fonction SECURITY DEFINER pour vérifier les rôles
-- Cette fonction bypasse le RLS → pas de récursion possible
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER  -- <-- bypasse RLS, exécute en tant que owner (postgres)
SET search_path = public
AS $$
  SELECT role::text FROM public.user_roles WHERE user_id = auth.uid();
$$;

-- Variante booléenne pour vérifier un rôle spécifique
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role::text = _role
  );
$$;

-- Recréer is_manager et is_internal_staff en SECURITY DEFINER également
CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'manager'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_internal_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role != 'client'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- =====================================================================
-- ÉTAPE 3 : Recréer les politiques user_roles SANS récursion
-- Règle d'or : une politique sur user_roles ne doit JAMAIS
-- faire SELECT FROM user_roles (même via une fonction non-DEFINER)
-- =====================================================================

-- SELECT : chaque utilisateur lit UNIQUEMENT ses propres rôles
-- (simple auth.uid() = user_id → pas de récursion)
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- SELECT élargi pour service_role (seed scripts, admin)
CREATE POLICY "Service role full access to roles"
  ON public.user_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- INSERT/UPDATE/DELETE : uniquement le manager via la fonction SECURITY DEFINER
-- public.current_user_has_role() ne provoque PAS de récursion car SECURITY DEFINER
CREATE POLICY "Managers can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_has_role('manager'));

CREATE POLICY "Managers can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.current_user_has_role('manager'));

CREATE POLICY "Managers can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.current_user_has_role('manager'));

-- =====================================================================
-- ÉTAPE 4 : Vérification de cohérence
-- =====================================================================
DO $$
DECLARE
  rec_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rec_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'user_roles';

  RAISE NOTICE '✅ % politiques actives sur user_roles (attendu: 5)', rec_count;
END $$;

-- ============================================
-- Delegations table + RLS
-- Created: 2026-02-22
-- ============================================

CREATE TABLE IF NOT EXISTS public.delegations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL,
  reason       text,
  start_date   date NOT NULL DEFAULT CURRENT_DATE,
  end_date     date,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_delegations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_delegations_updated_at ON public.delegations;
CREATE TRIGGER set_delegations_updated_at
  BEFORE UPDATE ON public.delegations
  FOR EACH ROW EXECUTE FUNCTION public.update_delegations_updated_at();

-- Auto-expire delegations past their end_date
CREATE OR REPLACE FUNCTION public.auto_expire_delegations()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.end_date IS NOT NULL AND NEW.end_date < CURRENT_DATE AND NEW.status = 'active' THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS expire_delegation_on_update ON public.delegations;
CREATE TRIGGER expire_delegation_on_update
  BEFORE UPDATE ON public.delegations
  FOR EACH ROW EXECUTE FUNCTION public.auto_expire_delegations();

-- Enable RLS
ALTER TABLE public.delegations ENABLE ROW LEVEL SECURITY;

-- Manager / directeur_exploitation: full access
CREATE POLICY "delegations_manager_all" ON public.delegations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('manager', 'directeur_exploitation')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('manager', 'directeur_exploitation')
    )
  );

-- Any user: can see delegations that concern them (as delegator or delegate)
CREATE POLICY "delegations_user_own" ON public.delegations
  FOR SELECT
  TO authenticated
  USING (
    from_user_id = auth.uid() OR to_user_id = auth.uid()
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_delegations_from_user ON public.delegations(from_user_id);
CREATE INDEX IF NOT EXISTS idx_delegations_to_user   ON public.delegations(to_user_id);
CREATE INDEX IF NOT EXISTS idx_delegations_status    ON public.delegations(status);

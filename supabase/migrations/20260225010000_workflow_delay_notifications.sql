-- Migration: Workflow delay tracking + delay reports + enhanced notifications
-- Date: 2026-02-25

-- ─── Step 1: Add delay-tracking fields to order_workflow_steps ──────────────
ALTER TABLE public.order_workflow_steps
  ADD COLUMN IF NOT EXISTS estimated_duration_days  INTEGER,
  ADD COLUMN IF NOT EXISTS deadline_set_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delay_cause              TEXT,
  ADD COLUMN IF NOT EXISTS blamed_service           TEXT;

-- ─── Step 2: Create delay_reports table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.delay_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id         UUID REFERENCES public.order_workflow_steps(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES public.client_orders(id) ON DELETE CASCADE,
  reported_by     UUID REFERENCES auth.users(id),
  cause_text      TEXT NOT NULL,
  blamed_role     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.delay_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delay_reports_select" ON public.delay_reports;
CREATE POLICY "delay_reports_select" ON public.delay_reports
  FOR SELECT USING (
    reported_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('manager', 'directeur_exploitation', 'responsable_commercial')
    )
  );

DROP POLICY IF EXISTS "delay_reports_insert" ON public.delay_reports;
CREATE POLICY "delay_reports_insert" ON public.delay_reports
  FOR INSERT WITH CHECK (reported_by = auth.uid());

-- ─── Step 3: Add action fields to notifications ──────────────────────────────
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS related_step_id  UUID REFERENCES public.order_workflow_steps(id),
  ADD COLUMN IF NOT EXISTS action_required  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS action_type      TEXT;

-- ─── Step 4: Function to notify all users with a given role ─────────────────
CREATE OR REPLACE FUNCTION public.notify_users_by_role(
  p_role            TEXT,
  p_title           TEXT,
  p_message         TEXT,
  p_type            TEXT,
  p_order_id        UUID DEFAULT NULL,
  p_step_id         UUID DEFAULT NULL,
  p_action_required BOOLEAN DEFAULT FALSE,
  p_action_type     TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id, title, message, type, related_order_id, related_step_id,
    action_required, action_type, read
  )
  SELECT
    ur.user_id,
    p_title, p_message, p_type,
    p_order_id, p_step_id,
    p_action_required, p_action_type,
    FALSE
  FROM public.user_roles ur
  WHERE ur.role = p_role;
END;
$$;

-- ─── Step 5: Function to notify managers + directeur ────────────────────────
CREATE OR REPLACE FUNCTION public.notify_management(
  p_title           TEXT,
  p_message         TEXT,
  p_type            TEXT,
  p_order_id        UUID DEFAULT NULL,
  p_step_id         UUID DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id, title, message, type, related_order_id, related_step_id, read
  )
  SELECT ur.user_id, p_title, p_message, p_type, p_order_id, p_step_id, FALSE
  FROM public.user_roles ur
  WHERE ur.role IN ('manager', 'directeur_exploitation');
END;
$$;

-- ─── Step 6: Function to check and flag overdue steps ────────────────────────
CREATE OR REPLACE FUNCTION public.check_overdue_workflow_steps()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_step  RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_step IN
    SELECT ws.id, ws.step_name, ws.order_id, ws.due_date, o.reference
    FROM public.order_workflow_steps ws
    JOIN public.client_orders o ON o.id = ws.order_id
    WHERE ws.status = 'in_progress'
      AND ws.due_date IS NOT NULL
      AND ws.due_date < NOW()
      AND ws.status != 'delayed'
  LOOP
    -- Mark step as delayed
    UPDATE public.order_workflow_steps
      SET status = 'delayed'
    WHERE id = v_step.id;

    -- Notify management
    PERFORM public.notify_management(
      '⚠️ Délai dépassé — ' || v_step.reference,
      'L''étape "' || replace(v_step.step_name, '_', ' ') || '" de la commande ' || v_step.reference || ' a dépassé son délai.',
      'depassement',
      v_step.order_id,
      v_step.id
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Enable Realtime for delay_reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.delay_reports;

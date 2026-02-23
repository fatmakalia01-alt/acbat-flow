-- Tracking Logic, Notifications and Justifications
-- Created: 2026-02-23

-- 1. EXTEND order_workflow_steps
ALTER TABLE public.order_workflow_steps ADD COLUMN IF NOT EXISTS responsible_role public.app_role;

-- 2. CREATE workflow_justifications TABLE
CREATE TABLE IF NOT EXISTS public.workflow_justifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id      uuid NOT NULL REFERENCES public.order_workflow_steps(id) ON DELETE CASCADE,
  justified_by uuid NOT NULL REFERENCES auth.users(id),
  content      text NOT NULL,
  blamed_role  public.app_role,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_workflow_justifications_step_id ON public.workflow_justifications(step_id);

-- 3. NOTIFICATION LOGIC

-- Function to notify Manager and Director of Operations
CREATE OR REPLACE FUNCTION public.notify_management(p_title text, p_message text, p_order_id uuid, p_type public.notification_type DEFAULT 'info', p_alert_level public.alert_level DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_mgr_id uuid;
  v_dir_id uuid;
BEGIN
  -- Get Manager and Director IDs (taking first one found for now, or all if we want)
  -- For this flow, we notify all managers and directors
  FOR v_mgr_id IN (SELECT user_id FROM public.user_roles WHERE role = 'manager') LOOP
    INSERT INTO public.notifications (user_id, title, message, related_order_id, type, alert_level)
    VALUES (v_mgr_id, p_title, p_message, p_order_id, p_type, p_alert_level);
  END LOOP;

  FOR v_dir_id IN (SELECT user_id FROM public.user_roles WHERE role = 'directeur_exploitation') LOOP
    INSERT INTO public.notifications (user_id, title, message, related_order_id, type, alert_level)
    VALUES (v_dir_id, p_title, p_message, p_order_id, p_type, p_alert_level);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on Order Launch
CREATE OR REPLACE FUNCTION public.on_order_launch_notify()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle transition to 'en_validation' (Lancement)
  IF (OLD.status = 'brouillon' AND NEW.status = 'en_validation') THEN
    PERFORM public.notify_management(
      'Nouvelle commande lancée',
      'Une nouvelle commande (' || NEW.reference || ') a été lancée et attend votre validation.',
      NEW.id,
      'info'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_on_order_launch_notify ON public.client_orders;
CREATE TRIGGER tr_on_order_launch_notify
AFTER UPDATE ON public.client_orders
FOR EACH ROW EXECUTE FUNCTION public.on_order_launch_notify();

-- Trigger on Workflow Step Movement
CREATE OR REPLACE FUNCTION public.on_workflow_step_change_notify()
RETURNS TRIGGER AS $$
DECLARE
  v_order_ref text;
BEGIN
  SELECT reference INTO v_order_ref FROM public.client_orders WHERE id = NEW.order_id;

  IF (OLD.status <> NEW.status OR OLD.step_order <> NEW.step_order OR OLD.notes IS DISTINCT FROM NEW.notes) THEN
    PERFORM public.notify_management(
      'Mouvement / Note sur commande',
      'La commande ' || v_order_ref || ' a été mise à jour: ' || NEW.step_name || ' (' || NEW.status || '). ' || COALESCE('Note: ' || NEW.notes, ''),
      NEW.order_id,
      'transition'
    );

    -- If the step is assigned or has a responsible role, notify them too
    IF NEW.responsible_role IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, related_order_id, type)
      SELECT user_id, 'Nouvelle tâche assignée', 'Vous avez une nouvelle tâche pour la commande ' || v_order_ref, NEW.order_id, 'info'
      FROM public.user_roles WHERE role = NEW.responsible_role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_on_workflow_step_change_notify ON public.order_workflow_steps;
CREATE TRIGGER tr_on_workflow_step_change_notify
AFTER UPDATE ON public.order_workflow_steps
FOR EACH ROW EXECUTE FUNCTION public.on_workflow_step_change_notify();

-- 4. DEADLINE AND ALERT LOGIC

-- Function to check deadlines (intended to be called by a cron)
CREATE OR REPLACE FUNCTION public.check_workflow_deadlines()
RETURNS void AS $$
DECLARE
  v_step RECORD;
  v_order_ref text;
BEGIN
  FOR v_step IN 
    SELECT s.*, o.reference 
    FROM public.order_workflow_steps s
    JOIN public.client_orders o ON s.order_id = o.id
    WHERE s.status NOT IN ('completed', 'delayed') 
      AND s.due_date < now()
  LOOP
    -- Mark as delayed
    UPDATE public.order_workflow_steps SET status = 'delayed' WHERE id = v_step.id;

    -- Notify Manager, Director, and Responsible Service with RED ALERT
    PERFORM public.notify_management(
      'ALERTE RETARD: ' || v_step.reference,
      'Le délai pour l''étape ' || v_step.step_name || ' est dépassé ! Justification requise.',
      v_step.order_id,
      'depassement',
      'rouge_clignotant'
    );

    -- Notify responsible role
    IF v_step.responsible_role IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, related_order_id, type, alert_level)
      SELECT user_id, 'RETARD CRITIQUE', 'Délai dépassé pour la commande ' || v_step.reference, v_step.order_id, 'depassement', 'rouge_clignotant'
      FROM public.user_roles WHERE role = v_step.responsible_role;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ABSENCE / DELEGATION LOGIC FOR CONFIRMATION

-- View or Function to check if Manager is absent
CREATE OR REPLACE FUNCTION public.is_manager_absent()
RETURNS boolean AS $$
BEGIN
  -- Returns true if there is at least one active delegation from any manager
  RETURN EXISTS (
    SELECT 1 FROM public.delegations d
    JOIN public.user_roles ur ON d.from_user_id = ur.user_id
    WHERE ur.role = 'manager' 
      AND d.status = 'active'
      AND d.start_date <= CURRENT_DATE 
      AND (d.end_date IS NULL OR d.end_date >= CURRENT_DATE)
  );
END;
$$ LANGUAGE plpgsql;

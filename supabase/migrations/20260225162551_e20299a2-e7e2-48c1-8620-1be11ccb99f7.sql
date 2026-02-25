
-- Fix remaining search_path issues on all functions

-- notify_users_by_role already has SECURITY DEFINER but needs search_path
CREATE OR REPLACE FUNCTION public.notify_users_by_role(p_role text, p_title text, p_message text, p_type text, p_order_id uuid DEFAULT NULL, p_step_id uuid DEFAULT NULL, p_action_required boolean DEFAULT false, p_action_type text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, related_order_id, related_step_id, action_required, action_type, read)
  SELECT ur.user_id, p_title, p_message, p_type::public.notification_type, p_order_id, p_step_id, p_action_required, p_action_type, FALSE
  FROM public.user_roles ur WHERE ur.role = p_role;
END; $$;

-- notify_management (5-param version) - add search_path
CREATE OR REPLACE FUNCTION public.notify_management(p_title text, p_message text, p_type text, p_order_id uuid DEFAULT NULL, p_step_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, related_order_id, related_step_id, read)
  SELECT ur.user_id, p_title, p_message, p_type::public.notification_type, p_order_id, p_step_id, FALSE
  FROM public.user_roles ur WHERE ur.role IN ('manager', 'directeur_exploitation');
END; $$;

-- check_overdue_workflow_steps - add search_path
CREATE OR REPLACE FUNCTION public.check_overdue_workflow_steps()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_step RECORD; v_count INTEGER := 0;
BEGIN
  FOR v_step IN
    SELECT ws.id, ws.step_name, ws.order_id, ws.due_date, o.reference
    FROM public.order_workflow_steps ws
    JOIN public.client_orders o ON o.id = ws.order_id
    WHERE ws.status = 'in_progress' AND ws.due_date IS NOT NULL AND ws.due_date < NOW() AND ws.status != 'delayed'
  LOOP
    UPDATE public.order_workflow_steps SET status = 'delayed' WHERE id = v_step.id;
    PERFORM public.notify_management('⚠️ Délai dépassé — ' || v_step.reference, 'L''étape "' || replace(v_step.step_name, '_', ' ') || '" de la commande ' || v_step.reference || ' a dépassé son délai.', 'depassement', v_step.order_id, v_step.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;

-- get_current_month_ca
CREATE OR REPLACE FUNCTION public.get_current_month_ca()
RETURNS numeric LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(SUM(total_ttc), 0) FROM public.client_orders
  WHERE status NOT IN ('annulee', 'brouillon') AND created_at >= DATE_TRUNC('month', NOW());
$$;

-- get_orders_status_distribution
CREATE OR REPLACE FUNCTION public.get_orders_status_distribution()
RETURNS TABLE(name text, value bigint) LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT status::text AS name, COUNT(*) AS value FROM public.client_orders GROUP BY status;
$$;

-- get_ca_evolution_12months
CREATE OR REPLACE FUNCTION public.get_ca_evolution_12months()
RETURNS TABLE(mois text, ca numeric) LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS mois, COALESCE(SUM(total_ttc), 0) AS ca
  FROM public.client_orders
  WHERE status NOT IN ('annulee', 'brouillon') AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
  GROUP BY DATE_TRUNC('month', created_at) ORDER BY DATE_TRUNC('month', created_at);
$$;

-- get_top_commerciaux
CREATE OR REPLACE FUNCTION public.get_top_commerciaux(limit_n integer DEFAULT 5)
RETURNS TABLE(nom text, ca numeric) LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(p.full_name, 'Inconnu') AS nom, COALESCE(SUM(o.total_ttc), 0) AS ca
  FROM public.client_orders o
  JOIN public.clients c ON o.client_id = c.id
  LEFT JOIN public.profiles p ON p.user_id = c.commercial_id
  WHERE o.status NOT IN ('annulee', 'brouillon')
  GROUP BY p.full_name ORDER BY ca DESC LIMIT limit_n;
$$;

-- log_audit_event
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.audit_log (user_id, table_name, record_id, action, old_data, new_data)
    VALUES (auth.uid(), TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP, 
            CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
            CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)::jsonb ELSE NULL END);
    RETURN NULL;
END; $$;

-- Fix remaining "RLS always true" policies
-- profiles: "Service role can insert profiles" with CHECK (true)
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- sav_comments: "Staff can insert sav_comments" is fine (has proper check)
-- The remaining always-true ones should be the ones on brands/sites for SELECT which are intentional

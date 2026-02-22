-- Migration: Dashboard aggregate functions + SAV reference trigger

-- Function: CA evolution for last 12 months
CREATE OR REPLACE FUNCTION public.get_ca_evolution_12months()
RETURNS TABLE(mois text, ca numeric)
LANGUAGE sql STABLE
AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS mois,
    COALESCE(SUM(total_ttc), 0) AS ca
  FROM public.client_orders
  WHERE
    status NOT IN ('annulee', 'brouillon')
    AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY DATE_TRUNC('month', created_at);
$$;

-- Function: top 5 commerciaux by CA
CREATE OR REPLACE FUNCTION public.get_top_commerciaux(limit_n int DEFAULT 5)
RETURNS TABLE(nom text, ca numeric)
LANGUAGE sql STABLE
AS $$
  SELECT
    COALESCE(p.full_name, 'Inconnu') AS nom,
    COALESCE(SUM(o.total_ttc), 0) AS ca
  FROM public.client_orders o
  JOIN public.clients c ON o.client_id = c.id
  LEFT JOIN public.profiles p ON p.user_id = c.commercial_id
  WHERE o.status NOT IN ('annulee', 'brouillon')
  GROUP BY p.full_name
  ORDER BY ca DESC
  LIMIT limit_n;
$$;

-- Function: current month CA
CREATE OR REPLACE FUNCTION public.get_current_month_ca()
RETURNS numeric
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(SUM(total_ttc), 0)
  FROM public.client_orders
  WHERE
    status NOT IN ('annulee', 'brouillon')
    AND created_at >= DATE_TRUNC('month', NOW());
$$;

-- Function: order status distribution
CREATE OR REPLACE FUNCTION public.get_orders_status_distribution()
RETURNS TABLE(name text, value bigint)
LANGUAGE sql STABLE
AS $$
  SELECT status::text AS name, COUNT(*) AS value
  FROM public.client_orders
  GROUP BY status;
$$;

-- Auto-reference for SAV tickets
CREATE OR REPLACE FUNCTION public.set_sav_reference()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.reference = '' OR NEW.reference IS NULL THEN
    NEW.reference := 'SAV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('sav_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE SEQUENCE IF NOT EXISTS public.sav_seq START 1;

CREATE TRIGGER sav_reference_trigger
  BEFORE INSERT ON public.sav_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_sav_reference();

-- Notification trigger on order status change
CREATE OR REPLACE FUNCTION public.notify_on_order_status_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify the assigned commercial or the creator
    INSERT INTO public.notifications (user_id, title, message, type, related_order_id)
    SELECT
      NEW.created_by,
      'Statut commande mis à jour',
      'La commande ' || NEW.reference || ' est passée à "' || NEW.status || '"',
      'transition',
      NEW.id
    WHERE NEW.created_by IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_status_notification ON public.client_orders;
CREATE TRIGGER order_status_notification
  AFTER UPDATE OF status ON public.client_orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_status_change();

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

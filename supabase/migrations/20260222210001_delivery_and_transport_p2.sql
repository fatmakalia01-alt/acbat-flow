-- Phase 3: Part 2 - Schema and Logic for Delivery module
-- Assumes Part 1 (Enum) has been executed and committed.

-- 1. TABLE UPDATES
ALTER TABLE public.deliveries 
  ADD COLUMN IF NOT EXISTS carrier_name text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS vehicle_plate text,
  ADD COLUMN IF NOT EXISTS transport_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carrier_type text DEFAULT 'interne';

-- 2. SECURITY (RLS)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Delivery staff can manage deliveries') THEN
    CREATE POLICY "Delivery staff can manage deliveries" ON public.deliveries 
    FOR ALL TO authenticated 
    USING (
      auth.uid() = technician_id OR 
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('manager', 'responsable_logistique', 'livraison'))
    );
  END IF;
END $$;

-- 3. WORKFLOW TRIGGER INTEGRATION
CREATE OR REPLACE FUNCTION public.sync_order_delivery_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'livree' AND OLD.status <> 'livree' THEN
    -- Update order status
    UPDATE public.client_orders SET status = 'livree' WHERE id = NEW.order_id;
    
    -- Complete the workflow step
    UPDATE public.order_workflow_steps 
    SET status = 'completed', completed_at = now() 
    WHERE order_id = NEW.order_id AND step_name = 'livraison_installation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_order_delivery_status ON public.deliveries;
CREATE TRIGGER tr_sync_order_delivery_status
AFTER UPDATE ON public.deliveries
FOR EACH ROW EXECUTE FUNCTION public.sync_order_delivery_status();

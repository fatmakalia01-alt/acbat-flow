-- Migration: Order creation delay field + Trigger update
-- Date: 2026-02-25

-- 1. Add initial_delay_days to client_orders
ALTER TABLE public.client_orders 
  ADD COLUMN IF NOT EXISTS initial_delay_days INTEGER DEFAULT 2;

-- 2. Update the workflow creation function to use the initial delay
CREATE OR REPLACE FUNCTION public.create_workflow_steps()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
DECLARE
  steps workflow_step_name[] := ARRAY['creation_commande','validation_commerciale','commande_fournisseur','reception_marchandises','preparation_technique','livraison_installation','validation_client','facturation_paiement','cloture_archivage']::workflow_step_name[];
  -- Default delays from ACBAT standards
  delays INTEGER[] := ARRAY[2,1,30,2,3,1,0,7,0];
  i INTEGER;
  v_delay INTEGER;
BEGIN
  FOR i IN 1..9 LOOP
    -- Use the custom delay for the first step if provided
    IF i = 1 AND NEW.initial_delay_days IS NOT NULL THEN
      v_delay := NEW.initial_delay_days;
    ELSE
      v_delay := delays[i];
    END IF;

    INSERT INTO public.order_workflow_steps (
      order_id, 
      step_name, 
      step_order, 
      status, 
      due_date,
      estimated_duration_days
    )
    VALUES (
      NEW.id, 
      steps[i], 
      i,
      CASE WHEN i = 1 THEN 'in_progress'::workflow_step_status ELSE 'pending'::workflow_step_status END,
      CASE WHEN v_delay > 0 THEN now() + (v_delay || ' days')::INTERVAL ELSE NULL END,
      v_delay
    );
  END LOOP;
  RETURN NEW;
END; $$;

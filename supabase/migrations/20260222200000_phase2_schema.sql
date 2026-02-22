-- Phase 2: Stock Movements and SAV Comments
-- Created: 2026-02-22

-- 1. ENUMS & TABLES
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type') THEN
    CREATE TYPE public.stock_movement_type AS ENUM ('in', 'out', 'adjustment');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity     integer NOT NULL, -- positive for 'in', negative for 'out'
  type         stock_movement_type NOT NULL,
  reason       text,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sav_comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    uuid NOT NULL REFERENCES public.sav_tickets(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id),
  content      text NOT NULL,
  is_internal  boolean DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 2. SECURITY (RLS)
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sav_comments ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can manage stock movements') THEN
    CREATE POLICY "Staff can manage stock movements" ON public.stock_movements FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can manage sav comments') THEN
    CREATE POLICY "Staff can manage sav comments" ON public.sav_comments FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- 3. TRIGGERS & FUNCTIONS

-- Update stock quantity automatically
CREATE OR REPLACE FUNCTION public.update_stock_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- We assume a stock row exists for every product (created via trigger or during product creation)
  UPDATE public.stock
  SET quantity = quantity + NEW.quantity,
      updated_at = now()
  WHERE product_id = NEW.product_id;
  
  -- Fallback if no stock row exists
  IF NOT FOUND THEN
    INSERT INTO public.stock (product_id, quantity)
    VALUES (NEW.product_id, NEW.quantity);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_stock_quantity ON public.stock_movements;
CREATE TRIGGER tr_update_stock_quantity
AFTER INSERT ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.update_stock_quantity();

-- SAV Reference Sequence
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'sav_reference_seq') THEN
    CREATE SEQUENCE public.sav_reference_seq START 100;
  END IF;
END $$;

-- Auto-set SAV reference
CREATE OR REPLACE FUNCTION public.set_sav_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'SAV-' || nextval('public.sav_reference_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_sav_reference ON public.sav_tickets;
CREATE TRIGGER tr_set_sav_reference
BEFORE INSERT ON public.sav_tickets
FOR EACH ROW EXECUTE FUNCTION public.set_sav_reference();


-- Re-apply changes from failed first migration

-- 1. Drop overly permissive "always true" ALL policies
DROP POLICY IF EXISTS "Staff can manage sav comments" ON public.sav_comments;
DROP POLICY IF EXISTS "Staff can manage stock movements" ON public.stock_movements;

-- 2. Fix race conditions - sequences for order/quote references
CREATE SEQUENCE IF NOT EXISTS public.order_ref_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.quote_ref_seq START 1;

DO $$
DECLARE max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(reference, '^CMD-\d{4}-', ''), '')::INTEGER), 0)
    INTO max_num FROM public.client_orders WHERE reference ~ '^CMD-\d{4}-\d+$';
  IF max_num > 0 THEN PERFORM setval('public.order_ref_seq', max_num); END IF;

  SELECT COALESCE(MAX(NULLIF(regexp_replace(reference, '^DEV-\d{4}-', ''), '')::INTEGER), 0)
    INTO max_num FROM public.quotes WHERE reference ~ '^DEV-\d{4}-\d+$';
  IF max_num > 0 THEN PERFORM setval('public.quote_ref_seq', max_num); END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_order_reference()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'CMD-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(nextval('public.order_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_quote_reference()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'DEV-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(nextval('public.quote_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END; $$;

-- 3. Fix remaining functions without search_path
CREATE OR REPLACE FUNCTION public.update_stock_quantity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.stock SET quantity = quantity + NEW.quantity, updated_at = now() WHERE product_id = NEW.product_id;
  IF NOT FOUND THEN INSERT INTO public.stock (product_id, quantity) VALUES (NEW.product_id, NEW.quantity); END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.set_sav_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'SAV-' || nextval('public.sav_reference_seq');
  END IF;
  RETURN NEW;
END; $$;

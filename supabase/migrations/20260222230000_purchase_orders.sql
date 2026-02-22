-- Migration: 20260222230000_purchase_orders.sql
-- Description: Creates purchase_orders and purchase_order_items tables
--              for tracking international import procurement from Italian suppliers.

-- 1. Create purchase_order_status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_order_status') THEN
    CREATE TYPE public.purchase_order_status AS ENUM (
      'brouillon',
      'en_commande',
      'en_transit',
      'en_douane',
      'receptionne',
      'annule'
    );
  END IF;
END $$;

-- 2. Create purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference         text NOT NULL UNIQUE,
  supplier_id       uuid REFERENCES public.suppliers(id),
  brand_id          uuid REFERENCES public.brands(id),
  status            public.purchase_order_status NOT NULL DEFAULT 'brouillon',
  estimated_arrival date,
  actual_arrival    date,
  total_amount_eur  numeric(12, 2) DEFAULT 0,
  exchange_rate     numeric(8, 4) DEFAULT 3.35,
  total_amount_tnd  numeric(12, 2) GENERATED ALWAYS AS (total_amount_eur * exchange_rate) STORED,
  customs_fees      numeric(12, 2) DEFAULT 0,
  transport_fees    numeric(12, 2) DEFAULT 0,
  transit_notes     text,
  customs_notes     text,
  notes             text,
  created_by        uuid REFERENCES public.profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 3. Create purchase_order_items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id   uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id          uuid REFERENCES public.products(id),
  description         text,
  quantity            numeric(10, 2) NOT NULL DEFAULT 1,
  unit_price_eur      numeric(12, 2) NOT NULL DEFAULT 0,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DO $$
BEGIN
  -- purchase_orders: all authenticated can read
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'Staff can read purchase_orders') THEN
    CREATE POLICY "Staff can read purchase_orders"
      ON public.purchase_orders FOR SELECT TO authenticated USING (true);
  END IF;

  -- purchase_orders: managers and responsable_achat can insert/update/delete
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'Staff manage purchase_orders') THEN
    CREATE POLICY "Staff manage purchase_orders"
      ON public.purchase_orders FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role IN ('manager', 'responsable_achat', 'directeur_exploitation')
        )
      );
  END IF;

  -- purchase_order_items: all authenticated can read
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_order_items' AND policyname = 'Staff can read purchase_order_items') THEN
    CREATE POLICY "Staff can read purchase_order_items"
      ON public.purchase_order_items FOR SELECT TO authenticated USING (true);
  END IF;

  -- purchase_order_items: managers and responsable_achat can manage
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_order_items' AND policyname = 'Staff manage purchase_order_items') THEN
    CREATE POLICY "Staff manage purchase_order_items"
      ON public.purchase_order_items FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role IN ('manager', 'responsable_achat', 'directeur_exploitation')
        )
      );
  END IF;
END $$;

-- 6. Insert seed data for testing
INSERT INTO public.purchase_orders (reference, status, estimated_arrival, total_amount_eur, exchange_rate, customs_fees, transport_fees, transit_notes)
VALUES
  ('PO-2026-0001', 'en_transit', '2026-03-15', 12500.00, 3.35, 850.00, 450.00, 'Départ port de Gênes le 15/02/2026. Navire: MSC Fantasia'),
  ('PO-2026-0002', 'en_douane', '2026-02-28', 8200.00, 3.35, 620.00, 380.00, 'Arrivé port de Radès. En attente dédouanement.')
ON CONFLICT DO NOTHING;

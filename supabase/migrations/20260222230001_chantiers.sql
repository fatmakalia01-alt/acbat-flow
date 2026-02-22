-- Migration: 20260222230001_chantiers.sql
-- Description: Creates chantiers table for jobsite planning and tracking.

-- 1. Create chantier_status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chantier_status') THEN
    CREATE TYPE public.chantier_status AS ENUM (
      'planifie',
      'en_cours',
      'en_attente',
      'termine',
      'annule'
    );
  END IF;
END $$;

-- 2. Create chantiers table
CREATE TABLE IF NOT EXISTS public.chantiers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference         text NOT NULL UNIQUE,
  name              text NOT NULL,
  client_id         uuid REFERENCES public.clients(id),
  order_id          uuid REFERENCES public.client_orders(id),
  site_id           uuid REFERENCES public.sites(id),
  status            public.chantier_status NOT NULL DEFAULT 'planifie',
  planned_start     date,
  planned_end       date,
  actual_start      date,
  actual_end        date,
  team_lead         text,
  team_members      text[],
  address_chantier  text,
  notes             text,
  technical_notes   text,
  created_by        uuid REFERENCES public.profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.chantiers ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DO $$
BEGIN
  -- All authenticated staff can read chantiers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chantiers' AND policyname = 'Staff can read chantiers') THEN
    CREATE POLICY "Staff can read chantiers"
      ON public.chantiers FOR SELECT TO authenticated USING (true);
  END IF;

  -- Managers and responsable_technique can manage
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chantiers' AND policyname = 'Staff manage chantiers') THEN
    CREATE POLICY "Staff manage chantiers"
      ON public.chantiers FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role IN ('manager', 'responsable_technique', 'directeur_exploitation')
        )
      );
  END IF;
END $$;

-- 5. Seed data
INSERT INTO public.chantiers (reference, name, status, planned_start, planned_end, team_lead, address_chantier, notes)
VALUES
  ('CH-2026-0001', 'Pose portes blindées - Mme Ben Salah', 'planifie', '2026-03-10', '2026-03-11', 'Anis Trabelsi', 'Résidence El Menzah 6, Appt 14B, Tunis', 'Installation 2 portes ICA Defender D6'),
  ('CH-2026-0002', 'Installation galandage - M. Chaabane', 'en_cours', '2026-02-20', '2026-02-23', 'Riadh Sassi', '12 Rue des Roses, Lac 2, Tunis', 'Galandage Ermetika - chambre principale + bureau')
ON CONFLICT DO NOTHING;

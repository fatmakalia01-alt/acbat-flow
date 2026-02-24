-- Migration: Add unit column to products table
-- Description: Adds a 'unit' column to the products table to store the measurement unit (e.g., 'unité', 'm2', 'kg').

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS unit text DEFAULT 'unité';

-- Update existing products to have the default unit
UPDATE public.products SET unit = 'unité' WHERE unit IS NULL;

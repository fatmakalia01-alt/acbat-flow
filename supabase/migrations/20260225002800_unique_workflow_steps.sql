-- Migration: Prevent duplicate workflow steps per order
-- Date: 2026-02-25
-- Fixes: Each order should have at most one workflow step per step_order

-- Step 1: Remove duplicate rows, keeping only the one with the latest id (most complete data)
DELETE FROM public.order_workflow_steps
WHERE id NOT IN (
  SELECT DISTINCT ON (order_id, step_order) id
  FROM public.order_workflow_steps
  ORDER BY order_id, step_order, id DESC
);

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE public.order_workflow_steps
  DROP CONSTRAINT IF EXISTS uq_order_workflow_steps_order_step;

ALTER TABLE public.order_workflow_steps
  ADD CONSTRAINT uq_order_workflow_steps_order_step
  UNIQUE (order_id, step_order);

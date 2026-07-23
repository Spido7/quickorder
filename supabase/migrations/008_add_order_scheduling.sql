-- Migration: Add scheduled_at column to public.orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS scheduled_at timestamptz DEFAULT NULL;

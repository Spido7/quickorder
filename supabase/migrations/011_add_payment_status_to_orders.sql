-- Migration: Add payment_status to public.orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';

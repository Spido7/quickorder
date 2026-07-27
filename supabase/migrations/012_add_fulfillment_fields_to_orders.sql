-- Migration: Add fulfillment fields to public.orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS fulfillment_type text DEFAULT 'counter',
ADD COLUMN IF NOT EXISTS hostel_block text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS room_number text DEFAULT NULL;

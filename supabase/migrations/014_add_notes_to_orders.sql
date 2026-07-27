-- Add notes column to orders table for special instructions
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL;

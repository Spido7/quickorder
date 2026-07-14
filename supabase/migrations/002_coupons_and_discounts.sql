-- ============================================================
-- QR Menu — Coupons & Promo Codes
-- Migration to add coupons and integrate with orders
-- ============================================================

-- 1. Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  code varchar NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('flat', 'percentage')),
  discount_value numeric(10, 2) NOT NULL CHECK (discount_value >= 0),
  min_order_value numeric(10, 2) NOT NULL DEFAULT 0.00 CHECK (min_order_value >= 0),
  max_discount_amount numeric(10, 2) CHECK (max_discount_amount >= 0),
  usage_limit integer CHECK (usage_limit >= 0),
  times_used integer NOT NULL DEFAULT 0 CHECK (times_used >= 0),
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Alter orders table to add coupon references and discount amounts
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0);

-- 3. Enable RLS on coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for coupons
-- Cafe owners have full access to their coupons
CREATE POLICY "Merchant full access to coupons"
  ON public.coupons FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- Customers can view coupons (e.g. during validation checkout)
CREATE POLICY "Public coupon select"
  ON public.coupons FOR SELECT
  USING (true);

-- 5. Postgres function and trigger to increment times_used when order is paid
CREATE OR REPLACE FUNCTION public.increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid' 
     AND (OLD.payment_status IS DISTINCT FROM 'paid' OR OLD.payment_status IS NULL)
     AND NEW.coupon_id IS NOT NULL THEN
     
    UPDATE public.coupons
    SET times_used = times_used + 1
    WHERE id = NEW.coupon_id;
    
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_increment_coupon_usage
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_coupon_usage();

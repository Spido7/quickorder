-- ============================================================
-- QR Menu — Auto Reset Out of Stock Menu Items
-- Migration to enable pg_cron and schedule a daily reset
-- ============================================================

-- Step 1: Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Ensure any existing job with the same name is unscheduled
-- to prevent duplicate/failed schedules if this migration is re-run.
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'reset-out-of-stock-midnight-ist';

-- Step 3: Schedule the daily reset job
-- Timezone context: 18:30 UTC corresponds to 00:00 (Midnight) IST (Indian Standard Time).
-- This job resets is_available to true for all menu items that were marked out of stock.
SELECT cron.schedule(
  'reset-out-of-stock-midnight-ist',
  '30 18 * * *',
  $$UPDATE public.menu_items SET is_available = true WHERE is_available = false;$$
);

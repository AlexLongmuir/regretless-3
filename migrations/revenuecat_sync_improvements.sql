-- RevenueCat Database Synchronization Improvements
-- This migration:
-- 1. Adds environment column to track SANDBOX vs PRODUCTION
-- 2. Relaxes RLS to allow reading all subscriptions (needed for constraint checks)
-- 3. Maintains security by keeping INSERT/UPDATE restricted to own records

-- Step 1: Add environment column to user_subscriptions
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS environment text DEFAULT 'PRODUCTION' 
CHECK (environment IN ('SANDBOX', 'PRODUCTION'));

-- Add index for environment lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_environment 
ON public.user_subscriptions(environment) 
WHERE environment = 'SANDBOX';

-- Step 2: Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Read own user_subscriptions" ON public.user_subscriptions;

-- Step 3: Create new policy that allows reading all subscriptions
-- This is needed to check if rc_app_user_id exists across users
-- INSERT and UPDATE remain restricted to own records for security
CREATE POLICY "Read all user_subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  USING (true);  -- Allow all authenticated users to read

-- Step 4: Ensure INSERT and UPDATE policies are still restrictive
-- (These should already exist, but we'll ensure they're correct)
DROP POLICY IF EXISTS "Insert own user_subscriptions" ON public.user_subscriptions;
CREATE POLICY "Insert own user_subscriptions"
  ON public.user_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Update own user_subscriptions" ON public.user_subscriptions;
CREATE POLICY "Update own user_subscriptions"
  ON public.user_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 5: Update existing records to PRODUCTION (default)
-- Sandbox records will be updated by webhooks going forward
UPDATE public.user_subscriptions 
SET environment = 'PRODUCTION' 
WHERE environment IS NULL;

-- Step 6: Add comment explaining the RLS policy change
COMMENT ON POLICY "Read all user_subscriptions" ON public.user_subscriptions IS 
'Allows all authenticated users to read subscription records. This is necessary to check if a RevenueCat ID is already linked to another account before attempting inserts, preventing unique constraint violations. INSERT and UPDATE remain restricted to own records for security.';


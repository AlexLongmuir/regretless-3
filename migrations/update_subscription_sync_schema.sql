-- Add environment column to user_subscriptions if it doesn't exist
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS environment text DEFAULT 'PRODUCTION';

-- Add check constraint for environment
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_subscriptions_environment_check') THEN 
        ALTER TABLE public.user_subscriptions 
        ADD CONSTRAINT user_subscriptions_environment_check 
        CHECK (environment IN ('SANDBOX', 'PRODUCTION'));
    END IF; 
END $$;

-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Read own user_subscriptions" ON public.user_subscriptions;

-- Create a new policy that allows reading all records
-- This is needed to check if rc_app_user_id exists across all users to prevent unique constraint violations
CREATE POLICY "Read all user_subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Ensure INSERT and UPDATE policies remain restricted (these should already exist, but verifying/recreating if needed)
-- Note: Assuming "Insert own user_subscriptions" and "Update own user_subscriptions" exist as per schema.md
-- If not, they should be created:

-- CREATE POLICY "Insert own user_subscriptions"
--   ON public.user_subscriptions
--   FOR INSERT
--   WITH CHECK (auth.uid() = user_id);

-- CREATE POLICY "Update own user_subscriptions"
--   ON public.user_subscriptions
--   FOR UPDATE
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);


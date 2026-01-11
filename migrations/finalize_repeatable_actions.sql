-- Fix data types and logic for repeatable actions
-- Run this after applying migration/add_repeat_until_date_and_update_trigger.sql

-- 1. Ensure action_occurrences has all required indexes for performance
CREATE INDEX IF NOT EXISTS idx_action_occurrences_action_date ON action_occurrences(action_id, due_on);
CREATE INDEX IF NOT EXISTS idx_action_occurrences_dream_date ON action_occurrences(dream_id, due_on);

-- 2. Verify trigger function is up to date (this is idempotent)
CREATE OR REPLACE FUNCTION handle_occurrence_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  action_record actions%ROWTYPE;
BEGIN
  -- Only process if this is a new completion
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL OR OLD.completed_at IS DISTINCT FROM NEW.completed_at) THEN
    -- Get the action details just in case we need them for other logic later (e.g. stats)
    SELECT * INTO action_record 
    FROM actions 
    WHERE id = NEW.action_id AND is_active = true AND deleted_at IS NULL;
    
    -- Auto-creation logic removed. Occurrences are pre-scheduled.
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Cleanup any orphaned occurrences (optional, safety check)
DELETE FROM action_occurrences 
WHERE action_id NOT IN (SELECT id FROM actions);

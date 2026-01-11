-- Add repeat_until_date to actions table
ALTER TABLE actions ADD COLUMN IF NOT EXISTS repeat_until_date date;

-- Update handle_occurrence_complete trigger to remove auto-insertion logic
-- The scheduler now pre-creates occurrences, so we only need to handle
-- completion status and checks (like dream completion).

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
    -- Currently we don't strictly need this query if we removed the insertion logic,
    -- but keeping it for potential future hooks or checks is fine.
    SELECT * INTO action_record 
    FROM actions 
    WHERE id = NEW.action_id AND is_active = true AND deleted_at IS NULL;
    
    -- Logic for auto-creating the next occurrence has been REMOVED.
    -- Occurrences are now pre-scheduled by the backend scheduler.
    
  END IF;
  
  RETURN NEW;
END;
$$;

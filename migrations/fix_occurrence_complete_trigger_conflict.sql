-- Fix handle_occurrence_complete trigger to handle existing occurrences
-- The scheduler pre-creates occurrences for repeating actions, so the trigger
-- should skip creation if the occurrence already exists instead of failing.

CREATE OR REPLACE FUNCTION handle_occurrence_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  action_record actions%ROWTYPE;
  next_due_date date;
  dream_end_date date;
  next_occurrence_no integer;
BEGIN
  -- Only process if this is a new completion
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL OR OLD.completed_at IS DISTINCT FROM NEW.completed_at) THEN
    -- Get the action details
    SELECT * INTO action_record 
    FROM actions 
    WHERE id = NEW.action_id AND is_active = true AND deleted_at IS NULL;
    
    -- Only create next occurrence if action has repeat_every_days set
    IF action_record.repeat_every_days IS NOT NULL THEN
      -- Get dream end_date if it exists
      SELECT d.end_date INTO dream_end_date
      FROM dreams d
      JOIN areas a ON a.dream_id = d.id
      WHERE a.id = action_record.area_id;
      
      -- Calculate next due date
      next_due_date := NEW.planned_due_on + (action_record.repeat_every_days || ' days')::interval;
      
      -- Only create if we haven't hit the dream end_date
      IF dream_end_date IS NULL OR next_due_date <= dream_end_date THEN
        -- Get the next occurrence number for this action
        SELECT COALESCE(MAX(occurrence_no), 0) + 1 INTO next_occurrence_no
        FROM action_occurrences 
        WHERE action_id = action_record.id;
        
        -- Insert the next occurrence, but skip if it already exists
        -- (e.g., created by scheduler or previous trigger execution)
        -- Use dream_id, area_id, and user_id from the current occurrence (NEW)
        INSERT INTO action_occurrences (
          action_id, 
          dream_id, 
          area_id, 
          user_id,
          occurrence_no, 
          planned_due_on, 
          due_on,
          defer_count
        )
        VALUES (
          action_record.id, 
          NEW.dream_id, 
          NEW.area_id, 
          NEW.user_id,
          next_occurrence_no, 
          next_due_date, 
          next_due_date,
          0
        )
        ON CONFLICT (action_id, occurrence_no) DO NOTHING;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update current_streak function to use Action Streak logic
-- Streak = number of completed actions since the last overdue action
-- This allows for gaps in days without breaking the streak, as long as no tasks become overdue

CREATE OR REPLACE FUNCTION current_streak(p_user_id uuid, p_dream_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_overdue_date date;
  v_streak_count integer;
BEGIN
  -- 1. Find the due_on date of the most recent overdue occurrence for this dream
  -- An occurrence is overdue if it's not completed and due_on is before today
  SELECT MAX(ao.due_on) INTO v_last_overdue_date
  FROM action_occurrences ao
  JOIN actions act ON act.id = ao.action_id
  JOIN areas a ON a.id = act.area_id
  JOIN dreams d ON d.id = a.dream_id
  WHERE d.user_id = p_user_id 
    AND d.id = p_dream_id
    AND ao.completed_at IS NULL
    AND ao.due_on < CURRENT_DATE
    AND a.deleted_at IS NULL
    AND act.deleted_at IS NULL
    AND act.is_active = true
    AND d.archived_at IS NULL;

  -- 2. Count completed occurrences that were due AFTER the last overdue date
  -- If v_last_overdue_date is NULL, this counts all completed occurrences (since NULL comparison usually needs careful handling, we use OR logic)
  SELECT COUNT(*) INTO v_streak_count
  FROM action_occurrences ao
  JOIN actions act ON act.id = ao.action_id
  JOIN areas a ON a.id = act.area_id
  JOIN dreams d ON d.id = a.dream_id
  WHERE d.user_id = p_user_id 
    AND d.id = p_dream_id
    AND ao.completed_at IS NOT NULL
    AND (v_last_overdue_date IS NULL OR ao.due_on > v_last_overdue_date)
    AND a.deleted_at IS NULL
    AND act.deleted_at IS NULL
    AND act.is_active = true
    AND d.archived_at IS NULL;

  RETURN v_streak_count;
END;
$$;

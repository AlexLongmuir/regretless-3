-- Create function to calculate historical longest streak for a user
-- This calculates the maximum streak a user has ever achieved across all their dreams
-- A streak is consecutive completed actions without any overdue actions between them
-- The streak breaks when there's an overdue action between completions

CREATE OR REPLACE FUNCTION historical_longest_streak(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_longest_streak integer := 0;
  v_current_streak integer := 0;
  v_prev_completion_date date;
  v_current_completion_date date;
  v_completion_record record;
  v_has_overdue_between boolean;
BEGIN
  -- Get all completed occurrences for this user across all dreams, ordered by completion date
  -- We'll iterate through them and track streaks
  
  v_prev_completion_date := NULL;
  v_current_streak := 0;
  
  FOR v_completion_record IN
    SELECT DISTINCT
      ao.completed_at::date as completion_date,
      ao.due_on as due_date
    FROM action_occurrences ao
    JOIN actions act ON act.id = ao.action_id
    JOIN areas a ON a.id = act.area_id
    JOIN dreams d ON d.id = a.dream_id
    WHERE d.user_id = p_user_id
      AND ao.completed_at IS NOT NULL
      AND a.deleted_at IS NULL
      AND act.deleted_at IS NULL
      AND act.is_active = true
      AND d.archived_at IS NULL
    ORDER BY ao.completed_at::date ASC, ao.due_on ASC
  LOOP
    v_current_completion_date := v_completion_record.completion_date;
    
    -- If this is the first completion, start a new streak
    IF v_prev_completion_date IS NULL THEN
      v_current_streak := 1;
      v_prev_completion_date := v_current_completion_date;
    ELSE
      -- Check if there are any overdue actions between the previous completion and this one
      -- An action is overdue if it's not completed and its due_on is between prev_completion_date and current_completion_date
      -- OR if it's due before current_completion_date and not completed
      
      SELECT EXISTS(
        SELECT 1
        FROM action_occurrences ao2
        JOIN actions act2 ON act2.id = ao2.action_id
        JOIN areas a2 ON a2.id = act2.area_id
        JOIN dreams d2 ON d2.id = a2.dream_id
        WHERE d2.user_id = p_user_id
          AND ao2.completed_at IS NULL
          AND ao2.due_on IS NOT NULL
          AND ao2.due_on < v_current_completion_date
          AND ao2.due_on >= v_prev_completion_date
          AND a2.deleted_at IS NULL
          AND act2.deleted_at IS NULL
          AND act2.is_active = true
          AND d2.archived_at IS NULL
      ) INTO v_has_overdue_between;
      
      -- If there's an overdue action between completions, the streak breaks
      IF v_has_overdue_between THEN
        -- Update longest streak if current streak is longer
        IF v_current_streak > v_longest_streak THEN
          v_longest_streak := v_current_streak;
        END IF;
        -- Start a new streak
        v_current_streak := 1;
      ELSE
        -- Continue the streak
        v_current_streak := v_current_streak + 1;
      END IF;
      
      v_prev_completion_date := v_current_completion_date;
    END IF;
  END LOOP;
  
  -- Check if the final streak is the longest
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;
  
  RETURN v_longest_streak;
END;
$$;

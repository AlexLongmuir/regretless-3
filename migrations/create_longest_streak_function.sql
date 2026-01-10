-- Create function to calculate longest streak for a user
-- This calculates the maximum streak a user has ever achieved across all their dreams
-- The longest streak is the highest value that current_streak has ever reached for this user

CREATE OR REPLACE FUNCTION longest_streak(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_longest_streak integer := 0;
  v_dream_record record;
  v_current_streak integer;
BEGIN
  -- For each dream belonging to the user, calculate the current streak
  -- Then take the maximum across all dreams
  -- Note: This is a simplified version that uses current streaks
  -- For a true "historical longest", we would need to track streak history over time
  -- For MVP, we'll use the maximum current streak across all active dreams
  
  FOR v_dream_record IN
    SELECT id
    FROM dreams
    WHERE user_id = p_user_id
      AND archived_at IS NULL
  LOOP
    SELECT current_streak(p_user_id, v_dream_record.id) INTO v_current_streak;
    
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
  END LOOP;
  
  RETURN v_longest_streak;
END;
$$;

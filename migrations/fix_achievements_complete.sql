-- Complete fix for achievements: Ambiguous column error + Action streaks
-- 
-- Issue 1: "column reference 'achievement_id' is ambiguous"
-- Solution: Use temporary variables to avoid conflict between OUT parameters and column names
--
-- Issue 2: Achievements use day streaks but should use action streaks
-- Solution: Update achievement descriptions and criteria_type

-- 1. Fix the check_new_achievements function
CREATE OR REPLACE FUNCTION check_new_achievements()
RETURNS TABLE (
  unlocked_id uuid,
  unlocked_title text,
  unlocked_description text,
  unlocked_image_url text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_total_actions integer;
  v_max_streak integer;
  v_total_dreams integer;
  v_ach_id uuid;
  v_ach_title text;
  v_ach_desc text;
  v_ach_img text;
  v_new_achievement record;
BEGIN
  -- 1. Calculate Stats
  
  -- Total Actions Completed
  SELECT COUNT(*) INTO v_total_actions
  FROM action_occurrences ao
  JOIN actions a ON a.id = ao.action_id
  JOIN areas ar ON ar.id = a.area_id
  JOIN dreams d ON d.id = ar.dream_id
  WHERE d.user_id = v_user_id
    AND ao.completed_at IS NOT NULL;

  -- Max Streak (Action-based: number of consecutive completed actions)
  SELECT COALESCE(MAX(current_streak(v_user_id, d.id)), 0) INTO v_max_streak
  FROM dreams d
  WHERE d.user_id = v_user_id AND d.archived_at IS NULL;
  
  -- Total Dreams Created
  SELECT COUNT(*) INTO v_total_dreams
  FROM dreams
  WHERE user_id = v_user_id;

  -- 2. Find eligible achievements not yet unlocked
  FOR v_new_achievement IN
    SELECT 
      a.id,
      a.title,
      a.description,
      a.image_url,
      a.category,
      a.criteria_type,
      a.criteria_value
    FROM achievements a
    LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = v_user_id
    WHERE ua.id IS NULL -- Not yet unlocked
      AND (
        (a.category = 'action_count' AND v_total_actions >= a.criteria_value) OR
        (a.category = 'streak' AND v_max_streak >= a.criteria_value) OR
        (a.category = 'dream_count' AND v_total_dreams >= a.criteria_value)
      )
  LOOP
    -- Store values in temporary variables to avoid conflict with OUT parameters
    v_ach_id := v_new_achievement.id;
    v_ach_title := v_new_achievement.title;
    v_ach_desc := v_new_achievement.description;
    v_ach_img := v_new_achievement.image_url;
    
    -- Insert into user_achievements (using the variable, not the OUT parameter)
    INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, seen)
    VALUES (v_user_id, v_ach_id, now(), false)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
    
    -- Return details for the frontend (using distinct output columns)
    unlocked_id := v_ach_id;
    unlocked_title := v_ach_title;
    unlocked_description := v_ach_desc;
    unlocked_image_url := v_ach_img;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

-- 2. Update existing streak achievements to use action streaks
-- Update descriptions to reflect action-based streaks (not day-based)
UPDATE achievements
SET 
  description = CASE 
    WHEN title = 'Streak Starter' THEN 'Maintained a 3-action streak. Consistency is key.'
    WHEN title = 'Week Warrior' THEN 'Maintained a 7-action streak. Building momentum.'
    WHEN title = 'Habit Former' THEN 'Maintained a 21-action streak. New neural pathways unlocked.'
    WHEN title = 'Monthly Master' THEN 'Maintained a 30-action streak. Pure dedication.'
    WHEN title = 'Quarter Century' THEN 'Maintained a 100-action streak. You are in the 1%.'
    ELSE description
  END,
  criteria_type = CASE 
    WHEN category = 'streak' THEN 'streak_actions'
    ELSE criteria_type
  END
WHERE category = 'streak';

-- Note: If you want to update achievement titles to match your UI (e.g., "Cold Start", "No Days Off"),
-- you can run additional UPDATE statements like:
-- UPDATE achievements SET title = 'Cold Start' WHERE category = 'streak' AND criteria_value = 3;
-- UPDATE achievements SET title = 'No Days Off' WHERE category = 'streak' AND criteria_value = 7;
-- etc.

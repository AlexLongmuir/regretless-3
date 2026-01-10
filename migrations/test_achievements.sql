-- Achievement Testing Scripts
-- Run these SQL commands directly in Supabase SQL Editor to test achievement triggers
-- Replace YOUR_USER_ID with your actual user ID (you can get it from auth.users table)

-- ============================================================================
-- UTILITY: Get your user ID
-- ============================================================================
-- Run this first to find your user ID:
-- SELECT id, email FROM auth.users;

-- ============================================================================
-- UTILITY: View current stats for testing
-- ============================================================================
-- Check your current stats (replace YOUR_USER_ID):
/*
SELECT 
  (SELECT COUNT(*) FROM action_occurrences ao 
   JOIN actions a ON a.id = ao.action_id 
   JOIN areas ar ON ar.id = a.area_id 
   JOIN dreams d ON d.id = ar.dream_id 
   WHERE d.user_id = 'YOUR_USER_ID' AND ao.completed_at IS NOT NULL) as total_actions,
  (SELECT COUNT(*) FROM dreams WHERE user_id = 'YOUR_USER_ID') as total_dreams,
  (SELECT COALESCE(MAX(current_streak('YOUR_USER_ID', d.id)), 0) 
   FROM dreams d WHERE d.user_id = 'YOUR_USER_ID' AND d.archived_at IS NULL) as max_streak;
*/

-- ============================================================================
-- RESET: Clear all achievements for testing
-- ============================================================================
-- Uncomment and run to reset all achievements:
/*
DELETE FROM user_achievements WHERE user_id = 'YOUR_USER_ID';
*/

-- ============================================================================
-- TEST 1: Action Count Achievements
-- ============================================================================
-- To test action count achievements, you can:
-- Option A: Manually mark existing occurrences as completed (if you have actions set up)
/*
-- Mark 5 occurrences as completed to test "Momentum Builder" (10 actions)
UPDATE action_occurrences 
SET completed_at = NOW()
WHERE id IN (
  SELECT ao.id 
  FROM action_occurrences ao
  JOIN actions a ON a.id = ao.action_id
  JOIN areas ar ON ar.id = a.area_id
  JOIN dreams d ON d.id = ar.dream_id
  WHERE d.user_id = 'YOUR_USER_ID' 
    AND ao.completed_at IS NULL
  LIMIT 5
);
*/

-- Option B: Create test actions and occurrences, then complete them
-- (This is more complex, so Option A is preferred if you have existing data)

-- ============================================================================
-- TEST 2: Dream Count Achievements  
-- ============================================================================
-- Create test dreams to test dream count achievements
-- This will create a dream that you can then delete after testing
/*
INSERT INTO dreams (user_id, title, start_date, activated_at)
VALUES 
  ('YOUR_USER_ID', 'Test Dream 1', CURRENT_DATE, NOW()),
  ('YOUR_USER_ID', 'Test Dream 2', CURRENT_DATE, NOW()),
  ('YOUR_USER_ID', 'Test Dream 3', CURRENT_DATE, NOW()),
  ('YOUR_USER_ID', 'Test Dream 4', CURRENT_DATE, NOW()),
  ('YOUR_USER_ID', 'Test Dream 5', CURRENT_DATE, NOW());
*/

-- To clean up test dreams:
/*
DELETE FROM dreams WHERE user_id = 'YOUR_USER_ID' AND title LIKE 'Test Dream%';
*/

-- ============================================================================
-- TEST 3: Streak Achievements (More Complex)
-- ============================================================================
-- Streaks are calculated based on consecutive days with completed actions
-- The easiest way to test this is:
-- 1. Complete actions on consecutive days (manually via SQL)
-- 2. Or use the existing streak calculation function

-- To test streak achievements, complete actions on consecutive days:
/*
-- Complete an action today
UPDATE action_occurrences 
SET completed_at = NOW(), due_on = CURRENT_DATE
WHERE id IN (
  SELECT ao.id 
  FROM action_occurrences ao
  JOIN actions a ON a.id = ao.action_id
  JOIN areas ar ON ar.id = a.area_id
  JOIN dreams d ON d.id = ar.dream_id
  WHERE d.user_id = 'YOUR_USER_ID' 
    AND ao.completed_at IS NULL
    AND ao.due_on = CURRENT_DATE
  LIMIT 1
);

-- Complete actions for previous days (backfill to create streak)
-- This requires creating occurrences with due dates in the past
-- Note: This is complex and may require manual data creation
*/

-- ============================================================================
-- QUICK TEST: Force achievement check
-- ============================================================================
-- After setting up test data, you can manually trigger the achievement check
-- from the app by completing an action, or by calling:
-- SELECT * FROM check_new_achievements();

-- ============================================================================
-- VERIFY: Check unlocked achievements
-- ============================================================================
-- After testing, verify which achievements are unlocked:
/*
SELECT 
  a.title,
  a.category,
  a.criteria_value,
  ua.unlocked_at,
  ua.seen
FROM user_achievements ua
JOIN achievements a ON a.id = ua.achievement_id
WHERE ua.user_id = 'YOUR_USER_ID'
ORDER BY ua.unlocked_at DESC;
*/

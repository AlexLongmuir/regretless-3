-- Diagnostic SQL Script for Achievement Issues
-- Run this in Supabase SQL Editor to diagnose why achievements aren't unlocking
-- Replace YOUR_USER_ID with your actual user ID

-- ============================================================================
-- 1. CHECK IF check_new_achievements FUNCTION EXISTS
-- ============================================================================
SELECT 
  routine_name, 
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'check_new_achievements';

-- ============================================================================
-- 2. CHECK CURRENT USER STATS
-- ============================================================================
-- Replace YOUR_USER_ID with your actual user ID
/*
SELECT 
  'Total Actions' as metric,
  COUNT(*)::text as value
FROM action_occurrences ao
JOIN actions a ON a.id = ao.action_id
JOIN areas ar ON ar.id = a.area_id
JOIN dreams d ON d.id = ar.dream_id
WHERE d.user_id = 'YOUR_USER_ID'
  AND ao.completed_at IS NOT NULL

UNION ALL

SELECT 
  'Total Dreams' as metric,
  COUNT(*)::text as value
FROM dreams
WHERE user_id = 'YOUR_USER_ID'

UNION ALL

SELECT 
  'Max Streak (across all dreams)' as metric,
  COALESCE(MAX(current_streak('YOUR_USER_ID', d.id)), 0)::text as value
FROM dreams d
WHERE d.user_id = 'YOUR_USER_ID' AND d.archived_at IS NULL;
*/

-- ============================================================================
-- 3. CHECK ACHIEVEMENTS DEFINITIONS IN DATABASE
-- ============================================================================
-- See what achievements actually exist (especially streak ones)
/*
SELECT 
  id,
  title,
  category,
  criteria_type,
  criteria_value,
  position
FROM achievements
WHERE category = 'streak'
ORDER BY criteria_value ASC;
*/

-- ============================================================================
-- 4. CHECK WHICH ACHIEVEMENTS ARE ALREADY UNLOCKED
-- ============================================================================
-- Replace YOUR_USER_ID
/*
SELECT 
  a.title,
  a.category,
  a.criteria_type,
  a.criteria_value,
  ua.unlocked_at,
  ua.seen
FROM user_achievements ua
JOIN achievements a ON a.id = ua.achievement_id
WHERE ua.user_id = 'YOUR_USER_ID'
ORDER BY ua.unlocked_at DESC;
*/

-- ============================================================================
-- 5. TEST check_new_achievements FUNCTION MANUALLY
-- ============================================================================
-- This should return any newly unlocked achievements
-- Note: You must be authenticated as the user to run this
/*
SELECT * FROM check_new_achievements();
*/

-- ============================================================================
-- 6. CALCULATE WHAT SHOULD BE UNLOCKED (based on current stats)
-- ============================================================================
-- Replace YOUR_USER_ID
/*
WITH user_stats AS (
  SELECT 
    (SELECT COUNT(*) FROM action_occurrences ao 
     JOIN actions a ON a.id = ao.action_id 
     JOIN areas ar ON ar.id = a.area_id 
     JOIN dreams d ON d.id = ar.dream_id 
     WHERE d.user_id = 'YOUR_USER_ID' AND ao.completed_at IS NOT NULL) as total_actions,
    (SELECT COUNT(*) FROM dreams WHERE user_id = 'YOUR_USER_ID') as total_dreams,
    (SELECT COALESCE(MAX(current_streak('YOUR_USER_ID', d.id)), 0) 
     FROM dreams d WHERE d.user_id = 'YOUR_USER_ID' AND d.archived_at IS NULL) as max_streak
)
SELECT 
  a.title,
  a.category,
  a.criteria_type,
  a.criteria_value,
  CASE 
    WHEN a.category = 'action_count' THEN us.total_actions >= a.criteria_value
    WHEN a.category = 'streak' THEN us.max_streak >= a.criteria_value
    WHEN a.category = 'dream_count' THEN us.total_dreams >= a.criteria_value
    ELSE false
  END as should_be_unlocked,
  CASE 
    WHEN EXISTS (SELECT 1 FROM user_achievements ua WHERE ua.user_id = 'YOUR_USER_ID' AND ua.achievement_id = a.id)
    THEN 'UNLOCKED'
    ELSE 'LOCKED'
  END as current_status,
  us.total_actions,
  us.total_dreams,
  us.max_streak
FROM achievements a
CROSS JOIN user_stats us
LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = 'YOUR_USER_ID'
WHERE ua.id IS NULL  -- Not yet unlocked
  AND (
    (a.category = 'action_count' AND us.total_actions >= a.criteria_value) OR
    (a.category = 'streak' AND us.max_streak >= a.criteria_value) OR
    (a.category = 'dream_count' AND us.total_dreams >= a.criteria_value)
  )
ORDER BY a.category, a.criteria_value;
*/

-- Diagnostic script returning rows
-- Run this in your Supabase SQL Editor

WITH user_vars AS (
    -- User ID from your logs
    SELECT '9e0ec607-8bad-4731-84eb-958f98833131'::uuid as user_id,
    -- Dream ID from your logs
           '55eaf57e-4542-4e25-94fb-15d234ef51f2'::uuid as dream_id
),
stats AS (
    SELECT 
        -- Count total completed actions
        (SELECT COUNT(*) 
         FROM action_occurrences ao
         JOIN actions a ON a.id = ao.action_id
         JOIN areas ar ON ar.id = a.area_id
         JOIN dreams d ON d.id = ar.dream_id
         WHERE d.user_id = (SELECT user_id FROM user_vars)
           AND ao.completed_at IS NOT NULL) as total_actions,
           
        -- Calculate Max Streak (using the function)
        (SELECT COALESCE(MAX(current_streak((SELECT user_id FROM user_vars), d.id)), 0)
         FROM dreams d
         WHERE d.user_id = (SELECT user_id FROM user_vars) AND d.archived_at IS NULL) as max_streak_all_dreams,
         
        -- Calculate current dream streak specifically
        (SELECT current_streak((SELECT user_id FROM user_vars), (SELECT dream_id FROM user_vars))) as current_dream_streak,
        
        -- Count total dreams
        (SELECT COUNT(*) 
         FROM dreams 
         WHERE user_id = (SELECT user_id FROM user_vars)) as total_dreams
)
SELECT 
    'STATS' as type,
    total_actions::text as value_1,
    max_streak_all_dreams::text as value_2,
    current_dream_streak::text as value_3,
    total_dreams::text as value_4
FROM stats

UNION ALL

SELECT 
    'ACHIEVEMENT_ELIGIBILITY' as type,
    a.title,
    a.category,
    a.criteria_value::text,
    CASE 
        WHEN a.category = 'action_count' THEN (SELECT total_actions FROM stats) >= a.criteria_value
        WHEN a.category = 'streak' THEN (SELECT max_streak_all_dreams FROM stats) >= a.criteria_value
        WHEN a.category = 'dream_count' THEN (SELECT total_dreams FROM stats) >= a.criteria_value
        ELSE false
    END::text as is_eligible
FROM achievements a
LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = (SELECT user_id FROM user_vars)
WHERE ua.id IS NULL

UNION ALL

SELECT 
    'EXISTING_UNLOCK' as type,
    a.title,
    a.category,
    ua.unlocked_at::text,
    'ALREADY_OWNED'
FROM user_achievements ua
JOIN achievements a ON a.id = ua.achievement_id
WHERE ua.user_id = (SELECT user_id FROM user_vars);

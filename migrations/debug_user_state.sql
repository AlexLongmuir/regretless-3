-- Diagnostic script to check achievement state for specific user
DO $$
DECLARE
    v_user_id uuid := '9e0ec607-8bad-4731-84eb-958f98833131'; -- User ID from logs
    v_total_actions integer;
    v_max_streak integer;
    v_total_dreams integer;
    v_achievement record;
    v_existing_count integer;
BEGIN
    RAISE NOTICE '=== DIAGNOSTIC START ===';
    RAISE NOTICE 'Checking for User ID: %', v_user_id;

    -- 1. Check User Existence
    PERFORM 1 FROM auth.users WHERE id = v_user_id;
    IF NOT FOUND THEN
        RAISE NOTICE 'WARNING: User not found in auth.users (might be normal if running as different user/role)';
    END IF;

    -- 2. Calculate Stats (Copying logic from check_new_achievements)
    
    -- Total Actions
    SELECT COUNT(*) INTO v_total_actions
    FROM action_occurrences ao
    JOIN actions a ON a.id = ao.action_id
    JOIN areas ar ON ar.id = a.area_id
    JOIN dreams d ON d.id = ar.dream_id
    WHERE d.user_id = v_user_id
      AND ao.completed_at IS NOT NULL;
      
    RAISE NOTICE 'Calculated Total Actions: %', v_total_actions;

    -- Max Streak
    SELECT COALESCE(MAX(current_streak(v_user_id, d.id)), 0) INTO v_max_streak
    FROM dreams d
    WHERE d.user_id = v_user_id AND d.archived_at IS NULL;
    
    RAISE NOTICE 'Calculated Max Streak: %', v_max_streak;

    -- Total Dreams
    SELECT COUNT(*) INTO v_total_dreams
    FROM dreams
    WHERE user_id = v_user_id;
    
    RAISE NOTICE 'Calculated Total Dreams: %', v_total_dreams;

    -- 3. Check Existing Unlocked Achievements
    SELECT COUNT(*) INTO v_existing_count FROM user_achievements WHERE user_id = v_user_id;
    RAISE NOTICE 'Count of rows in user_achievements: %', v_existing_count;

    IF v_existing_count > 0 THEN
        RAISE NOTICE 'Listing existing achievements:';
        FOR v_achievement IN 
            SELECT a.title, ua.unlocked_at 
            FROM user_achievements ua 
            JOIN achievements a ON a.id = ua.achievement_id 
            WHERE ua.user_id = v_user_id
        LOOP
            RAISE NOTICE '- % (Unlocked: %)', v_achievement.title, v_achievement.unlocked_at;
        END LOOP;
    ELSE
        RAISE NOTICE 'User has NO unlocked achievements.';
    END IF;

    -- 4. Check for potential matches (Dry Run)
    RAISE NOTICE '=== ELIGIBILITY CHECK ===';
    FOR v_achievement IN
        SELECT 
          a.id,
          a.title,
          a.category,
          a.criteria_value,
          CASE 
            WHEN a.category = 'action_count' THEN v_total_actions >= a.criteria_value
            WHEN a.category = 'streak' THEN v_max_streak >= a.criteria_value
            WHEN a.category = 'dream_count' THEN v_total_dreams >= a.criteria_value
            ELSE false
          END as is_eligible
        FROM achievements a
        LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = v_user_id
        WHERE ua.id IS NULL -- Not yet unlocked
    LOOP
        IF v_achievement.is_eligible THEN
            RAISE NOTICE '✅ WOULD UNLOCK: % (Category: %, Criteria: %)', v_achievement.title, v_achievement.category, v_achievement.criteria_value;
        ELSE
            RAISE NOTICE '❌ Not Eligible: % (Category: %, Criteria: %)', v_achievement.title, v_achievement.category, v_achievement.criteria_value;
        END IF;
    END LOOP;

    RAISE NOTICE '=== DIAGNOSTIC END ===';
END $$;

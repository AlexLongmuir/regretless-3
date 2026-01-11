# Achievement Function SQL Fix

## Problem
Error: `column reference "achievement_id" is ambiguous`

## Root Cause
The `check_new_achievements()` function used `SELECT a.*` which selects all columns from the `achievements` table. This caused ambiguity because the function's return table also has a column named `achievement_id`.

## Solution
Changed from `SELECT a.*` to explicitly selecting only the columns needed:
- `a.id`
- `a.title`
- `a.description`
- `a.image_url`
- `a.category`
- `a.criteria_type`
- `a.criteria_value`

## Files Updated
1. `backend/database/achievements.sql` - Updated the function definition
2. `migrations/fix_achievement_function_ambiguous_column.sql` - Migration script to apply the fix

## Deployment Steps

1. **Run the migration SQL in Supabase:**
   - Open Supabase SQL Editor
   - Run the contents of `migrations/fix_achievement_function_ambiguous_column.sql`
   - This will update the `check_new_achievements()` function

2. **Test the fix:**
   - In the app, go to Account Page
   - Tap "Check Achievements (Global)" button
   - You should no longer get the ambiguous column error

3. **Verify achievements unlock:**
   - If you have an 18 action streak, you should unlock the "Streak Starter" achievement (3 actions)
   - If you've completed dreams, you should unlock "Dreamer" (1 dream)
   - Completed actions should unlock "First Step" (1 action), "Momentum Builder" (10 actions), etc.

## Additional Notes

**Achievement Mismatch:**
- You mentioned seeing "Cold Start" and "No Days Off" in the UI
- The seed data has "Streak Starter" and "Week Warrior"
- This suggests your database has different achievement definitions than the seed file
- You may need to check what achievements actually exist in your database

**To Check Your Actual Achievements:**
```sql
SELECT id, title, category, criteria_type, criteria_value
FROM achievements
WHERE category = 'streak'
ORDER BY criteria_value ASC;
```

**To Check Your Current Stats:**
```sql
SELECT 
  (SELECT COUNT(*) FROM action_occurrences ao 
   JOIN actions a ON a.id = ao.action_id 
   JOIN areas ar ON ar.id = a.area_id 
   JOIN dreams d ON d.id = ar.dream_id 
   WHERE d.user_id = auth.uid() AND ao.completed_at IS NOT NULL) as total_actions,
  (SELECT COUNT(*) FROM dreams WHERE user_id = auth.uid()) as total_dreams,
  (SELECT COALESCE(MAX(current_streak(auth.uid(), d.id)), 0) 
   FROM dreams d WHERE d.user_id = auth.uid() AND d.archived_at IS NULL) as max_streak;
```

**To See What Should Be Unlocked:**
After running the fix, you can manually test:
```sql
SELECT * FROM check_new_achievements();
```

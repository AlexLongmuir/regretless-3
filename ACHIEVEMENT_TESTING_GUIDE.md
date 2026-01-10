# Achievement Testing Guide

This guide explains the easiest ways to test achievement triggers for all achievement types.

## Quick Testing Methods

### Method 1: Using Account Page (Easiest)

1. **Navigate to Account Page** (requires admin user IDs: `9e0ec607-8bad-4731-84eb-958f98833131` or `0952cd47-5227-4f9f-98b3-1e89b2296157`)

2. **Use the test buttons:**
   - **"Check Achievements (Global)"** - Triggers `checkAchievements()` which will:
     - Query the database for new achievements based on current stats
     - If any are found, the global `AchievementPopup` will automatically show
     - This tests the full flow including the popup display

   - **"Force Achievement Modal"** - Shows any already-unlocked achievement (for UI testing)

### Method 2: SQL Scripts (Most Flexible)

Use the SQL scripts in `migrations/test_achievements.sql` to:

1. **Reset achievements** - Delete all your achievements to start fresh
2. **Create test data** - Add test dreams or mark actions as completed
3. **Check stats** - View your current action count, dream count, and streak

**Example workflow for testing Action Count achievements:**
```sql
-- 1. Reset achievements
DELETE FROM user_achievements WHERE user_id = 'YOUR_USER_ID';

-- 2. Mark 10 actions as completed (to unlock "Momentum Builder")
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
  LIMIT 10
);

-- 3. Then in the app, tap "Check Achievements (Global)" or complete an action
```

### Method 3: Natural Testing (Most Realistic)

1. **Action Count Achievements:**
   - Create actions in your dreams
   - Complete them normally through the app
   - Achievement popup should appear automatically when thresholds are met

2. **Dream Count Achievements:**
   - Create new dreams through the normal flow
   - Achievement popup should appear when you hit 1, 5, or 10 dreams

3. **Streak Achievements:**
   - Complete at least one action per day for consecutive days
   - Achievement popup should appear when you hit streak milestones (3, 7, 21, 30, 100 days)

## Testing Checklist

### ✅ Action Count Achievements
- [ ] Complete 1 action → "First Step" (1 action)
- [ ] Complete 10 actions → "Momentum Builder" (10 actions)
- [ ] Complete 50 actions → "Action Hero" (50 actions)
- [ ] Complete 100 actions → "Centurion" (100 actions)
- [ ] Complete 250 actions → "Relentless" (250 actions)

### ✅ Dream Count Achievements
- [ ] Create 1 dream → "Dreamer" (1 dream)
- [ ] Create 5 dreams → "Visionary" (5 dreams)
- [ ] Create 10 dreams → "Architect" (10 dreams)

### ✅ Streak Achievements
- [ ] 3 consecutive days → "Streak Starter" (3-day streak)
- [ ] 7 consecutive days → "Week Warrior" (7-day streak)
- [ ] 21 consecutive days → "Habit Former" (21-day streak)
- [ ] 30 consecutive days → "Monthly Master" (30-day streak)
- [ ] 100 consecutive days → "Quarter Century" (100-day streak)

## Verification Steps

After triggering an achievement:

1. **Verify the popup appears** - `AchievementPopup` should show `AchievementUnlockedSheet` automatically
2. **Verify it's on top** - The modal should appear over any current screen
3. **Verify close works** - Tapping X should close and return to the previous screen
4. **Verify "View Achievements" works** - Should open the full achievements gallery
5. **Verify database** - Check `user_achievements` table to confirm achievement was unlocked

## Quick SQL Queries for Testing

```sql
-- Get your user ID
SELECT id, email FROM auth.users;

-- View current stats
SELECT 
  (SELECT COUNT(*) FROM action_occurrences ao 
   JOIN actions a ON a.id = ao.action_id 
   JOIN areas ar ON ar.id = a.area_id 
   JOIN dreams d ON d.id = ar.dream_id 
   WHERE d.user_id = 'YOUR_USER_ID' AND ao.completed_at IS NOT NULL) as total_actions,
  (SELECT COUNT(*) FROM dreams WHERE user_id = 'YOUR_USER_ID') as total_dreams,
  (SELECT COALESCE(MAX(current_streak('YOUR_USER_ID', d.id)), 0) 
   FROM dreams d WHERE d.user_id = 'YOUR_USER_ID' AND d.archived_at IS NULL) as max_streak;

-- View unlocked achievements
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

-- Reset all achievements
DELETE FROM user_achievements WHERE user_id = 'YOUR_USER_ID';
```

## Troubleshooting

**Achievement popup doesn't appear:**
- Check that `checkAchievements()` was called (either manually via Account Page or automatically after completing an action)
- Verify the achievement was actually unlocked in the database
- Check console logs for errors

**Achievement unlocked but popup doesn't show:**
- Verify `AchievementPopup` component is rendered in `App.tsx`
- Check that `unlockedAchievements` state in `DataContext` is being updated
- Ensure the modal's `visible` prop is correctly bound to the state

**Multiple achievements unlocked at once:**
- The carousel in `AchievementUnlockedSheet` should handle multiple achievements
- Each achievement should be swipeable in the carousel

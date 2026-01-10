# Achievement System Fix Summary

## Problem
User has a streak of 13 actions but achievements aren't unlocking. The achievement checking system wasn't working.

## Root Causes Found

### 1. **Frontend Code Missing** ✅ FIXED
- The `checkAchievements()` function was never implemented in `DataContext.tsx`
- The `unlockedAchievements` state was missing
- Achievement checking wasn't triggered after completing actions

**Fix Applied:**
- Added `checkAchievements()` function with comprehensive logging
- Added `unlockedAchievements` to State type
- Added `clearUnlockedAchievements()` function
- Wired `checkAchievements()` to be called after `completeOccurrence()`
- Added logging in both `DataContext.tsx` and `backend-bridge.ts`

### 2. **Backend Function May Not Exist** ⚠️ NEEDS VERIFICATION
- The `check_new_achievements()` PostgreSQL function may not be deployed to your database
- This would cause the RPC call to fail with an error like "function does not exist"

**Action Required:**
- Run the diagnostic SQL script (`migrations/diagnose_achievements.sql`) to check if the function exists
- If it doesn't exist, deploy the SQL from `backend/database/achievements.sql`

### 3. **Achievement Definitions May Not Match** ⚠️ NEEDS VERIFICATION
- Your UI shows "Cold Start" (3 actions) and "No Days Off" (7 actions)
- The seed data in `achievements.sql` has "Streak Starter" and "Week Warrior"
- This suggests your database may have different achievement definitions

**Action Required:**
- Check what achievements actually exist in your database using the diagnostic script
- Verify the category and criteria_type match what the function expects

## Testing Steps

1. **Check Backend Function Exists:**
   ```sql
   SELECT routine_name, routine_type
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
     AND routine_name = 'check_new_achievements';
   ```

2. **Test Achievement Check Manually:**
   - In the app, go to Account Page
   - Tap "Check Achievements (Global)" button
   - Check the logs at `.cursor/debug.log` to see what happens

3. **View Current Stats:**
   - Run the diagnostic SQL to see your current action count, streak, and dream count
   - Compare against achievement criteria

4. **Verify Function Returns Results:**
   ```sql
   SELECT * FROM check_new_achievements();
   ```
   (Must be authenticated as your user)

## Next Steps

1. **Deploy Backend Changes** (if not already done):
   - Run `backend/database/achievements.sql` in Supabase SQL Editor
   - This creates the `check_new_achievements()` function and achievement seed data

2. **Run Diagnostic Script:**
   - Execute `migrations/diagnose_achievements.sql` to verify:
     - Function exists
     - Your current stats
     - Which achievements should be unlocked
     - Which achievements are actually unlocked

3. **Test with Logging:**
   - Use the "Check Achievements (Global)" button in Account Page
   - Review logs at `.cursor/debug.log` to see:
     - If function is called
     - What error (if any) occurs
     - What response is received

## Expected Behavior After Fix

1. When you complete an action occurrence:
   - `completeOccurrence()` is called
   - After successful completion, `checkAchievements()` is automatically called
   - If achievements are unlocked, they're added to `unlockedAchievements` state
   - `AchievementPopup` component detects the new achievements and shows the modal

2. When you manually trigger check:
   - Tap "Check Achievements (Global)" button
   - Same flow as above

## Debug Log Locations

- Frontend logs: `.cursor/debug.log` (NDJSON format)
- Check logs after running the test to see:
  - Hypothesis A: Function entry
  - Hypothesis B: API call made
  - Hypothesis C: Response received
  - Hypothesis D: Achievements unlocked
  - Hypothesis E: Function error
  - Hypothesis F: No achievements found
  - Hypothesis G: Exception caught
  - Hypothesis H: RPC call initiated
  - Hypothesis I: RPC response received
  - Hypothesis J: RPC error details

## SQL Files to Deploy

If the backend function doesn't exist, run these in order:

1. `backend/database/achievements.sql` - Creates tables, seed data, and function
2. `migrations/create_longest_streak_function.sql` - Helper function (if needed)
3. `migrations/update_streak_function.sql` - Updates streak calculation (if needed)

# Notification Types in Dreamer App

This document lists all notification types that can be sent to users in the Dreamer app.

## Notification Types

### 1. **Daily Reminder Notifications** 📅
- **Trigger**: Scheduled daily at user's configured reminder time (default: 9:00 AM)
- **Method**: `scheduleDailyReminder(userId)`
- **Settings Control**: `daily_reminders` and `reminder_time` in notification preferences
- **Content**: 
  - Title: `🌟 Keep Going!`
  - Body: Dynamically generated message based on:
    - If user has a streak > 0: Random streak motivation message with percentile ranking
    - If no streak: Random overdue task motivation message
- **Smart Messaging**: 
  - Pulls current streak and overdue count from database
  - Messages are personalized based on user progress
  - Example streak message: "You're on a 5 action streak! You're in the top 60% of users. Keep it up! 🚀"
  - Example overdue message: "You have 3 overdue tasks. Don't give up now - every step counts! 💪"
- **Streak Definition**: 
  - **Action Streak**: Counts consecutive completed actions without an overdue task breaking the chain.
  - **Logic**: Streaks are not broken by days without tasks. They are only broken when a task becomes overdue (missed deadline).
- **Scheduling**: Repeats daily using calendar trigger
- **Status**: ✅ Active (local notifications only)

### 2. **Overdue Task Alerts** ⏰
- **Trigger**: Manually called via `sendOverdueAlert(userId, overdueCount)`
- **Settings Control**: `overdue_alerts` in notification preferences
- **Content**:
  - Title: `⏰ Overdue Tasks`
  - Body: `You have {overdueCount} overdue task{s}. Time to catch up!`
- **Delivery**: Immediate (trigger: null)
- **Status**: ⚠️ Code exists but not automatically triggered (needs implementation)

### 3. **Achievement Unlocked Notifications** 🎉
- **Trigger**: Manually called via `sendAchievementNotification(userId, achievement)`
- **Settings Control**: `achievement_notifications` in notification preferences
- **Content**:
  - Title: `🎉 Achievement Unlocked!`
  - Body: Custom achievement message (passed as parameter)
- **Delivery**: Immediate (trigger: null)
- **Status**: ⚠️ Code exists but not automatically triggered (needs implementation)

### 4. **Trial Expiration Reminders** ⏰
- **Trigger**: Scheduled when trial is created/activated via `scheduleTrialReminder(userId, trialExpiresAt, hoursBeforeExpiration)`
- **Method**: `scheduleTrialReminder()` or `scheduleMultipleTrialReminders()`
- **Default Timing**: 24 hours before expiration (configurable)
- **Multiple Reminders**: Can schedule multiple reminders (e.g., 48h, 24h, 2h before expiration)
- **Content**:
  - Title: `⏰ Your Free Trial Ends Soon`
  - Body: `Your free trial ends in {hoursBeforeExpiration} hours. Continue your journey with a full subscription!`
- **Metadata**: Includes `type: 'trial_reminder'`, `user_id`, and `trial_expires_at` in notification data
- **Scheduling**: One-time notification at calculated date
- **Status**: ✅ Active (used in onboarding/trial continuation flow)

## Notification Settings

All notifications respect user preferences stored in `notification_preferences` table:

- `push_enabled` - Master switch for all notifications (default: true)
- `daily_reminders` - Enable/disable daily reminders (default: true)
- `reminder_time` - Time to send daily reminders (default: '09:00:00')
- `overdue_alerts` - Enable/disable overdue task alerts (default: true)
- `achievement_notifications` - Enable/disable achievement notifications (default: true)

## Notification Channels (Android)

Two notification channels are configured:

1. **daily-reminders** - For daily reminder notifications
   - High importance
   - Vibration pattern: [0, 250, 250, 250]
   - Light color: #FF231F7C

2. **overdue-alerts** - For overdue task and achievement notifications
   - High importance
   - Vibration pattern: [0, 250, 250, 250]
   - Light color: #FF231F7C

## Implementation Status

### ✅ Fully Implemented:
- Daily reminder notifications (local scheduling)
- Trial expiration reminders

### ⚠️ Partially Implemented (code exists but not automatically triggered):
- Overdue task alerts - Requires calling `sendOverdueAlert()` when overdue tasks are detected
- Achievement notifications - Requires calling `sendAchievementNotification()` when achievements are unlocked

### ❌ Not Implemented:
- Backend push notifications via Expo Push Notification Service
- Push token registration and storage
- Server-side notification sending (subscription lifecycle events have TODOs)

## Notes

- All notifications are currently **local notifications** (scheduled on device)
- No backend push notification infrastructure is implemented
- Backend cron jobs (`subscription-lifecycle`, `check-expired-trials`) have TODOs for sending notifications but don't actually send them
- Daily reminders are only scheduled when notification preferences are updated, not on app start/login (this may be why they weren't working initially)

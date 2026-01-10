import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import { supabaseClient } from './supabaseClient';
import type { NotificationPreferences } from '../backend/database/types';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:30',message:'initialize() called',data:{isInitialized:this.isInitialized},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (this.isInitialized) return;

    try {
      // Configure notification channels for Android (no permission request)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('daily-reminders', {
          name: 'Daily Reminders',
          description: 'Daily motivation and progress reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        await Notifications.setNotificationChannelAsync('overdue-alerts', {
          name: 'Overdue Alerts',
          description: 'Notifications for overdue tasks',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      this.isInitialized = true;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:54',message:'initialize() completed successfully',data:{platform:Platform.OS},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.log('NotificationService initialized successfully');
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:57',message:'initialize() failed',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.error('Failed to initialize NotificationService:', error);
    }
  }

  async getDevicePermissionStatus(): Promise<Notifications.NotificationPermissionsStatus> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:60',message:'getDevicePermissionStatus() called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
      const status = await Notifications.getPermissionsAsync();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:62',message:'getDevicePermissionStatus() result',data:{status:status.status,granted:status.granted,canAskAgain:status.canAskAgain},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return status;
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:64',message:'getDevicePermissionStatus() error',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.error('Failed to get notification permission status:', error);
      // Return a default denied status on error
      return {
        status: 'denied',
        canAskAgain: false,
        granted: false,
      };
    }
  }

  async canRequestPermissions(): Promise<boolean> {
    try {
      const permissions = await this.getDevicePermissionStatus();
      // Can request if status is undetermined, or if denied but canAskAgain is true
      return (
        permissions.status === 'undetermined' ||
        (permissions.status === 'denied' && permissions.canAskAgain)
      );
    } catch (error) {
      console.error('Failed to check if permissions can be requested:', error);
      return false;
    }
  }

  async openDeviceSettings(): Promise<void> {
    try {
      // Try to use Linking.openSettings() if available (Android)
      if (Linking.openSettings) {
        await Linking.openSettings();
        return;
      }
      
      // Fallback for iOS: try app-settings: URL scheme
      const settingsUrl = Platform.OS === 'ios' ? 'app-settings:' : 'android.settings.APPLICATION_DETAILS_SETTINGS';
      const supported = await Linking.canOpenURL(settingsUrl);
      if (supported) {
        await Linking.openURL(settingsUrl);
      } else {
        console.warn('Unable to open device settings - please enable notifications manually in your device settings');
      }
    } catch (error) {
      console.error('Failed to open device settings:', error);
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      console.log('Notification permissions granted');
      return true;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:132',message:'getNotificationPreferences() called',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    try {
      console.log('Fetching notification preferences for user:', userId);
      const { data, error } = await supabaseClient
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows

      if (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:141',message:'getNotificationPreferences() error',data:{userId,error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        console.error('Error fetching notification preferences:', error);
        return null;
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:146',message:'getNotificationPreferences() result',data:{userId,hasPreferences:!!data,preferences:data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.log('Notification preferences fetched:', data);
      return data;
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:149',message:'getNotificationPreferences() exception',data:{userId,error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error('Error fetching notification preferences:', error);
      return null;
    }
  }

  async updateNotificationPreferences(
    userId: string, 
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    try {
      console.log('Updating notification preferences for user:', userId, 'with:', preferences);
      
      // First, check if preferences exist
      const { data: existing } = await supabaseClient
        .from('notification_preferences')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabaseClient
          .from('notification_preferences')
          .update({
            ...preferences,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (error) {
          console.error('Error updating notification preferences:', error);
          return false;
        }
      } else {
        // Insert new record
        const { error } = await supabaseClient
          .from('notification_preferences')
          .insert({
            user_id: userId,
            push_enabled: true,
            daily_reminders: true,
            reminder_time: '09:00:00',
            overdue_alerts: true,
            achievement_notifications: true,
            ...preferences,
            updated_at: new Date().toISOString(),
          });

        if (error) {
          console.error('Error inserting notification preferences:', error);
          return false;
        }
      }

      console.log('Notification preferences updated successfully');

      // Reschedule notifications if preferences changed
      if (preferences.daily_reminders !== undefined || preferences.reminder_time) {
        await this.scheduleDailyReminder(userId);
      }

      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }

  async scheduleDailyReminder(userId: string): Promise<void> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:217',message:'scheduleDailyReminder() called',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      // Cancel existing daily reminders
      await Notifications.cancelAllScheduledNotificationsAsync();

      const preferences = await this.getNotificationPreferences(userId);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:223',message:'scheduleDailyReminder() preferences check',data:{userId,hasPreferences:!!preferences,dailyReminders:preferences?.daily_reminders},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      if (!preferences || !preferences.daily_reminders) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:224',message:'scheduleDailyReminder() early return',data:{userId,reason:!preferences?'no_preferences':'daily_reminders_disabled'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return;
      }

      // Check permissions before scheduling
      const permissionStatus = await this.getDevicePermissionStatus();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:232',message:'scheduleDailyReminder() permission check',data:{userId,permissionStatus:permissionStatus.status,granted:permissionStatus.granted},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (permissionStatus.status !== 'granted') {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:234',message:'scheduleDailyReminder() permission denied',data:{userId,permissionStatus:permissionStatus.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return;
      }

      // Parse reminder time
      const [hours, minutes] = preferences.reminder_time.split(':').map(Number);
      
      // Get user's current streak and overdue count for smart messaging
      const { data: userStats } = await supabaseClient
        .from('v_overdue_counts')
        .select('dream_id, overdue_count')
        .eq('user_id', userId);

      const { data: streakData } = await supabaseClient
        .rpc('current_streak', { 
          p_user_id: userId, 
          p_dream_id: userStats?.[0]?.dream_id || null 
        });

      const totalOverdue = userStats?.reduce((sum, stat) => sum + stat.overdue_count, 0) || 0;
      const currentStreak = streakData || 0;

      // Generate smart message
      const message = this.generateSmartMessage(currentStreak, totalOverdue);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:248',message:'scheduleDailyReminder() before scheduleNotificationAsync',data:{userId,hours,minutes,message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      // Schedule daily notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌟 Keep Going!',
          body: message,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:264',message:'scheduleDailyReminder() scheduled successfully',data:{userId,notificationId,reminderTime:preferences.reminder_time},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.log('Daily reminder scheduled for', preferences.reminder_time);
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:266',message:'scheduleDailyReminder() error',data:{userId,error:error instanceof Error?error.message:String(error),stack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error('Error scheduling daily reminder:', error);
    }
  }

  private generateSmartMessage(streak: number, overdueCount: number): string {
    const streakMessages = [
      `You're on a ${streak} day streak! You're in the top ${this.getTopPercentage(streak)}% of users. Keep it up! 🚀`,
      `Amazing! ${streak} days strong! You're outperforming ${this.getTopPercentage(streak)}% of users. Don't stop now! 💪`,
      `Incredible streak of ${streak} days! You're in the top ${this.getTopPercentage(streak)}% - you're unstoppable! ⭐`,
      `${streak} days and counting! You're crushing it - top ${this.getTopPercentage(streak)}% of users. Keep the momentum! 🔥`,
      `Your ${streak} day streak is inspiring! Top ${this.getTopPercentage(streak)}% performance. You've got this! 🌟`,
      `Outstanding ${streak} day streak! You're in the top ${this.getTopPercentage(streak)}% of users. Keep pushing forward! 🎯`,
      `${streak} days of dedication! Top ${this.getTopPercentage(streak)}% performance. You're on fire! 🔥`,
      `Phenomenal ${streak} day streak! You're outperforming ${this.getTopPercentage(streak)}% of users. Stay strong! 💎`,
      `Your ${streak} day streak is legendary! Top ${this.getTopPercentage(streak)}% of users. Keep the magic going! ✨`,
      `${streak} days strong! You're in the top ${this.getTopPercentage(streak)}% of users. You're absolutely crushing it! 🏆`,
    ];

    const overdueMessages = [
      `You have ${overdueCount} overdue task${overdueCount > 1 ? 's' : ''}. Don't give up now - every step counts! 💪`,
      `${overdueCount} task${overdueCount > 1 ? 's' : ''} waiting for you. You've got this - let's tackle them together! 🚀`,
      `Don't let ${overdueCount} overdue task${overdueCount > 1 ? 's' : ''} hold you back. You're stronger than you think! ⭐`,
      `${overdueCount} task${overdueCount > 1 ? 's' : ''} to catch up on. Remember why you started - you've got this! 🌟`,
      `Your ${overdueCount} overdue task${overdueCount > 1 ? 's' : ''} are just opportunities in disguise. Let's do this! 🔥`,
      `Don't give up! ${overdueCount} task${overdueCount > 1 ? 's' : ''} waiting for you. Every comeback starts with one step! 💎`,
      `${overdueCount} task${overdueCount > 1 ? 's' : ''} overdue? Perfect time for a comeback! You're capable of amazing things! ✨`,
      `Your ${overdueCount} overdue task${overdueCount > 1 ? 's' : ''} are just challenges to overcome. Rise to the occasion! 🎯`,
      `Don't let ${overdueCount} overdue task${overdueCount > 1 ? 's' : ''} define you. You're so much more than that! 🏆`,
      `${overdueCount} task${overdueCount > 1 ? 's' : ''} waiting? Time to show them what you're made of! Let's go! 💪`,
    ];

    if (streak > 0) {
      // Use streak messages
      const randomIndex = Math.floor(Math.random() * streakMessages.length);
      return streakMessages[randomIndex];
    } else {
      // Use overdue messages
      const randomIndex = Math.floor(Math.random() * overdueMessages.length);
      return overdueMessages[randomIndex];
    }
  }

  private getTopPercentage(streak: number): number {
    // Exponential decay: higher streaks = lower percentage (more exclusive)
    // Formula: 100 * e^(-streak/10) with minimum of 1%
    const percentage = Math.max(1, Math.round(100 * Math.exp(-streak / 10)));
    return percentage;
  }

  async sendOverdueAlert(userId: string, overdueCount: number): Promise<void> {
    try {
      const preferences = await this.getNotificationPreferences(userId);
      if (!preferences || !preferences.overdue_alerts) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Overdue Tasks',
          body: `You have ${overdueCount} overdue task${overdueCount > 1 ? 's' : ''}. Time to catch up!`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending overdue alert:', error);
    }
  }

  async sendAchievementNotification(userId: string, achievement: string): Promise<void> {
    try {
      const preferences = await this.getNotificationPreferences(userId);
      if (!preferences || !preferences.achievement_notifications) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Achievement Unlocked!',
          body: achievement,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending achievement notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Schedule a trial expiration reminder notification
   * @param userId - The user ID
   * @param trialExpiresAt - ISO string of when the trial expires
   * @param reminderHoursBeforeExpiration - How many hours before expiration to send reminder (default: 24)
   */
  async scheduleTrialReminder(
    userId: string, 
    trialExpiresAt: string, 
    reminderHoursBeforeExpiration: number = 24
  ): Promise<void> {
    try {
      const expirationDate = new Date(trialExpiresAt);
      const reminderDate = new Date(expirationDate.getTime() - (reminderHoursBeforeExpiration * 60 * 60 * 1000));
      
      // Don't schedule if reminder time has already passed
      if (reminderDate <= new Date()) {
        console.log('Trial reminder time has already passed, not scheduling');
        return;
      }

      // Cancel any existing trial reminders for this user
      await this.cancelTrialReminders(userId);

      // Schedule the trial reminder notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Your Free Trial Ends Soon',
          body: `Your free trial ends in ${reminderHoursBeforeExpiration} hours. Continue your journey with a full subscription!`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            type: 'trial_reminder',
            user_id: userId,
            trial_expires_at: trialExpiresAt,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
        },
      });

      console.log(`Trial reminder scheduled for ${reminderDate.toISOString()} (${reminderHoursBeforeExpiration}h before expiration)`);
    } catch (error) {
      console.error('Error scheduling trial reminder:', error);
    }
  }

  /**
   * Cancel trial reminder notifications for a specific user
   */
  async cancelTrialReminders(userId: string): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.type === 'trial_reminder' && 
            notification.content.data?.user_id === userId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          console.log(`Cancelled trial reminder notification ${notification.identifier}`);
        }
      }
    } catch (error) {
      console.error('Error cancelling trial reminders:', error);
    }
  }

  /**
   * Schedule multiple trial reminders at different intervals
   * @param userId - The user ID
   * @param trialExpiresAt - ISO string of when the trial expires
   * @param reminderHours - Array of hours before expiration to send reminders (e.g., [48, 24, 2])
   */
  async scheduleMultipleTrialReminders(
    userId: string, 
    trialExpiresAt: string, 
    reminderHours: number[] = [48, 24, 2]
  ): Promise<void> {
    try {
      // Cancel any existing trial reminders first
      await this.cancelTrialReminders(userId);

      // Schedule each reminder
      for (const hours of reminderHours) {
        await this.scheduleTrialReminder(userId, trialExpiresAt, hours);
      }

      console.log(`Scheduled ${reminderHours.length} trial reminders for user ${userId}`);
    } catch (error) {
      console.error('Error scheduling multiple trial reminders:', error);
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

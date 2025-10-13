import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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
      console.log('NotificationService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
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
    try {
      console.log('Fetching notification preferences for user:', userId);
      const { data, error } = await supabaseClient
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows

      if (error) {
        console.error('Error fetching notification preferences:', error);
        return null;
      }

      console.log('Notification preferences fetched:', data);
      return data;
    } catch (error) {
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
    try {
      // Cancel existing daily reminders
      await Notifications.cancelAllScheduledNotificationsAsync();

      const preferences = await this.getNotificationPreferences(userId);
      if (!preferences || !preferences.daily_reminders) {
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

      // Schedule daily notification
      await Notifications.scheduleNotificationAsync({
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

      console.log('Daily reminder scheduled for', preferences.reminder_time);
    } catch (error) {
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

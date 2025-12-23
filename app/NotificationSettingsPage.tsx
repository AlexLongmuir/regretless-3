import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { useAuthContext } from '../contexts/AuthContext';
import { ListRow } from '../components/ListRow';
import { IconButton } from '../components/IconButton';
import { notificationService } from '../lib/NotificationService';
import type { NotificationPreferences } from '../backend/database/types';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

const NotificationSettingsPage = ({ navigation }: { navigation: any }) => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Load preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (user?.id) {
        setLoading(true);
        const data = await notificationService.getNotificationPreferences(user.id);
        setPreferences(data);
        setLoading(false);
      }
    };
    loadPreferences();
  }, [user?.id]);

  const updatePreference = async (updates: Partial<NotificationPreferences>) => {
    if (!user?.id || !preferences) return;

    // Optimistic update
    const previousPreferences = { ...preferences };
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);

    const success = await notificationService.updateNotificationPreferences(user.id, updates);
    
    if (!success) {
      // Revert on failure
      setPreferences(previousPreferences);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}:00`;
      
      updatePreference({ reminder_time: timeString });
    }
  };

  const getReminderDate = () => {
    if (!preferences?.reminder_time) return new Date();
    
    const [hours, minutes] = preferences.reminder_time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '9:00 AM';
    
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="chevron_left"
          onPress={() => navigation.goBack()}
          variant="secondary"
          size="md"
        />
        <View style={styles.headerSpacer} />
      </View>
      
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Enable Notifications - Separate Card */}
        <View style={styles.section}>
          <View style={styles.card}>
            <ListRow
              title="Enable Notifications"
              rightElement="toggle"
              toggleValue={preferences?.push_enabled ?? true}
              onToggleChange={(value) => updatePreference({ push_enabled: value })}
              isFirst={true}
              isLast={true}
            />
          </View>
        </View>

        {/* Daily Motivation Reminders Section - Separate Card */}
        {preferences?.push_enabled && (
          <View style={styles.section}>
            <View style={styles.card}>
              <ListRow
                title="Daily Motivation Reminders"
                rightElement="toggle"
                toggleValue={preferences?.daily_reminders ?? true}
                onToggleChange={(value) => updatePreference({ daily_reminders: value })}
                isFirst={true}
                isLast={!preferences?.daily_reminders}
              />
              
              {preferences?.daily_reminders && (
                <View>
                  <ListRow
                    title="Reminder Time"
                    onPress={() => setShowTimePicker(true)}
                    rightElement={
                       Platform.OS === 'ios' ? (
                        <DateTimePicker
                          value={getReminderDate()}
                          mode="time"
                          display="compact"
                          onChange={handleTimeChange}
                          style={{ width: 100 }}
                        />
                      ) : 'chevron'
                    }
                    isLast={true}
                  />
                  {Platform.OS === 'android' && showTimePicker && (
                    <DateTimePicker
                      value={getReminderDate()}
                      mode="time"
                      display="default"
                      onChange={handleTimeChange}
                    />
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Overdue and Achievement Alerts - Separate Card */}
        {preferences?.push_enabled && (
          <View style={styles.section}>
            <View style={styles.card}>
              <ListRow
                title="Overdue Task Alerts"
                rightElement="toggle"
                toggleValue={preferences?.overdue_alerts ?? true}
                onToggleChange={(value) => updatePreference({ overdue_alerts: value })}
                isFirst={true}
              />

              <ListRow
                title="Achievement Alerts"
                rightElement="toggle"
                toggleValue={preferences?.achievement_notifications ?? true}
                onToggleChange={(value) => updatePreference({ achievement_notifications: value })}
                isLast={true}
              />
            </View>
          </View>
        )}

        <Text style={styles.note}>
          We only send notifications that matter to your progress. You can change these settings at any time.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
  },
  header: {
    backgroundColor: theme.colors.pageBackground,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as IconButton to center the title
  },
  titleContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 40,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.grey[500],
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  note: {
    fontSize: 13,
    color: theme.colors.grey[500],
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
    lineHeight: 18,
  },
});

export default NotificationSettingsPage;


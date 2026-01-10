import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { useAuthContext } from '../contexts/AuthContext';
import { ListRow } from '../components/ListRow';
import { IconButton } from '../components/IconButton';
import { notificationService } from '../lib/NotificationService';
import type { NotificationPreferences } from '../backend/database/types';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.page,
  },
  header: {
    backgroundColor: theme.colors.background.page,
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
    color: theme.colors.text.primary,
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
    color: theme.colors.text.tertiary,
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
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
    lineHeight: 18,
  },
});

const NotificationSettingsPage = ({ navigation }: { navigation: any }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [devicePermissionGranted, setDevicePermissionGranted] = useState<boolean | null>(null);

  // Load preferences and check device permissions
  useEffect(() => {
    const loadPreferences = async () => {
      if (user?.id) {
        setLoading(true);
        const data = await notificationService.getNotificationPreferences(user.id);
        
        // Check device permission status
        const permissionStatus = await notificationService.getDevicePermissionStatus();
        const isGranted = permissionStatus.status === 'granted';
        setDevicePermissionGranted(isGranted);
        
        // If device permissions are denied, override push_enabled to false in UI
        // (even if database says true, we can't actually send notifications)
        if (data && !isGranted) {
          setPreferences({ ...data, push_enabled: false });
        } else {
          setPreferences(data);
        }
        
        setLoading(false);
      }
    };
    loadPreferences();
  }, [user?.id]);

  const updatePreference = async (updates: Partial<NotificationPreferences>) => {
    if (!user?.id || !preferences) return;

    // If enabling notifications, check and request device permissions first
    if (updates.push_enabled === true) {
      const permissionStatus = await notificationService.getDevicePermissionStatus();
      
      // If already granted, proceed with update
      if (permissionStatus.status === 'granted') {
        const previousPreferences = { ...preferences };
        const newPreferences = { ...preferences, ...updates };
        setPreferences(newPreferences);

        const success = await notificationService.updateNotificationPreferences(user.id, updates);
        
        if (!success) {
          setPreferences(previousPreferences);
          Alert.alert('Error', 'Failed to update notification settings');
        } else {
          setDevicePermissionGranted(true);
        }
        return;
      }
      
      // If permissions can be requested, request them
      const canRequest = await notificationService.canRequestPermissions();
      if (canRequest) {
        const granted = await notificationService.requestPermissions();
        if (granted) {
          const previousPreferences = { ...preferences };
          const newPreferences = { ...preferences, ...updates };
          setPreferences(newPreferences);

          const success = await notificationService.updateNotificationPreferences(user.id, updates);
          
          if (!success) {
            setPreferences(previousPreferences);
            Alert.alert('Error', 'Failed to update notification settings');
          } else {
            setDevicePermissionGranted(true);
          }
        } else {
          // Permission request denied, show alert to open settings
          Alert.alert(
            'Notifications Disabled',
            'Please enable notifications in your device settings to receive reminders.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Open Settings',
                onPress: async () => {
                  await notificationService.openDeviceSettings();
                },
              },
            ]
          );
        }
        return;
      }
      
      // Permissions are permanently denied, show alert to open settings
      Alert.alert(
        'Notifications Disabled',
        'Notifications are disabled for this app. Please enable them in your device settings.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Open Settings',
            onPress: async () => {
              await notificationService.openDeviceSettings();
            },
          },
        ]
      );
      return;
    }

    // For disabling notifications or other updates, no permission check needed
    const previousPreferences = { ...preferences };
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);

    const success = await notificationService.updateNotificationPreferences(user.id, updates);
    
    if (!success) {
      // Revert on failure
      setPreferences(previousPreferences);
      Alert.alert('Error', 'Failed to update notification settings');
    } else if (updates.push_enabled === false) {
      setDevicePermissionGranted(false);
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

export default NotificationSettingsPage;


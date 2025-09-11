import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { useAuthContext } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { ListRow } from '../components/ListRow';
import { notificationService } from '../lib/NotificationService';
import { deleteAccount } from '../frontend-services/backend-bridge';
import type { NotificationPreferences } from '../backend/database/types';

const AccountPage = ({ navigation }: { navigation?: any }) => {
  const { user, signOut, loading } = useAuthContext();
  const { state, getDreamsWithStats } = useData();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dreamStats, setDreamStats] = useState({ created: 0, completed: 0 });
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize notification service
  useEffect(() => {
    const initializeNotifications = async () => {
      await notificationService.initialize();
    };
    initializeNotifications();
  }, []);

  // Load dream statistics
  useEffect(() => {
    const loadStats = async () => {
      await getDreamsWithStats();
    };
    loadStats();
  }, [getDreamsWithStats]);

  // Load notification preferences
  useEffect(() => {
    const loadNotificationPreferences = async () => {
      if (user?.id) {
        console.log('Loading notification preferences for user:', user.id);
        const preferences = await notificationService.getNotificationPreferences(user.id);
        console.log('Notification preferences loaded:', preferences);
        setNotificationPreferences(preferences);
        if (preferences) {
          setNotificationsEnabled(preferences.push_enabled);
        } else {
          // No preferences exist yet, use default value
          console.log('No notification preferences found, using default: true');
          setNotificationsEnabled(true);
        }
      }
    };
    loadNotificationPreferences();
  }, [user?.id]);

  // Calculate stats from data
  useEffect(() => {
    if (state.dreamsWithStats?.dreams) {
      const dreams = state.dreamsWithStats.dreams;
      const created = dreams.length;
      const completed = dreams.filter((dream: any) => dream.archived_at).length;
      setDreamStats({ created, completed });
    }
  }, [state.dreamsWithStats]);

  const handleNotificationToggle = async (enabled: boolean) => {
    if (!user?.id) {
      console.log('No user ID available for notification toggle');
      return;
    }
    
    console.log('Toggling notifications to:', enabled, 'for user:', user.id);
    setNotificationsEnabled(enabled);
    
    // If no preferences exist yet, create them with default values
    const preferencesToUpdate = notificationPreferences ? 
      { push_enabled: enabled } : 
      {
        push_enabled: enabled,
        daily_reminders: true,
        reminder_time: '09:00:00',
        overdue_alerts: true,
        achievement_notifications: true,
      };
    
    const success = await notificationService.updateNotificationPreferences(user.id, preferencesToUpdate);
    
    console.log('Notification preference update result:', success);
    
    if (!success) {
      // Revert on failure
      setNotificationsEnabled(!enabled);
      Alert.alert('Error', 'Failed to update notification preferences');
    } else {
      // Refresh preferences after successful update
      const updatedPreferences = await notificationService.getNotificationPreferences(user.id);
      setNotificationPreferences(updatedPreferences);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const result = await signOut();
            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'This will permanently delete all your data. Type "DELETE" to confirm.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'I understand, delete my account',
                  style: 'destructive',
                  onPress: async () => {
                    if (isDeleting) return;
                    
                    setIsDeleting(true);
                    
                    try {
                      const result = await deleteAccount((user as any)?.access_token);
                      
                      if (result.success) {
                        Alert.alert(
                          'Account Deleted',
                          'Your account has been successfully deleted.',
                          [
                            {
                              text: 'OK',
                              onPress: async () => {
                                await signOut();
                              },
                            },
                          ]
                        );
                      } else {
                        Alert.alert('Error', result.error || 'Failed to delete account');
                      }
                    } catch (error) {
                      console.error('Error deleting account:', error);
                      Alert.alert('Error', 'An unexpected error occurred while deleting your account');
                    } finally {
                      setIsDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Picture */}
        <View style={styles.profilePictureContainer}>
          <View style={styles.profilePicture}>
            <Text style={styles.profilePictureText}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        </View>

        {/* User Name */}
        <Text style={styles.userName}>
          {user?.email?.split('@')[0] || 'User'}
        </Text>

        {/* Join Date */}
        <Text style={styles.joinDate}>
          Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '01/01/2020'}
        </Text>

        {/* Stats */}
        <Text style={styles.stats}>
          {dreamStats.created} Dreams Created • {dreamStats.completed} Completed
        </Text>

        {/* Settings List */}
        <View style={styles.listContainer}>
          <ListRow
            title="Enable Notifications"
            leftIcon="notifications"
            rightElement="toggle"
            toggleValue={notificationsEnabled}
            onToggleChange={handleNotificationToggle}
            isFirst={true}
          />
          <ListRow
            title="Contact Us"
            leftIcon="contact_support"
            onPress={() => navigation?.navigate('ContactUs')}
          />
          <ListRow
            title="Terms & Services"
            leftIcon="policy"
            onPress={() => navigation?.navigate('TermsOfService')}
          />
          <ListRow
            title="Privacy Policy"
            leftIcon="privacy_tip"
            onPress={() => navigation?.navigate('PrivacyPolicy')}
          />
          <ListRow
            title="Log Out"
            leftIcon="logout"
            onPress={handleLogout}
            variant="destructive"
          />
          <ListRow
            title="Delete Account"
            leftIcon="delete_forever"
            onPress={handleDeleteAccount}
            variant="destructive"
            isLast={true}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 0,
    paddingBottom: 100, // Extra padding for bottom navigation
  },
  profilePictureContainer: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  profilePicture: {
    width: 150,
    height: 150,
    borderRadius: 10,
    backgroundColor: theme.colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  profilePictureText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 80,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.surface[50],
  },
  userName: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title1,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.title1,
    color: theme.colors.grey[800],
    marginBottom: theme.spacing.xs,
    textAlign: 'left',
  },
  joinDate: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing.xs,
    textAlign: 'left',
  },
  stats: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing.lg,
    textAlign: 'left',
  },
  listContainer: {
    width: '100%',
    backgroundColor: theme.colors.surface[50],
    borderRadius: 10,
    overflow: 'hidden',
  },
});

export default AccountPage; 
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { useAuthContext } from '../contexts/AuthContext';
import { ListRow } from '../components/ListRow';

const ProfilePage = () => {
  const { user, signOut, loading } = useAuthContext();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

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
                  onPress: () => {
                    // TODO: Implement account deletion
                    Alert.alert('Account deletion is not yet implemented');
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
          6 Dreams Created • 3 Completed
        </Text>

        {/* Settings List */}
        <View style={styles.listContainer}>
          <ListRow
            title="Enable Notifications"
            leftIcon="notifications"
            rightElement="toggle"
            toggleValue={notificationsEnabled}
            onToggleChange={setNotificationsEnabled}
            isFirst={true}
          />
          <ListRow
            title="Contact Us"
            leftIcon="contact_support"
            onPress={() => Alert.alert('Contact Us', 'Feature coming soon')}
          />
          <ListRow
            title="Terms & Services"
            leftIcon="policy"
            onPress={() => Alert.alert('Terms & Services', 'Feature coming soon')}
          />
          <ListRow
            title="Privacy Policy"
            leftIcon="privacy_tip"
            onPress={() => Alert.alert('Privacy Policy', 'Feature coming soon')}
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
    backgroundColor: theme.colors.surface[50],
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 0,
  },
  profilePictureContainer: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  profilePicture: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: theme.colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 160,
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
    backgroundColor: theme.colors.primary[50],
    borderRadius: 10,
    overflow: 'hidden',
  },
});

export default ProfilePage; 
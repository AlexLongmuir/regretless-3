import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { useAuthContext } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';

const ProfilePage = () => {
  const { user, signOut, loading } = useAuthContext();

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User Info */}
        <View style={styles.userSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          </View>
          <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
          <Text style={styles.userJoined}>
            Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
          </Text>
        </View>

        {/* Account Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <Button
            title="Sign Out"
            onPress={handleLogout}
            variant="outline"
            disabled={loading}
            style={styles.actionButton}
          />

          <Button
            title="Delete Account"
            onPress={handleDeleteAccount}
            variant="outline"
            disabled={loading}
            style={[styles.actionButton, styles.deleteButton]}
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
    padding: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.largeTitle,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.largeTitle,
    color: theme.colors.primary[600],
  },
  userSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl * 2,
  },
  avatarContainer: {
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title1,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.surface[50],
  },
  userEmail: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title3,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.title3,
    color: theme.colors.grey[800],
    marginBottom: theme.spacing.xs,
  },
  userJoined: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.grey[600],
  },
  actionsSection: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.headline,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.headline,
    color: theme.colors.grey[800],
    marginBottom: theme.spacing.md,
  },
  actionButton: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  deleteButton: {
    borderColor: theme.colors.error[500],
  },
});

export default ProfilePage; 
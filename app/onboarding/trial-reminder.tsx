/**
 * Trial Reminder Step - Reminder setup screen
 * 
 * Shows bell icon with notification badge and reminder setup
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../../lib/NotificationService';

const TrialReminderStep: React.FC = () => {
  const navigation = useNavigation();
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

  const handleContinue = async () => {
    setIsRequestingPermissions(true);
    
    try {
      // Request notification permissions
      const permissionsGranted = await notificationService.requestPermissions();
      
      if (permissionsGranted) {
        // Navigate to next step
        navigation.navigate('TrialContinuation' as never);
      } else {
        // Show alert if permissions were denied
        Alert.alert(
          'Notifications Disabled',
          'You can enable notifications later in your device settings to receive reminders about your trial.',
          [
            {
              text: 'Continue Anyway',
              onPress: () => navigation.navigate('TrialContinuation' as never),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      // Continue anyway if there's an error
      navigation.navigate('TrialContinuation' as never);
    } finally {
      setIsRequestingPermissions(false);
    }
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow_left"
          onPress={() => navigation.goBack()}
          variant="ghost"
          size="md"
          style={styles.backButton}
        />
      </View>
      
      <View style={styles.content}>
        <View style={styles.topSection}>
          <Text style={styles.title}>Enable notifications to get reminders about your free trial</Text>
          
          <View style={styles.bellContainer}>
            <View style={styles.bellIcon}>
              <Ionicons name="notifications" size={80} color={theme.colors.grey[400]} />
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>1</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.offerSection}>
          <Text style={styles.noPaymentText}>✓ No Payment Due Now</Text>
          <Button
            title={isRequestingPermissions ? "Setting up notifications..." : "Continue for FREE"}
            onPress={handleContinue}
            variant="black"
            style={styles.continueButton}
            disabled={isRequestingPermissions}
          />
          <Text style={styles.pricingText}>
            Just £39.99 per year (£3.33 / month)
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.largeTitle,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.largeTitle,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  bellContainer: {
    alignItems: 'center',
  },
  bellIcon: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    backgroundColor: theme.colors.error[500],
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  offerSection: {
    alignItems: 'center',
  },
  noPaymentText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.lg,
  },
  continueButton: {
    width: '100%',
    marginBottom: theme.spacing.sm,
  },
  pricingText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[600],
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['3xl'],
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    backgroundColor: 'white',
    borderRadius: 12,
  },
});

export default TrialReminderStep;

/**
 * Trial Reminder Step - Reminder setup screen
 * 
 * Shows bell icon with notification badge and reminder setup
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { Ionicons } from '@expo/vector-icons';

const TrialReminderStep: React.FC = () => {
  const navigation = useNavigation();

  const handleContinue = () => {
    navigation.navigate('TrialContinuation' as never);
  };

  const handleRestore = () => {
    // Handle restore purchases
    console.log('Restore purchases');
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
        <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
          <Text style={styles.restoreText}>Restore</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <View style={styles.topSection}>
          <Text style={styles.title}>We'll send you a reminder before your free trial ends</Text>
          
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
            title="Continue for FREE"
            onPress={handleContinue}
            variant="black"
            style={styles.continueButton}
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
  restoreButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  backButton: {
    backgroundColor: 'white',
    borderRadius: 12,
  },
  restoreText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[500],
  },
});

export default TrialReminderStep;
